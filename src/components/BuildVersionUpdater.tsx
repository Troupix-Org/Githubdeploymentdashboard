import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  GitBranch,
  Lock,
} from 'lucide-react';
import { Repository } from '../lib/storage';
import {
  listRepositoryVariables,
  listEnvironments,
  listEnvironmentVariables,
  updateRepositoryVariable,
  updateEnvironmentVariable,
  GitHubVariable,
  GitHubEnvironment,
} from '../lib/github';
import { toast } from 'sonner@2.0.3';

interface BuildVersionUpdaterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositories: Repository[];
  buildVersion: string;
  onComplete?: () => void;
}

// Function to increment version (major.minor format only)
function incrementVersion(version: string): string {
  if (!version) return '1.0';
  
  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/, '');
  
  // Try to parse as semver (x.y.z) - extract major.minor and increment minor
  const semverMatch = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (semverMatch) {
    const major = parseInt(semverMatch[1], 10);
    const minor = parseInt(semverMatch[2], 10);
    // Increment minor, return only major.minor
    return `${major}.${minor + 1}`;
  }
  
  // Try to parse as major.minor (x.y)
  const shortMatch = cleanVersion.match(/^(\d+)\.(\d+)(.*)$/);
  if (shortMatch) {
    const major = parseInt(shortMatch[1], 10);
    const minor = parseInt(shortMatch[2], 10);
    return `${major}.${minor + 1}`;
  }
  
  // If it's just a number, increment it
  const numMatch = cleanVersion.match(/^(\d+)(.*)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return `${num + 1}.0`;
  }
  
  // Fallback: append .1
  return `${cleanVersion}.1`;
}

interface RepositoryVariableInfo {
  repository: Repository;
  loading: boolean;
  error: string | null;
  hasAccess: boolean;
  repoVariable?: GitHubVariable;
  environments: Array<{
    environment: GitHubEnvironment;
    variable?: GitHubVariable;
  }>;
  selectedLocation: 'repo' | string; // 'repo' or environment name
  updating: boolean;
}

