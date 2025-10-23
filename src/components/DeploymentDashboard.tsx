import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
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
  GitCommit,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Project, Deployment, getDeploymentsByProject, saveDeployment, Repository } from '../lib/storage';
import { triggerWorkflow, getWorkflowRuns, getLatestBuildForBranch, getWorkflowInputs, WorkflowInput } from '../lib/github';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
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

interface QAReleaseBuildInfo {
  buildNumber?: string;
  commit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  status?: string;
  conclusion?: string;
  url?: string;
  loading?: boolean;
}

export function DeploymentDashboard({ project, onBack }: DeploymentDashboardProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState(project.pipelines[0]?.id || '');
  const [buildNumbers, setBuildNumbers] = useState<{ [pipelineId: string]: string }>({});
  const [loadingPipelines, setLoadingPipelines] = useState<{ [pipelineId: string]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedRepoForRelease, setSelectedRepoForRelease] = useState(project.repositories[0]?.id || '');
  const [qaReleaseBuilds, setQaReleaseBuilds] = useState<{ [pipelineId: string]: QAReleaseBuildInfo }>({});
  
  // Deploy All Dialog states
  const [showDeployAllDialog, setShowDeployAllDialog] = useState(false);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [deployProgress, setDeployProgress] = useState({ current: 0, total: 0 });
  const [isDeploying, setIsDeploying] = useState(false);
  const [globalReleaseNumber, setGlobalReleaseNumber] = useState('');

  // Workflow inputs states
  const [workflowInputs, setWorkflowInputs] = useState<{ [pipelineId: string]: WorkflowInput[] }>({});
  const [inputValues, setInputValues] = useState<{ [pipelineId: string]: Record<string, any> }>({});

  // Collapsible sections states
  const [repositoriesOpen, setRepositoriesOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const loadQAReleaseBuilds = async () => {
    // Load QA release builds for each pipeline
    for (const pipeline of project.pipelines) {
      // Set loading state
      setQaReleaseBuilds(prev => ({
        ...prev,
        [pipeline.id]: { loading: true },
      }));

      // Find the repository for this pipeline
      const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
      if (!repo) {
        setQaReleaseBuilds(prev => ({
          ...prev,
          [pipeline.id]: {},
        }));
        continue;
      }

      try {
        const buildData = await getLatestBuildForBranch(
          repo.owner,
          repo.repo,
          pipeline.workflowFile,
          'qarelease'
        );
        
        setQaReleaseBuilds(prev => ({
          ...prev,
          [pipeline.id]: buildData || {},
        }));
      } catch (err) {
        console.error(`Failed to load QA release build for ${pipeline.name}:`, err);
        setQaReleaseBuilds(prev => ({
          ...prev,
          [pipeline.id]: {},
        }));
      }
    }
  };

  const loadWorkflowInputs = async () => {
    for (const pipeline of project.pipelines) {
      const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
      if (!repository) continue;

      try {
        const inputs = await getWorkflowInputs(
          repository.owner,
          repository.repo,
          pipeline.workflowFile
        );
        
        setWorkflowInputs(prev => ({
          ...prev,
          [pipeline.id]: inputs,
        }));

        // Initialize input values with defaults
        const defaultValues: Record<string, any> = {};
        inputs.forEach(input => {
          if (input.default !== undefined) {
            defaultValues[input.name] = input.default;
          } else if (input.type === 'boolean') {
            defaultValues[input.name] = false;
          } else {
            defaultValues[input.name] = '';
          }
        });
        
        setInputValues(prev => ({
          ...prev,
          [pipeline.id]: defaultValues,
        }));
      } catch (err) {
        console.error(`Failed to load workflow inputs for ${pipeline.name}:`, err);
      }
    }
  };

  useEffect(() => {
    loadDeployments();
    loadQAReleaseBuilds();
    loadWorkflowInputs();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      refreshDeploymentStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [project.id, selectedPipeline]);

  const handleDeploy = async (pipelineId: string) => {
    const pipeline = project.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) {
      setError('Pipeline not found');
      return;
    }

    const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
    if (!repository) {
      setError('Repository not found for this pipeline');
      return;
    }

    // Get build_number from inputValues or buildNumbers (for backward compatibility)
    const buildNumber = inputValues[pipelineId]?.build_number || buildNumbers[pipelineId];
    if (!buildNumber) {
      setError(`Please enter a build number for ${pipeline.name}`);
      return;
    }

    setLoadingPipelines(prev => ({ ...prev, [pipelineId]: true }));
    setError('');
    setSuccess('');

    try {
      // Prepare workflow inputs from inputValues
      const workflowParams: Record<string, string> = {};
      
      const allInputs = inputValues[pipeline.id] || {};
      for (const [key, value] of Object.entries(allInputs)) {
        if (value !== undefined && value !== null && value !== '') {
          workflowParams[key] = String(value);
        }
      }
      
      // Ensure build_number is included
      if (!workflowParams.build_number) {
        workflowParams.build_number = buildNumber;
      }

      // Trigger the workflow
      await triggerWorkflow(
        repository.owner,
        repository.repo,
        pipeline.workflowFile,
        pipeline.branch,
        workflowParams
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
        globalReleaseNumber: globalReleaseNumber || undefined,
        status: 'pending',
        workflowRunId: runs[0]?.id,
        startedAt: Date.now(),
      };

      saveDeployment(deployment);
      loadDeployments();
      
      setSuccess(`Deployment triggered successfully for ${pipeline.name}`);
      setBuildNumbers(prev => ({ ...prev, [pipelineId]: '' }));
      
      // Refresh status after a few seconds
      setTimeout(refreshDeploymentStatus, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger deployment');
    } finally {
      setLoadingPipelines(prev => ({ ...prev, [pipelineId]: false }));
    }
  };



  const handleConfirmDeployAll = async () => {
    if (selectedPipelines.length === 0) {
      setError('Please select at least one pipeline');
      return;
    }

    setIsDeploying(true);
    setError('');
    setSuccess('');

    const pipelinesToDeploy = project.pipelines.filter(p => selectedPipelines.includes(p.id));
    setDeployProgress({ current: 0, total: pipelinesToDeploy.length });

    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < pipelinesToDeploy.length; i++) {
      const pipeline = pipelinesToDeploy[i];
      setDeployProgress({ current: i + 1, total: pipelinesToDeploy.length });

      const buildNumber = inputValues[pipeline.id]?.build_number || buildNumbers[pipeline.id];
      if (!buildNumber) {
        results.failed++;
        results.errors.push(`${pipeline.name}: No build number specified`);
        continue;
      }

      const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
      if (!repository) {
        results.failed++;
        results.errors.push(`${pipeline.name}: Repository not found`);
        continue;
      }

      try {
        // Prepare workflow inputs from inputValues
        const workflowParams: Record<string, string> = {};
        
        const allInputs = inputValues[pipeline.id] || {};
        for (const [key, value] of Object.entries(allInputs)) {
          if (value !== undefined && value !== null && value !== '') {
            workflowParams[key] = String(value);
          }
        }
        
        // Ensure build_number is included
        if (!workflowParams.build_number) {
          workflowParams.build_number = buildNumber;
        }

        // Trigger the workflow
        await triggerWorkflow(
          repository.owner,
          repository.repo,
          pipeline.workflowFile,
          pipeline.branch,
          workflowParams
        );

        // Wait a bit and fetch the latest run
        await new Promise(resolve => setTimeout(resolve, 2000));
        const runs = await getWorkflowRuns(repository.owner, repository.repo, pipeline.workflowFile, 1);
        
        const deployment: Deployment = {
          id: `${Date.now()}-${pipeline.id}`,
          projectId: project.id,
          pipelineId: pipeline.id,
          repositoryId: repository.id,
          buildNumber,
          globalReleaseNumber: globalReleaseNumber || undefined,
          status: 'pending',
          workflowRunId: runs[0]?.id,
          startedAt: Date.now(),
        };

        saveDeployment(deployment);
        results.success++;
      } catch (err) {
        results.failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`${pipeline.name}: ${errorMsg}`);
      }
    }

    loadDeployments();
    setBuildNumbers({});
    setShowDeployAllDialog(false);
    setIsDeploying(false);
    setDeployProgress({ current: 0, total: 0 });

    // Show results
    if (results.failed === 0) {
      setSuccess(`All ${results.success} pipeline${results.success !== 1 ? 's' : ''} deployed successfully`);
    } else if (results.success === 0) {
      setError(`All deployments failed: ${results.errors.join(', ')}`);
    } else {
      setSuccess(`${results.success} pipeline${results.success !== 1 ? 's' : ''} deployed, ${results.failed} failed`);
      if (results.errors.length > 0) {
        setError(results.errors.join('; '));
      }
    }

    // Refresh status after a few seconds
    setTimeout(refreshDeploymentStatus, 3000);
  };

  const togglePipelineSelection = (pipelineId: string) => {
    setSelectedPipelines(prev => 
      prev.includes(pipelineId)
        ? prev.filter(id => id !== pipelineId)
        : [...prev, pipelineId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPipelines.length === project.pipelines.length) {
      setSelectedPipelines([]);
    } else {
      setSelectedPipelines(project.pipelines.map(p => p.id));
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

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Group deployments by global release number and time proximity
  const groupDeployments = (deployments: Deployment[]) => {
    const groups: { [key: string]: Deployment[] } = {};
    
    deployments.forEach(deployment => {
      if (deployment.globalReleaseNumber) {
        // Group by global release number
        const key = `release-${deployment.globalReleaseNumber}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(deployment);
      } else {
        // Individual deployments without global release number
        const key = `individual-${deployment.id}`;
        groups[key] = [deployment];
      }
    });
    
    return groups;
  };

  const getQAStatusIcon = (status?: string, conclusion?: string | null) => {
    if (status === 'completed' && conclusion === 'success') {
      return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
    }
    if (status === 'completed' && conclusion === 'failure') {
      return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
    }
    if (status === 'in_progress') {
      return <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#2563eb' }} />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="hover:bg-slate-700" style={{ color: '#e9d5ff' }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl" style={{ color: '#e9d5ff' }}>{project.name}</h2>
            <p style={{ color: '#cbd5e1' }}>
              {project.repositories.length} repositor{project.repositories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowReleaseDialog(true)}
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
        >
          Create Release
        </Button>
      </div>

      {/* Repositories Overview */}
      <Collapsible open={repositoriesOpen} onOpenChange={setRepositoriesOpen}>
        <Card className="border-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-5 h-5" style={{ color: '#7c3aed' }} />
                    <CardTitle style={{ color: '#6b21a8' }}>Repositories</CardTitle>
                    {repositoriesOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#7c3aed' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#7c3aed' }} />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-1" 
                style={{ 
                  background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)', 
                  color: '#6b21a8', 
                  border: '2px solid #a78bfa' 
                }}
              >
                Latest QA Release Builds
              </Badge>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.repositories.map((repo) => {
              const qaInfo = qaReleaseBuilds[repo.id];
              
              return (
                <Card
                  key={repo.id}
                  className="border-2"
                  style={{ background: 'linear-gradient(to bottom right, #ffffff, #faf5ff)', borderColor: '#c4b5fd' }}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FolderGit2 className="w-4 h-4 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold" style={{ color: '#6b21a8' }}>{repo.name}</p>
                          <p className="text-xs truncate" style={{ color: '#7c3aed' }}>
                            {repo.owner}/{repo.repo}
                          </p>
                        </div>
                      </div>
                      {qaInfo && !qaInfo.loading && qaInfo.commit && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getQAStatusIcon(qaInfo.status, qaInfo.conclusion)}
                        </div>
                      )}
                    </div>

                    {/* QA Release Build Info */}
                    {qaInfo?.loading ? (
                      <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border" style={{ background: '#faf5ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : qaInfo?.commit ? (
                      <div className="space-y-2 px-2 py-2 rounded border" style={{ background: '#fefcff', borderColor: '#ddd6fe' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <GitBranch className="w-3 h-3" style={{ color: '#8b5cf6' }} />
                            <span className="text-xs font-medium" style={{ color: '#7c3aed' }}>qarelease</span>
                          </div>
                          {qaInfo.buildNumber && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: '#6b21a8', background: '#ede9fe' }}>
                              {qaInfo.buildNumber}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-start gap-1.5">
                          <GitCommit className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs truncate font-medium" style={{ color: '#1f2937' }} title={qaInfo.commit.message}>
                              {qaInfo.commit.message}
                            </p>
                            <div className="flex flex-col gap-1">
                              <code className="text-xs px-1.5 py-0.5 rounded truncate" style={{ background: '#ede9fe', color: '#6b21a8' }}>
                                {qaInfo.commit.sha}
                              </code>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs truncate" style={{ color: '#9ca3af' }}>
                                  by {qaInfo.commit.author}
                                </span>
                                <span className="text-xs" style={{ color: '#9ca3af' }}>
                                  {formatRelativeDate(qaInfo.commit.date)}
                                </span>
                              </div>
                            </div>
                            {qaInfo.url && (
                              <a
                                href={qaInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs inline-flex items-center gap-1 hover:underline"
                                style={{ color: '#7c3aed' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                View workflow
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs px-2 py-1.5 rounded border" style={{ background: '#faf5ff', color: '#a855f7', borderColor: '#ddd6fe' }}>
                        No qarelease builds found
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Deploy Section */}
      <Collapsible open={deployOpen} onOpenChange={setDeployOpen}>
        <Card className="border-[#e5e7eb]" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)' }}>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent w-full">
                <div className="flex items-start justify-between w-full">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <Rocket className="w-5 h-5" style={{ color: '#7c3aed' }} />
                      <CardTitle style={{ color: '#6b21a8' }}>Deploy</CardTitle>
                      {deployOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#7c3aed' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#7c3aed' }} />}
                    </div>
                    <CardDescription style={{ color: '#6b7280' }}>
                      Trigger a new deployment for this project
                    </CardDescription>
                  </div>
                </div>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
          {/* Global Release Number */}
          <div className="p-3 rounded-lg border-2 space-y-2" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)', borderColor: '#7c3aed' }}>
            <Label htmlFor="global-release" style={{ color: '#6b21a8' }} className="flex items-center gap-2 font-semibold">
              <span>Global Release Number (Optional)</span>
              <Badge variant="outline" className="text-xs" style={{ color: '#7c3aed', background: '#ffffff', borderColor: '#a78bfa' }}>
                Applies to all deployments
              </Badge>
            </Label>
            <Input
              id="global-release"
              type="text"
              placeholder="e.g., 5.28"
              value={globalReleaseNumber}
              onChange={(e) => setGlobalReleaseNumber(e.target.value)}
              className="border-[#d1d5db] h-9"
              style={{ background: '#ffffff', color: '#1f2937' }}
            />
            <p className="text-xs" style={{ color: '#6b7280' }}>
              This global release number will encompass all pipeline builds (e.g., Release 5.28 contains rules 5.28.295.1, etc.)
            </p>
          </div>

          {/* Pipeline Rows */}
          {project.pipelines.map(pipeline => {
            const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
            const allInputs = workflowInputs[pipeline.id] || [];
            const buildNumberInput = allInputs.find(input => input.name === 'build_number');
            
            return (
              <div 
                key={pipeline.id} 
                className="p-2.5 rounded-lg border-2 space-y-2"
                style={{ background: 'linear-gradient(to right, #fefcff, #faf5ff)', borderColor: '#c4b5fd' }}
              >
                {/* Pipeline Header */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, #7c3aed, #a78bfa)' }}></div>
                      <div className="text-base font-semibold" style={{ color: '#6b21a8' }}>
                        {pipeline.name}
                      </div>
                    </div>
                    {repo && (
                      <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
                        <div className="flex items-center gap-1">
                          <FolderGit2 className="w-3 h-3" style={{ color: '#8b5cf6' }} />
                          <span>{repo.owner}/{repo.repo}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" style={{ color: '#8b5cf6' }} />
                          <span>{pipeline.branch}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {qaReleaseBuilds[pipeline.id]?.buildNumber && buildNumberInput && (
                    <div 
                      className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-all" 
                      style={{ color: '#7c3aed' }}
                      onClick={() => setInputValues(prev => ({
                        ...prev,
                        [pipeline.id]: {
                          ...prev[pipeline.id],
                          build_number: qaReleaseBuilds[pipeline.id]?.buildNumber || '',
                        },
                      }))}
                      title="Click to use QA build number"
                    >
                      <GitBranch className="w-3 h-3" />
                      <span>qa:</span>
                      <code 
                        className="px-1.5 py-0.5 rounded font-semibold" 
                        style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)', color: '#6b21a8' }}
                      >
                        {qaReleaseBuilds[pipeline.id]?.buildNumber}
                      </code>
                    </div>
                  )}
                </div>

                {/* All Workflow Inputs in Compact Grid */}
                {allInputs.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {allInputs.map(input => {
                        const value = input.name === 'build_number' 
                          ? (inputValues[pipeline.id]?.[input.name] || buildNumbers[pipeline.id] || '')
                          : (inputValues[pipeline.id]?.[input.name] || '');
                        
                        return (
                          <div key={input.name} className="space-y-0.5">
                            <Label htmlFor={`input-${pipeline.id}-${input.name}`} className="text-xs font-medium" style={{ color: '#6b21a8' }}>
                              {input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {input.required && <span style={{ color: '#ec4899' }}> *</span>}
                            </Label>
                            {input.type === 'boolean' ? (
                              <div className="flex items-center space-x-2 h-8 px-3 border border-[#d1d5db] rounded-md" style={{ background: '#ffffff' }}>
                                <Checkbox
                                  id={`input-${pipeline.id}-${input.name}`}
                                  checked={value === true}
                                  onCheckedChange={(checked) => {
                                    setInputValues(prev => ({
                                      ...prev,
                                      [pipeline.id]: {
                                        ...prev[pipeline.id],
                                        [input.name]: checked,
                                      },
                                    }));
                                  }}
                                />
                                <Label htmlFor={`input-${pipeline.id}-${input.name}`} className="cursor-pointer text-xs" style={{ color: '#6b7280' }}>
                                  {input.description || 'Enable'}
                                </Label>
                              </div>
                            ) : input.type === 'choice' && input.options ? (
                              <Select
                                value={value || ''}
                                onValueChange={(val) => {
                                  setInputValues(prev => ({
                                    ...prev,
                                    [pipeline.id]: {
                                      ...prev[pipeline.id],
                                      [input.name]: val,
                                    },
                                  }));
                                }}
                              >
                                <SelectTrigger
                                  id={`input-${pipeline.id}-${input.name}`}
                                  className="border-[#d1d5db] h-8 text-xs px-3"
                                  style={{ background: '#ffffff', color: '#1f2937' }}
                                >
                                  <SelectValue placeholder={input.description || `Select ${input.name}`} />
                                </SelectTrigger>
                                <SelectContent
                                  className="border-[#e5e7eb]"
                                  style={{ background: '#ffffff' }}
                                >
                                  {input.options.map(option => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                id={`input-${pipeline.id}-${input.name}`}
                                type={input.type === 'number' ? 'number' : 'text'}
                                placeholder={input.default ? String(input.default) : ''}
                                value={value || ''}
                                onChange={(e) => {
                                  const val = input.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                                  setInputValues(prev => ({
                                    ...prev,
                                    [pipeline.id]: {
                                      ...prev[pipeline.id],
                                      [input.name]: val,
                                    },
                                  }));
                                  if (input.name === 'build_number') {
                                    setBuildNumbers(prev => ({ ...prev, [pipeline.id]: e.target.value }));
                                  }
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleDeploy(pipeline.id)}
                                className="border-[#d1d5db] h-8 text-xs px-3"
                                style={{ background: '#ffffff', color: '#1f2937' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Deploy Button */}
                    <div className="flex justify-end pt-1">
                      <Button
                        onClick={() => handleDeploy(pipeline.id)}
                        disabled={loadingPipelines[pipeline.id]}
                        className="text-white h-8 text-xs px-3"
                        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
                      >
                        {loadingPipelines[pipeline.id] ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-3 h-3 mr-1.5" />
                            Deploy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Deploy All Button */}
          {project.pipelines.length > 1 && (
            <div className="pt-2">
              <Button
                onClick={() => {
                  // Check if all pipelines have build numbers
                  const allBuildNumbers = project.pipelines.every(p => 
                    inputValues[p.id]?.build_number || buildNumbers[p.id]
                  );
                  if (!allBuildNumbers) {
                    setError('Please enter build numbers for all pipelines');
                    return;
                  }
                  setSelectedPipelines(project.pipelines.map(p => p.id));
                  setShowDeployAllDialog(true);
                }}
                variant="outline"
                className="w-full border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50"
                style={{ borderColor: '#a855f7', color: '#7c3aed' }}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Deploy All Pipelines ({project.pipelines.length})
              </Button>
            </div>
          )}

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
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Deployment History */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card className="border-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" style={{ color: '#7c3aed' }} />
                      <CardTitle style={{ color: '#6b21a8' }}>Deployment History</CardTitle>
                      {historyOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#7c3aed' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#7c3aed' }} />}
                    </div>
                    <CardDescription style={{ color: '#7c3aed' }}>
                      Recent deployments for all pipelines
                    </CardDescription>
                  </div>
                </Button>
              </CollapsibleTrigger>
            <Button
              size="sm"
              variant="outline"
              onClick={refreshDeploymentStatus}
              disabled={refreshing}
              className="border-2 hover:bg-purple-50"
              style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
          {deployments.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#7c3aed' }}>
              No deployments yet. Start your first deployment above.
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const groups = groupDeployments(deployments);
                return Object.entries(groups).map(([groupKey, groupDeployments]) => {
                  const isGrouped = groupKey.startsWith('release-');
                  const globalRelease = isGrouped ? groupKey.replace('release-', '') : null;
                  
                  if (isGrouped) {
                    // Grouped deployments with global release number
                    return (
                      <div key={groupKey} className="space-y-2">
                        {/* Global Release Header */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border-2" style={{ background: 'linear-gradient(135deg, #ede9fe 0%, #fae8ff 100%)', borderColor: '#c4b5fd' }}>
                          <Badge className="text-sm" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', color: '#ffffff', boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)' }}>
                            Release {globalRelease}
                          </Badge>
                          <span className="text-xs font-semibold" style={{ color: '#6b21a8' }}>
                            {groupDeployments.length} deployment{groupDeployments.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {/* Deployments in this release */}
                        <div className="space-y-2 pl-4">
                          {groupDeployments.map((deployment) => {
                            const pipeline = project.pipelines.find(p => p.id === deployment.pipelineId);
                            const repo = project.repositories.find(r => r.id === deployment.repositoryId);
                            return (
                              <Card
                                key={deployment.id}
                                className="border-2"
                                style={{ background: 'linear-gradient(to bottom right, #ffffff, #faf5ff)', borderColor: '#ddd6fe' }}
                              >
                                <CardContent className="pt-4 pb-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      {getStatusIcon(deployment.status)}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-semibold" style={{ color: '#6b21a8' }}>
                                            Build {deployment.buildNumber}
                                          </span>
                                          {getStatusBadge(deployment.status)}
                                          {pipeline && (
                                            <Badge variant="outline" className="border text-xs" style={{ color: '#7c3aed', background: '#fefcff', borderColor: '#c4b5fd' }}>
                                              {pipeline.name}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs mt-1" style={{ color: '#7c3aed' }}>
                                          {formatDate(deployment.startedAt)}
                                          {deployment.completedAt && ` • Completed`}
                                          {deployment.workflowRunId && ` • Run #${deployment.workflowRunId}`}
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
                                        className="hover:bg-purple-50"
                                        title={`View workflow run #${deployment.workflowRunId} on GitHub`}
                                      >
                                        <ExternalLink className="w-3 h-3" style={{ color: '#7c3aed' }} />
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    // Individual deployment without global release
                    const deployment = groupDeployments[0];
                    const pipeline = project.pipelines.find(p => p.id === deployment.pipelineId);
                    const repo = project.repositories.find(r => r.id === deployment.repositoryId);
                    return (
                      <Card
                        key={deployment.id}
                        className="border-2"
                        style={{ background: 'linear-gradient(to bottom right, #ffffff, #faf5ff)', borderColor: '#ddd6fe' }}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              {getStatusIcon(deployment.status)}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="font-semibold" style={{ color: '#6b21a8' }}>Release {deployment.buildNumber}</span>
                                  {getStatusBadge(deployment.status)}
                                  {pipeline && (
                                    <Badge variant="outline" className="border text-xs" style={{ color: '#7c3aed', background: '#fefcff', borderColor: '#c4b5fd' }}>
                                      {pipeline.name}
                                    </Badge>
                                  )}
                                  {repo && (
                                    <span className="text-sm" style={{ color: '#7c3aed' }}>
                                      {repo.name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm mt-1" style={{ color: '#7c3aed' }}>
                                  Started {formatDate(deployment.startedAt)}
                                  {deployment.completedAt && ` • Completed ${formatDate(deployment.completedAt)}`}
                                  {deployment.workflowRunId && ` • Run #${deployment.workflowRunId}`}
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
                                className="hover:bg-purple-50"
                                title={`View workflow run #${deployment.workflowRunId} on GitHub`}
                              >
                                <ExternalLink className="w-4 h-4" style={{ color: '#7c3aed' }} />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                });
              })()}
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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

      {/* Deploy All Confirmation Dialog */}
      <AlertDialog open={showDeployAllDialog} onOpenChange={setShowDeployAllDialog}>
        <AlertDialogContent className="max-w-2xl" style={{ background: '#ffffff' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#1f2937' }}>
              Deploy Multiple Pipelines
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#6b7280' }}>
              Select the pipelines you want to deploy. Each will use its configured build number.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Select All Checkbox */}
            <div className="flex items-center space-x-2 pb-2 border-b border-[#e5e7eb]">
              <Checkbox
                id="select-all"
                checked={selectedPipelines.length === project.pipelines.length}
                onCheckedChange={toggleSelectAll}
                disabled={isDeploying}
              />
              <Label htmlFor="select-all" className="cursor-pointer" style={{ color: '#374151' }}>
                Select All ({project.pipelines.length} pipelines)
              </Label>
            </div>

            {/* Pipeline List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {project.pipelines.map(pipeline => {
                const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
                const buildNumber = buildNumbers[pipeline.id];
                return (
                  <div 
                    key={pipeline.id}
                    className="flex items-center space-x-2 p-3 rounded border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
                    style={{ background: selectedPipelines.includes(pipeline.id) ? '#f0f9ff' : '#ffffff' }}
                  >
                    <Checkbox
                      id={pipeline.id}
                      checked={selectedPipelines.includes(pipeline.id)}
                      onCheckedChange={() => togglePipelineSelection(pipeline.id)}
                      disabled={isDeploying || !buildNumber}
                    />
                    <Label 
                      htmlFor={pipeline.id} 
                      className="flex-1 cursor-pointer"
                      style={{ color: '#1f2937' }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{pipeline.name}</span>
                        {buildNumber ? (
                          <code 
                            className="px-2 py-0.5 rounded text-sm" 
                            style={{ background: '#dbeafe', color: '#2563eb' }}
                          >
                            {buildNumber}
                          </code>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#fee2e2', color: '#dc2626' }}>
                            No build number
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                        {repo && `${repo.owner}/${repo.repo} • `}Branch: {pipeline.branch}
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            {isDeploying && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm" style={{ color: '#6b7280' }}>
                  <span>Deploying pipelines...</span>
                  <span>{deployProgress.current} / {deployProgress.total}</span>
                </div>
                <Progress 
                  value={(deployProgress.current / deployProgress.total) * 100} 
                  className="h-2"
                />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isDeploying}
              className="border-[#d1d5db]"
              style={{ color: '#374151' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeployAll}
              disabled={selectedPipelines.length === 0 || isDeploying}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Deploy {selectedPipelines.length} Pipeline{selectedPipelines.length !== 1 ? 's' : ''}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
