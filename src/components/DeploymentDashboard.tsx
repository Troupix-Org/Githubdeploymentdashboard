import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  ArrowLeft,
  Rocket,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  GitBranch,
  FolderGit2,
} from 'lucide-react';
import { Project, Deployment, getDeploymentsByProject, saveDeployment } from '../lib/storage';
import { triggerWorkflow, getWorkflowRuns } from '../lib/github';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ReleaseCreator } from './ReleaseCreator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface DeploymentDashboardProps {
  project: Project;
  onBack: () => void;
}

export function DeploymentDashboard({ project, onBack }: DeploymentDashboardProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState(project.pipelines[0]?.id || '');
  const [buildNumber, setBuildNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedRepoForRelease, setSelectedRepoForRelease] = useState(project.repositories[0]?.id || '');

  const loadDeployments = () => {
    const data = getDeploymentsByProject(project.id);
    setDeployments(data.sort((a, b) => b.startedAt - a.startedAt));
  };

  const refreshDeploymentStatus = async () => {
    setRefreshing(true);
    
    try {
      const pipeline = project.pipelines.find(p => p.id === selectedPipeline);
      if (!pipeline) return;

      const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
      if (!repository) return;

      const runs = await getWorkflowRuns(repository.owner, repository.repo, pipeline.workflowFile, 20);
      
      // Update deployments with latest status
      const updatedDeployments = deployments.map(deployment => {
        if (deployment.pipelineId !== selectedPipeline) return deployment;
        
        const matchingRun = runs.find(run => run.id === deployment.workflowRunId);
        if (!matchingRun) return deployment;

        let status: Deployment['status'] = 'pending';
        if (matchingRun.status === 'completed') {
          status = matchingRun.conclusion === 'success' ? 'success' : 'failure';
        } else if (matchingRun.status === 'in_progress') {
          status = 'in_progress';
        }

        const updated = {
          ...deployment,
          status,
          completedAt: matchingRun.status === 'completed' ? new Date(matchingRun.updated_at).getTime() : undefined,
        };

        saveDeployment(updated);
        return updated;
      });

      setDeployments(updatedDeployments);
    } catch (err) {
      console.error('Failed to refresh status:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDeployments();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      refreshDeploymentStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [project.id, selectedPipeline]);

  const handleDeploy = async () => {
    if (!buildNumber) {
      setError('Please enter a build number');
      return;
    }

    const pipeline = project.pipelines.find(p => p.id === selectedPipeline);
    if (!pipeline) {
      setError('Please select a pipeline');
      return;
    }

    const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
    if (!repository) {
      setError('Repository not found for this pipeline');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Trigger the workflow
      await triggerWorkflow(
        repository.owner,
        repository.repo,
        pipeline.workflowFile,
        pipeline.branch,
        { build_number: buildNumber }
      );

      // Wait a bit and fetch the latest run
      await new Promise(resolve => setTimeout(resolve, 2000));
      const runs = await getWorkflowRuns(repository.owner, repository.repo, pipeline.workflowFile, 1);
      
      const deployment: Deployment = {
        id: Date.now().toString(),
        projectId: project.id,
        pipelineId: pipeline.id,
        repositoryId: repository.id,
        buildNumber,
        status: 'pending',
        workflowRunId: runs[0]?.id,
        startedAt: Date.now(),
      };

      saveDeployment(deployment);
      loadDeployments();
      
      setSuccess(`Deployment started for build ${buildNumber}`);
      setBuildNumber('');
      
      // Refresh status after a few seconds
      setTimeout(refreshDeploymentStatus, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger deployment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'failure':
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#2563eb' }} />;
      default:
        return <Clock className="w-4 h-4" style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusBadge = (status: Deployment['status']) => {
    const styles = {
      success: { background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' },
      failure: { background: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' },
      in_progress: { background: '#dbeafe', color: '#1e40af', border: '1px solid #2563eb' },
      pending: { background: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af' },
    };

    return (
      <Badge variant="outline" style={styles[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredDeployments = deployments.filter(d => d.pipelineId === selectedPipeline);
  const selectedPipelineData = project.pipelines.find(p => p.id === selectedPipeline);
  const selectedPipelineRepo = selectedPipelineData ? project.repositories.find(r => r.id === selectedPipelineData.repositoryId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="hover:bg-[#f3f4f6]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl" style={{ color: '#1f2937' }}>{project.name}</h2>
            <p style={{ color: '#6b7280' }}>
              {project.repositories.length} repositor{project.repositories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowReleaseDialog(true)}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
        >
          Create Release
        </Button>
      </div>

      {/* Repositories Overview */}
      <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader>
          <CardTitle style={{ color: '#1f2937' }}>Repositories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {project.repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb]"
                style={{ background: '#f9fafb' }}
              >
                <FolderGit2 className="w-5 h-5" style={{ color: '#6b7280' }} />
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ color: '#1f2937' }}>{repo.name}</p>
                  <p className="text-sm truncate" style={{ color: '#6b7280' }}>
                    {repo.owner}/{repo.repo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deploy Section */}
      <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader>
          <CardTitle style={{ color: '#1f2937' }}>Deploy</CardTitle>
          <CardDescription style={{ color: '#6b7280' }}>
            Trigger a new deployment for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Pipeline</Label>
              <Select
                value={selectedPipeline}
                onValueChange={(value) => setSelectedPipeline(value)}
              >
                <SelectTrigger
                  className="border-[#d1d5db]"
                  style={{ background: '#f9fafb', color: '#1f2937' }}
                >
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent
                  className="border-[#e5e7eb]"
                  style={{ background: '#ffffff' }}
                >
                  {project.pipelines.map((pipeline) => {
                    const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
                    return (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name} {repo && `(${repo.name})`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="build-number" style={{ color: '#374151' }}>
                Build Number
              </Label>
              <Input
                id="build-number"
                placeholder="1.0.0"
                value={buildNumber}
                onChange={(e) => setBuildNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeploy()}
                className="border-[#d1d5db]"
                style={{ background: '#f9fafb', color: '#1f2937' }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleDeploy}
                disabled={loading}
                className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Deploy
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="border-[#ef4444] bg-[#fef2f2]">
              <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
              <AlertDescription style={{ color: '#dc2626' }}>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-[#10b981] bg-[#f0fdf4]">
              <CheckCircle2 className="h-4 w-4" style={{ color: '#10b981' }} />
              <AlertDescription style={{ color: '#059669' }}>{success}</AlertDescription>
            </Alert>
          )}

          {selectedPipelineData && selectedPipelineRepo && (
            <div className="flex items-center gap-4 pt-2" style={{ color: '#6b7280' }}>
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4" />
                <span className="text-sm">{selectedPipelineRepo.owner}/{selectedPipelineRepo.repo}</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                <span className="text-sm">Branch: {selectedPipelineData.branch}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Workflow: {selectedPipelineData.workflowFile}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#1f2937' }}>Deployment History</CardTitle>
              <CardDescription style={{ color: '#6b7280' }}>
                Recent deployments for {selectedPipelineData?.name || 'this pipeline'}
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshDeploymentStatus}
              disabled={refreshing}
              className="border-[#d1d5db] hover:bg-[#f3f4f6]"
              style={{ color: '#374151' }}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDeployments.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#6b7280' }}>
              No deployments yet. Start your first deployment above.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeployments.map((deployment) => {
                const repo = project.repositories.find(r => r.id === deployment.repositoryId);
                return (
                  <Card
                    key={deployment.id}
                    className="border-[#e5e7eb]"
                    style={{ background: '#f9fafb' }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {getStatusIcon(deployment.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span style={{ color: '#1f2937' }}>Build {deployment.buildNumber}</span>
                              {getStatusBadge(deployment.status)}
                              {repo && (
                                <span className="text-sm" style={{ color: '#6b7280' }}>
                                  {repo.name}
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                              Started {formatDate(deployment.startedAt)}
                              {deployment.completedAt && ` • Completed ${formatDate(deployment.completedAt)}`}
                            </p>
                          </div>
                        </div>
                        {deployment.workflowRunId && repo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.open(
                                `https://github.com/${repo.owner}/${repo.repo}/actions/runs/${deployment.workflowRunId}`,
                                '_blank'
                              );
                            }}
                            className="hover:bg-[#f3f4f6]"
                          >
                            <ExternalLink className="w-4 h-4" style={{ color: '#2563eb' }} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent
          className="max-w-2xl border-[#e5e7eb]"
          style={{ background: '#ffffff' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#1f2937' }}>Create GitHub Release</DialogTitle>
            <DialogDescription style={{ color: '#6b7280' }}>
              Create a new release for your repository
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Repository</Label>
              <Select
                value={selectedRepoForRelease}
                onValueChange={(value) => setSelectedRepoForRelease(value)}
              >
                <SelectTrigger
                  className="border-[#d1d5db]"
                  style={{ background: '#f9fafb', color: '#1f2937' }}
                >
                  <SelectValue placeholder="Select repository" />
                </SelectTrigger>
                <SelectContent
                  className="border-[#e5e7eb]"
                  style={{ background: '#ffffff' }}
                >
                  {project.repositories.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.name} ({repo.owner}/{repo.repo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ReleaseCreator
              repository={project.repositories.find(r => r.id === selectedRepoForRelease)}
              onSuccess={() => {
                setShowReleaseDialog(false);
                setSuccess('Release created successfully!');
              }}
              onCancel={() => setShowReleaseDialog(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