export function BuildVersionUpdater({
  open,
  onOpenChange,
  repositories,
  buildVersion,
  onComplete,
}: BuildVersionUpdaterProps) {
  const [repoInfo, setRepoInfo] = useState<
    Map<string, RepositoryVariableInfo>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [targetVersion, setTargetVersion] = useState('');

  useEffect(() => {
    if (open && buildVersion) {
      // Calculate next version (minor increment)
      const nextVersion = incrementVersion(buildVersion);
      setTargetVersion(nextVersion);
      loadRepositoriesInfo();
    }
  }, [open, repositories, buildVersion]);

  const loadRepositoriesInfo = async () => {
    setLoading(true);
    const newRepoInfo = new Map<string, RepositoryVariableInfo>();

    for (const repo of repositories) {
      const info: RepositoryVariableInfo = {
        repository: repo,
        loading: true,
        error: null,
        hasAccess: false,
        environments: [],
        selectedLocation: 'repo',
        updating: false,
      };

      newRepoInfo.set(repo.id, info);
      setRepoInfo(new Map(newRepoInfo));

      try {
        // Fetch repository variables
        const repoVars = await listRepositoryVariables(
          repo.owner,
          repo.repo,
        );
        const buildVar = repoVars.find(
          (v) => v.name === 'BUILD_VERSION',
        );

        // Fetch environments
        const environments = await listEnvironments(
          repo.owner,
          repo.repo,
        );

        // Fetch environment variables for each environment
        const envWithVars = await Promise.all(
          environments.map(async (env) => {
            try {
              const envVars = await listEnvironmentVariables(
                repo.owner,
                repo.repo,
                env.name,
              );
              const buildVar = envVars.find(
                (v) => v.name === 'BUILD_VERSION',
              );
              return { environment: env, variable: buildVar };
            } catch (err) {
              return { environment: env, variable: undefined };
            }
          }),
        );

        // Determine default selected location
        let selectedLocation: 'repo' | string = 'repo';
        if (!buildVar && envWithVars.length > 0) {
          // If no repo variable but has environment variables, select first env with BUILD_VERSION
          const envWithBuildVar = envWithVars.find((e) => e.variable);
          if (envWithBuildVar) {
            selectedLocation = envWithBuildVar.environment.name;
          }
        }

        info.loading = false;
        info.hasAccess = true;
        info.repoVariable = buildVar;
        info.environments = envWithVars;
        info.selectedLocation = selectedLocation;
      } catch (err) {
        info.loading = false;
        info.error =
          err instanceof Error
            ? err.message
            : 'Failed to load variables';
        info.hasAccess = false;
      }

      newRepoInfo.set(repo.id, info);
      setRepoInfo(new Map(newRepoInfo));
    }

    setLoading(false);
  };

  const handleUpdateVariable = async (repoId: string) => {
    const info = repoInfo.get(repoId);
    if (!info) return;

    info.updating = true;
    setRepoInfo(new Map(repoInfo));

    try {
      if (info.selectedLocation === 'repo') {
        // Update repository variable
        await updateRepositoryVariable(
          info.repository.owner,
          info.repository.repo,
          'BUILD_VERSION',
          targetVersion,
        );
        toast.success(
          `Updated BUILD_VERSION for ${info.repository.name}`,
        );
      } else {
        // Update environment variable
        await updateEnvironmentVariable(
          info.repository.owner,
          info.repository.repo,
          info.selectedLocation,
          'BUILD_VERSION',
          targetVersion,
        );
        toast.success(
          `Updated BUILD_VERSION for ${info.repository.name} (${info.selectedLocation})`,
        );
      }

      // Refresh the info for this repository
      await refreshRepositoryInfo(repoId);
    } catch (err) {
      info.updating = false;
      info.error =
        err instanceof Error
          ? err.message
          : 'Failed to update variable';
      setRepoInfo(new Map(repoInfo));
      toast.error(
        `Failed to update BUILD_VERSION for ${info.repository.name}`,
      );
    }
  };

  const refreshRepositoryInfo = async (repoId: string) => {
    const info = repoInfo.get(repoId);
    if (!info) return;

    try {
      const repoVars = await listRepositoryVariables(
        info.repository.owner,
        info.repository.repo,
      );
      const buildVar = repoVars.find((v) => v.name === 'BUILD_VERSION');

      const environments = await listEnvironments(
        info.repository.owner,
        info.repository.repo,
      );

      const envWithVars = await Promise.all(
        environments.map(async (env) => {
          try {
            const envVars = await listEnvironmentVariables(
              info.repository.owner,
              info.repository.repo,
              env.name,
            );
            const buildVar = envVars.find(
              (v) => v.name === 'BUILD_VERSION',
            );
            return { environment: env, variable: buildVar };
          } catch (err) {
            return { environment: env, variable: undefined };
          }
        }),
      );

      info.repoVariable = buildVar;
      info.environments = envWithVars;
      info.updating = false;
      info.error = null;
      setRepoInfo(new Map(repoInfo));
    } catch (err) {
      info.updating = false;
      info.error =
        err instanceof Error
          ? err.message
          : 'Failed to refresh variables';
      setRepoInfo(new Map(repoInfo));
    }
  };

  const handleSelectLocation = (
    repoId: string,
    location: 'repo' | string,
  ) => {
    const info = repoInfo.get(repoId);
    if (!info) return;

    info.selectedLocation = location;
    setRepoInfo(new Map(repoInfo));
  };

  const getCurrentValue = (info: RepositoryVariableInfo): string => {
    if (info.selectedLocation === 'repo') {
      return info.repoVariable?.value || 'Not set';
    } else {
      const env = info.environments.find(
        (e) => e.environment.name === info.selectedLocation,
      );
      return env?.variable?.value || 'Not set';
    }
  };

  const hasVariable = (info: RepositoryVariableInfo): boolean => {
    if (info.selectedLocation === 'repo') {
      return !!info.repoVariable;
    } else {
      const env = info.environments.find(
        (e) => e.environment.name === info.selectedLocation,
      );
      return !!env?.variable;
    }
  };

  const handleCompleteAndClose = () => {
    if (onComplete) {
      onComplete();
    }
    onOpenChange(false);
  };

  const allUpdated = Array.from(repoInfo.values()).every((info) => {
    if (!info.hasAccess) return true; // Skip repos without access
    const currentValue = getCurrentValue(info);
    return currentValue === targetVersion;
  });

  // Check if any repository has a BUILD_VERSION different from current release
  const hasVersionMismatch = Array.from(repoInfo.values()).some((info) => {
    if (!info.hasAccess || !hasVariable(info)) return false;
    const currentValue = getCurrentValue(info);
    return currentValue !== buildVersion && currentValue !== 'Not set';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: '#6b21a8' }}>
            Update BUILD_VERSION Variables
          </DialogTitle>
          <DialogDescription style={{ color: '#7c3aed' }}>
            {buildVersion ? (
              <>
                Current release: <strong>{buildVersion}</strong>
              </>
            ) : (
              'No release number available. Please create a production release first.'
            )}
          </DialogDescription>
        </DialogHeader>

        {!buildVersion ? (
          <Alert className="border" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
            <AlertCircle className="h-4 w-4" style={{ color: '#dc2626' }} />
            <AlertDescription style={{ color: '#dc2626' }}>
              Unable to update BUILD_VERSION: No release number is set. Please create a production release first.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Target Version Input */}
            <div className="space-y-2 p-4 rounded-lg border-2" style={{ borderColor: '#e9d5ff', background: '#faf5ff' }}>
              <Label style={{ color: '#6b21a8' }}>
                Target BUILD_VERSION
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  placeholder="e.g., 1.2.0"
                  className="border-2"
                  style={{
                    borderColor: '#c084fc',
                    color: '#6b21a8',
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTargetVersion(incrementVersion(buildVersion))}
                  style={{ borderColor: '#e9d5ff', color: '#7c3aed' }}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>
              <p className="text-xs" style={{ color: '#7c3aed' }}>
                Suggested next version: <strong>{incrementVersion(buildVersion)}</strong> (current release + 1 minor)
              </p>
            </div>

            {/* Warning if BUILD_VERSION doesn't match current release */}
            {hasVersionMismatch && (
              <Alert className="border-2" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
                <AlertCircle className="h-4 w-4" style={{ color: '#f59e0b' }} />
                <AlertDescription style={{ color: '#92400e' }}>
                  <strong>Notice:</strong> Some repositories have BUILD_VERSION values that differ from the current release version (<strong>{buildVersion}</strong>). 
                  This may indicate that BUILD_VERSION was not updated in the previous release, or that these repositories are on a different version cycle. 
                  Please verify if an update is needed for this release.
                </AlertDescription>
              </Alert>
            )}

            {loading && repositories.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: '#7c3aed' }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {repositories.map((repo) => {
              const info = repoInfo.get(repo.id);
              if (!info) return null;

              return (
                <div
                  key={repo.id}
                  className="border-2 rounded-lg p-4"
                  style={{ borderColor: '#e9d5ff' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch
                        className="w-5 h-5"
                        style={{ color: '#7c3aed' }}
                      />
                      <div>
                        <h3
                          className="font-medium"
                          style={{ color: '#6b21a8' }}
                        >
                          {repo.name}
                        </h3>
                        <p className="text-sm" style={{ color: '#7c3aed' }}>
                          {repo.owner}/{repo.repo}
                        </p>
                      </div>
                    </div>
                    {!info.hasAccess && (
                      <Badge
                        variant="outline"
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          borderColor: '#fca5a5',
                        }}
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        No Access
                      </Badge>
                    )}
                  </div>

                  {info.loading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        style={{ color: '#7c3aed' }}
                      />
                      <span className="text-sm" style={{ color: '#7c3aed' }}>
                        Loading variables...
                      </span>
                    </div>
                  ) : info.error ? (
                    <Alert
                      className="border"
                      style={{
                        background: '#fef2f2',
                        borderColor: '#fca5a5',
                      }}
                    >
                      <AlertCircle
                        className="h-4 w-4"
                        style={{ color: '#dc2626' }}
                      />
                      <AlertDescription style={{ color: '#dc2626' }}>
                        {info.error}
                      </AlertDescription>
                    </Alert>
                  ) : info.hasAccess ? (
                    <div className="space-y-3">
                      {/* Location selector */}
                      <div>
                        <Label className="text-sm" style={{ color: '#6b21a8' }}>
                          Variable Location
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Button
                            variant={
                              info.selectedLocation === 'repo'
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() =>
                              handleSelectLocation(repo.id, 'repo')
                            }
                            disabled={info.updating}
                            style={
                              info.selectedLocation === 'repo'
                                ? {
                                    background:
                                      'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                    color: '#ffffff',
                                  }
                                : { borderColor: '#e9d5ff', color: '#7c3aed' }
                            }
                          >
                            Repository
                            {info.repoVariable && (
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                            )}
                          </Button>
                          {info.environments.map((env) => (
                            <Button
                              key={env.environment.name}
                              variant={
                                info.selectedLocation === env.environment.name
                                  ? 'default'
                                  : 'outline'
                              }
                              size="sm"
                              onClick={() =>
                                handleSelectLocation(
                                  repo.id,
                                  env.environment.name,
                                )
                              }
                              disabled={info.updating}
                              style={
                                info.selectedLocation === env.environment.name
                                  ? {
                                      background:
                                        'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                                      color: '#ffffff',
                                    }
                                  : {
                                      borderColor: '#e9d5ff',
                                      color: '#7c3aed',
                                    }
                              }
                            >
                              {env.environment.name}
                              {env.variable && (
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Current value display */}
                      <div>
                        <Label className="text-sm" style={{ color: '#6b21a8' }}>
                          Current Value
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={getCurrentValue(info)}
                            readOnly
                            className="border-2"
                            style={{
                              background: '#f9fafb',
                              borderColor: '#e9d5ff',
                              color: '#6b21a8',
                            }}
                          />
                          {getCurrentValue(info) === targetVersion ? (
                            <Badge
                              style={{
                                background: '#dcfce7',
                                color: '#16a34a',
                                borderColor: '#86efac',
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Up to date
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              style={{
                                background: '#fef3c7',
                                color: '#ea580c',
                                borderColor: '#fcd34d',
                              }}
                            >
                              Needs update
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Update button */}
                      {getCurrentValue(info) !== targetVersion && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleUpdateVariable(repo.id)}
                            disabled={info.updating || !hasVariable(info)}
                            className="text-white"
                            style={{
                              background:
                                'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                            }}
                          >
                            {info.updating ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Update to {targetVersion}
                              </>
                            )}
                          </Button>
                          {!hasVariable(info) && (
                            <Alert className="flex-1 py-2 border">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                BUILD_VERSION variable not found in selected
                                location. Create it manually first.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
              </div>
            )}
          </>
        )}

        <DialogFooter>
          {!buildVersion ? (
            <Button
              onClick={() => onOpenChange(false)}
              className="text-white"
              style={{
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              }}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                style={{ borderColor: '#e9d5ff', color: '#7c3aed' }}
              >
                Cancel
              </Button>
              {allUpdated && (
                <Button
                  onClick={handleCompleteAndClose}
                  className="text-white"
                  style={{
                    background:
                      'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
