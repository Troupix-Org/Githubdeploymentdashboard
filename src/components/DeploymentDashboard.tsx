import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  ArrowLeft,
  Rocket,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  FolderGit2,
  GitCommit,
  ChevronDown,
  ChevronUp,
  Star,
  Activity,
  Clock,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { Project, Deployment, saveDeployment, Repository, saveProject, getDeploymentsByProject } from '../lib/storage';
import { triggerWorkflow, getLatestBuildsForBranch, getWorkflowInputs, WorkflowInput, findTriggeredWorkflowRun, getWorkflowRun } from '../lib/github';
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

interface LatestBuildInfo {
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
  runId?: number;
  createdAt?: string;
  loading?: boolean;
}

export function DeploymentDashboard({ project: initialProject, onBack }: DeploymentDashboardProps) {
  const [project, setProject] = useState<Project>(initialProject);
  const [buildNumbers, setBuildNumbers] = useState<{ [pipelineId: string]: string }>({});
  const [loadingPipelines, setLoadingPipelines] = useState<{ [pipelineId: string]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [selectedRepoForRelease, setSelectedRepoForRelease] = useState(project.repositories[0]?.id || '');
  const [latestBuilds, setLatestBuilds] = useState<{ [pipelineId: string]: LatestBuildInfo }>({});
  const [allBuilds, setAllBuilds] = useState<{ [pipelineId: string]: LatestBuildInfo[] }>({});
  const [showAllBuilds, setShowAllBuilds] = useState<{ [pipelineId: string]: boolean }>({});
  
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
  const [deploymentStatusOpen, setDeploymentStatusOpen] = useState(true);

  // Deployment Status states
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const loadDeployments = () => {
    const data = getDeploymentsByProject(project.id);
    setDeployments(data.sort((a, b) => b.startedAt - a.startedAt));
  };

  const refreshDeploymentStatus = async () => {
    setRefreshing(true);
    
    try {
      const updatedDeployments = [...deployments];
      let hasUpdates = false;

      for (let i = 0; i < updatedDeployments.length; i++) {
        const deployment = updatedDeployments[i];
        
        // Skip if already completed
        if (deployment.status === 'success' || deployment.status === 'failure') {
          continue;
        }

        // Skip if no workflow run ID
        if (!deployment.workflowRunId) {
          continue;
        }

        // Find the repository for this deployment
        const pipeline = project.pipelines.find(p => p.id === deployment.pipelineId);
        if (!pipeline) continue;

        const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
        if (!repository) continue;

        try {
          const run = await getWorkflowRun(repository.owner, repository.repo, deployment.workflowRunId);
          
          let status: Deployment['status'] = 'pending';
          if (run.status === 'completed') {
            status = run.conclusion === 'success' ? 'success' : 'failure';
          } else if (run.status === 'in_progress') {
            status = 'in_progress';
          } else if (run.status === 'queued') {
            status = 'pending';
          }

          if (status !== deployment.status) {
            hasUpdates = true;
            updatedDeployments[i] = {
              ...deployment,
              status,
              completedAt: run.status === 'completed' ? new Date(run.updated_at).getTime() : undefined,
            };
            saveDeployment(updatedDeployments[i]);
          }
        } catch (err) {
          console.error(`Failed to refresh status for deployment ${deployment.id}:`, err);
        }
      }

      if (hasUpdates) {
        setDeployments(updatedDeployments);
      }
    } catch (err) {
      console.error('Failed to refresh deployment status:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadLatestBuilds = async () => {
    // Load latest builds from the configured branch for each pipeline
    for (const pipeline of project.pipelines) {
      // Set loading state
      setLatestBuilds(prev => ({
        ...prev,
        [pipeline.id]: { loading: true },
      }));

      // Find the repository for this pipeline
      const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
      if (!repo) {
        setLatestBuilds(prev => ({
          ...prev,
          [pipeline.id]: {},
        }));
        continue;
      }

      try {
        // Load last 5 builds
        const buildsData = await getLatestBuildsForBranch(
          repo.owner,
          repo.repo,
          pipeline.workflowFile,
          pipeline.branch,
          5
        );
        
        setAllBuilds(prev => ({
          ...prev,
          [pipeline.id]: buildsData || [],
        }));
        
        // Set the latest build (first one) as the default
        setLatestBuilds(prev => ({
          ...prev,
          [pipeline.id]: buildsData[0] || {},
        }));
      } catch (err) {
        console.error(`Failed to load latest builds for ${pipeline.name} on ${pipeline.branch}:`, err);
        setLatestBuilds(prev => ({
          ...prev,
          [pipeline.id]: {},
        }));
        setAllBuilds(prev => ({
          ...prev,
          [pipeline.id]: [],
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
          // First check if there's a saved default value for this pipeline
          if (pipeline.defaultInputValues && pipeline.defaultInputValues[input.name] !== undefined) {
            defaultValues[input.name] = pipeline.defaultInputValues[input.name];
          } else if (input.default !== undefined) {
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
    loadLatestBuilds();
    loadWorkflowInputs();

    // Auto-refresh deployment status every 10 seconds
    const interval = setInterval(() => {
      refreshDeploymentStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, [project.id]);

  const handleSaveDefaultValue = async (pipelineId: string, inputName: string, value: any) => {
    const pipelineIndex = project.pipelines.findIndex(p => p.id === pipelineId);
    if (pipelineIndex === -1) return;

    // Update the pipeline with the new default value
    const updatedPipeline = {
      ...project.pipelines[pipelineIndex],
      defaultInputValues: {
        ...project.pipelines[pipelineIndex].defaultInputValues,
        [inputName]: value,
      },
    };

    // Update the project
    const updatedProject = {
      ...project,
      pipelines: [
        ...project.pipelines.slice(0, pipelineIndex),
        updatedPipeline,
        ...project.pipelines.slice(pipelineIndex + 1),
      ],
    };

    try {
      await saveProject(updatedProject);
      setProject(updatedProject); // Update local state to reflect changes
      setSuccess(`Default value saved for ${inputName}`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to save default value');
    }
  };

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

    // Generate a unique batch ID for this deployment session
    const batchId = `batch-${Date.now()}`;

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

      setSuccess(`Workflow triggered for ${pipeline.name}. Locating workflow run...`);

      // Find the triggered workflow run (includes initial 3s delay)
      const workflowRunId = await findTriggeredWorkflowRun(
        repository.owner,
        repository.repo,
        pipeline.workflowFile,
        buildNumber,
        pipeline.branch,
        pipeline.environment
      );
      
      const deployment: Deployment = {
        id: Date.now().toString(),
        projectId: project.id,
        pipelineId: pipeline.id,
        repositoryId: repository.id,
        buildNumber,
        branch: pipeline.branch,
        environment: pipeline.environment,
        globalReleaseNumber: globalReleaseNumber || undefined,
        batchId,
        status: 'pending',
        workflowRunId: workflowRunId || undefined,
        startedAt: Date.now(),
      };

      saveDeployment(deployment);
      loadDeployments();
      
      setSuccess(`Deployment triggered successfully for ${pipeline.name}`);
      setBuildNumbers(prev => ({ ...prev, [pipelineId]: '' }));
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

    // Generate a unique batch ID for this group deployment
    const batchId = `batch-${Date.now()}`;

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

        // Find the triggered workflow run
        const workflowRunId = await findTriggeredWorkflowRun(
          repository.owner,
          repository.repo,
          pipeline.workflowFile,
          buildNumber,
          pipeline.branch,
          pipeline.environment
        );
        
        const deployment: Deployment = {
          id: `${Date.now()}-${pipeline.id}`,
          projectId: project.id,
          pipelineId: pipeline.id,
          repositoryId: repository.id,
          buildNumber,
          branch: pipeline.branch,
          environment: pipeline.environment,
          globalReleaseNumber: globalReleaseNumber || undefined,
          batchId,
          status: 'pending',
          workflowRunId: workflowRunId || undefined,
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

  const getStatusIcon = (status: Deployment['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
      case 'failure':
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#2563eb' }} />;
      default:
        return <Clock className="w-4 h-4" style={{ color: '#9ca3af' }} />;
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
      <Badge variant="outline" style={styles[status]} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEnvironmentBadgeStyle = (environment?: string) => {
    if (!environment) return { background: '#f3f4f6', color: '#6b7280', border: '1px solid #d1d5db' };
    
    const envLower = environment.toLowerCase();
    if (envLower.includes('prod')) {
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' };
    } else if (envLower.includes('staging') || envLower.includes('stg')) {
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' };
    } else if (envLower.includes('qa') || envLower.includes('test')) {
      return { background: '#dbeafe', color: '#1e40af', border: '1px solid #3b82f6' };
    } else if (envLower.includes('dev')) {
      return { background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' };
    }
    return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #c4b5fd' };
  };

  // Group deployments by batchId
  const groupedDeployments = deployments.reduce((groups, deployment) => {
    const batchId = deployment.batchId || 'unknown';
    if (!groups[batchId]) {
      groups[batchId] = [];
    }
    groups[batchId].push(deployment);
    return groups;
  }, {} as Record<string, Deployment[]>);

  // Sort batch groups by most recent first
  const sortedBatchIds = Object.keys(groupedDeployments).sort((a, b) => {
    const aTime = Math.min(...groupedDeployments[a].map(d => d.startedAt));
    const bTime = Math.min(...groupedDeployments[b].map(d => d.startedAt));
    return bTime - aTime;
  });

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
                Latest Builds by Branch
              </Badge>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.pipelines.map((pipeline) => {
              const buildInfo = latestBuilds[pipeline.id];
              const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
              
              return (
                <Card
                  key={pipeline.id}
                  className="border-2"
                  style={{ background: 'linear-gradient(to bottom right, #ffffff, #faf5ff)', borderColor: '#c4b5fd' }}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FolderGit2 className="w-4 h-4 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold" style={{ color: '#6b21a8' }}>{pipeline.name}</p>
                          {repo && (
                            <p className="text-xs truncate" style={{ color: '#7c3aed' }}>
                              {repo.owner}/{repo.repo}
                            </p>
                          )}
                        </div>
                      </div>
                      {buildInfo && !buildInfo.loading && buildInfo.commit && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getQAStatusIcon(buildInfo.status, buildInfo.conclusion)}
                        </div>
                      )}
                    </div>

                    {/* Latest Build Info */}
                    {buildInfo?.loading ? (
                      <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border" style={{ background: '#faf5ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : buildInfo?.commit ? (
                      <div className="space-y-2 px-2 py-2 rounded border" style={{ background: '#fefcff', borderColor: '#ddd6fe' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <GitBranch className="w-3 h-3" style={{ color: '#8b5cf6' }} />
                            <span className="text-xs font-medium" style={{ color: '#7c3aed' }}>{pipeline.branch}</span>
                          </div>
                          {buildInfo.buildNumber && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: '#6b21a8', background: '#ede9fe' }}>
                              {buildInfo.buildNumber}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-start gap-1.5">
                          <GitCommit className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: '#8b5cf6' }} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs truncate font-medium" style={{ color: '#1f2937' }} title={buildInfo.commit.message}>
                              {buildInfo.commit.message}
                            </p>
                            <div className="flex flex-col gap-1">
                              <code className="text-xs px-1.5 py-0.5 rounded truncate" style={{ background: '#ede9fe', color: '#6b21a8' }}>
                                {buildInfo.commit.sha}
                              </code>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs truncate" style={{ color: '#9ca3af' }}>
                                  by {buildInfo.commit.author}
                                </span>
                                <span className="text-xs" style={{ color: '#9ca3af' }}>
                                  {formatRelativeDate(buildInfo.commit.date)}
                                </span>
                              </div>
                            </div>
                            {buildInfo.url && (
                              <a
                                href={buildInfo.url}
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
                      null
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
                  {buildNumberInput && (
                    <div className="flex flex-col items-end gap-1">
                      {latestBuilds[pipeline.id]?.loading ? (
                        <div className="flex items-center gap-1 text-xs" style={{ color: '#9ca3af' }}>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Loading builds...</span>
                        </div>
                      ) : latestBuilds[pipeline.id]?.buildNumber ? (
                        <>
                          <div 
                            className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-all" 
                            style={{ color: '#7c3aed' }}
                            onClick={() => setInputValues(prev => ({
                              ...prev,
                              [pipeline.id]: {
                                ...prev[pipeline.id],
                                build_number: latestBuilds[pipeline.id]?.buildNumber || '',
                              },
                            }))}
                            title={`Click to use latest build from ${pipeline.branch}`}
                          >
                            <GitBranch className="w-3 h-3" />
                            <span>{pipeline.branch}:</span>
                            <code 
                              className="px-1.5 py-0.5 rounded font-semibold" 
                              style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)', color: '#6b21a8' }}
                            >
                              {latestBuilds[pipeline.id]?.buildNumber}
                            </code>
                          </div>
                          {allBuilds[pipeline.id]?.length > 1 && (
                            <button
                              type="button"
                              className="text-xs hover:underline transition-all flex items-center gap-1"
                              style={{ color: '#9ca3af' }}
                              onClick={() => setShowAllBuilds(prev => ({
                                ...prev,
                                [pipeline.id]: !prev[pipeline.id]
                              }))}
                            >
                              {showAllBuilds[pipeline.id] ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  <span>Show {allBuilds[pipeline.id].length - 1} more</span>
                                </>
                              )}
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Last 5 Builds Dropdown */}
                {showAllBuilds[pipeline.id] && allBuilds[pipeline.id]?.length > 1 && (
                  <div className="mt-2 p-2 rounded-md border space-y-1.5" style={{ background: '#fafaf9', borderColor: '#e9d5ff' }}>
                    <div className="text-xs font-semibold mb-1.5" style={{ color: '#6b21a8' }}>
                      Last {allBuilds[pipeline.id].length} builds from {pipeline.branch}
                    </div>
                    {allBuilds[pipeline.id].slice(0, 5).map((build, index) => {
                      const statusColor = build.conclusion === 'success' ? '#10b981' : 
                                         build.conclusion === 'failure' ? '#ef4444' : 
                                         build.status === 'in_progress' ? '#2563eb' : '#6b7280';
                      const statusIcon = build.conclusion === 'success' ? CheckCircle2 : 
                                        build.conclusion === 'failure' ? XCircle : 
                                        build.status === 'in_progress' ? RefreshCw : Clock;
                      const StatusIcon = statusIcon;
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 rounded border cursor-pointer hover:border-purple-300 transition-all group"
                          style={{ background: '#ffffff', borderColor: index === 0 ? '#c4b5fd' : '#e9d5ff' }}
                          onClick={() => {
                            if (buildNumberInput) {
                              setInputValues(prev => ({
                                ...prev,
                                [pipeline.id]: {
                                  ...prev[pipeline.id],
                                  build_number: build.buildNumber || '',
                                },
                              }));
                              setShowAllBuilds(prev => ({ ...prev, [pipeline.id]: false }));
                            }
                          }}
                          title={`Click to use this build`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: statusColor }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code 
                                  className="px-1.5 py-0.5 rounded text-xs font-semibold" 
                                  style={{ 
                                    background: index === 0 ? 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)' : '#f3f4f6', 
                                    color: index === 0 ? '#6b21a8' : '#4b5563' 
                                  }}
                                >
                                  {build.buildNumber}
                                </code>
                                {index === 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-1.5 py-0" 
                                    style={{ background: '#dbeafe', color: '#1e40af', borderColor: '#60a5fa' }}
                                  >
                                    Latest
                                  </Badge>
                                )}
                              </div>
                              {build.commit && (
                                <p className="text-xs mt-0.5 truncate" style={{ color: '#6b7280' }}>
                                  {build.commit.sha} • {build.commit.message}
                                </p>
                              )}
                              {build.createdAt && (
                                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                                  {new Date(build.createdAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          {build.url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(build.url, '_blank');
                              }}
                              title="View on GitHub"
                            >
                              <ExternalLink className="w-3 h-3" style={{ color: '#7c3aed' }} />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

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
                                  {input.options.map(option => {
                                    const isDefault = pipeline.defaultInputValues?.[input.name] === option;
                                    return (
                                      <div 
                                        key={option} 
                                        className="flex items-center justify-between hover:bg-purple-50 group"
                                        style={{ padding: '0' }}
                                      >
                                        <SelectItem 
                                          value={option} 
                                          className="flex-1 cursor-pointer"
                                        >
                                          {option}
                                        </SelectItem>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSaveDefaultValue(pipeline.id, input.name, option);
                                          }}
                                          className="flex-shrink-0 p-2 hover:bg-purple-100 transition-colors"
                                          title={isDefault ? "Default value" : "Set as default"}
                                          style={{ color: isDefault ? '#7c3aed' : '#d1d5db' }}
                                        >
                                          <Star 
                                            className="w-3.5 h-3.5" 
                                            fill={isDefault ? '#7c3aed' : 'none'}
                                            strokeWidth={isDefault ? 2 : 1.5}
                                          />
                                        </button>
                                      </div>
                                    );
                                  })}
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
          
          {!error && !success && (
            <Alert className="border-[#7c3aed] bg-[#faf5ff]">
              <Info className="h-4 w-4" style={{ color: '#7c3aed' }} />
              <AlertDescription style={{ color: '#6b21a8' }}>
                <span className="text-xs">
                  After triggering deployments, the system waits 3 seconds before identifying workflow runs. Each deployment session is grouped separately in the status section below.
                </span>
              </AlertDescription>
            </Alert>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Deployment Status */}
      <Collapsible open={deploymentStatusOpen} onOpenChange={setDeploymentStatusOpen}>
        <Card className="border-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5" style={{ color: '#7c3aed' }} />
                      <CardTitle style={{ color: '#6b21a8' }}>Deployment Status</CardTitle>
                      {deploymentStatusOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#7c3aed' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#7c3aed' }} />}
                      {deployments.length > 0 && (
                        <Badge 
                          variant="outline" 
                          className="ml-1 text-xs px-2 py-0.5" 
                          style={{ 
                            background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)', 
                            color: '#6b21a8', 
                            border: '2px solid #a78bfa' 
                          }}
                        >
                          {deployments.length}
                        </Badge>
                      )}
                    </div>
                    <CardDescription style={{ color: '#7c3aed' }}>
                      Deployments grouped by session - each trigger creates a new batch
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
                <div className="text-center py-12" style={{ color: '#9ca3af' }}>
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No deployments yet</p>
                  <p className="text-sm mt-1">Deploy a pipeline to see the status here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedBatchIds.map((batchId, batchIndex) => {
                    const batch = groupedDeployments[batchId];
                    const batchStartTime = Math.min(...batch.map(d => d.startedAt));
                    const batchHasGlobalRelease = batch.some(d => d.globalReleaseNumber);
                    const globalReleaseNumber = batch.find(d => d.globalReleaseNumber)?.globalReleaseNumber;

                    return (
                      <div key={batchId} className="border-2 rounded-lg overflow-hidden" style={{ borderColor: '#e9d5ff' }}>
                        {/* Batch Header */}
                        <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)', borderBottom: '2px solid #e9d5ff' }}>
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="outline" 
                              className="text-xs font-mono" 
                              style={{ 
                                background: '#6b21a8', 
                                color: '#ffffff', 
                                border: 'none' 
                              }}
                            >
                              #{sortedBatchIds.length - batchIndex}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" style={{ color: '#7c3aed' }} />
                              <span className="text-sm font-semibold" style={{ color: '#6b21a8' }}>
                                {formatDate(batchStartTime)}
                              </span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className="text-xs" 
                              style={{ 
                                background: '#ffffff', 
                                color: '#7c3aed', 
                                border: '1px solid #c4b5fd' 
                              }}
                            >
                              {batch.length} pipeline{batch.length !== 1 ? 's' : ''}
                            </Badge>
                            {batchHasGlobalRelease && (
                              <Badge 
                                variant="outline" 
                                className="text-xs flex items-center gap-1" 
                                style={{ 
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                                  color: '#92400e', 
                                  border: '1px solid #f59e0b' 
                                }}
                              >
                                <Star className="w-3 h-3" />
                                Release {globalReleaseNumber}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Batch Deployments Table */}
                        <Table>
                          <TableHeader>
                            <TableRow style={{ background: '#fafafa', borderColor: '#f3e8ff' }}>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Status</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Pipeline</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Environment</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Build</TableHead>
                              <TableHead className="font-semibold text-xs" style={{ color: '#6b21a8' }}>Repository</TableHead>
                              <TableHead className="font-semibold text-xs text-right" style={{ color: '#6b21a8' }}>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batch.map((deployment) => {
                        const pipeline = project.pipelines.find(p => p.id === deployment.pipelineId);
                        const repo = project.repositories.find(r => r.id === deployment.repositoryId);
                        
                        return (
                          <TableRow 
                            key={deployment.id}
                            className="hover:bg-purple-50/30"
                            style={{ borderColor: '#f3e8ff' }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(deployment.status)}
                                {getStatusBadge(deployment.status)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs" 
                                  style={{ color: '#7c3aed', background: '#fefcff', borderColor: '#c4b5fd' }}
                                >
                                  {pipeline?.name || 'Unknown'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {deployment.environment || pipeline?.environment ? (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs font-mono" 
                                  style={getEnvironmentBadgeStyle(deployment.environment || pipeline?.environment)}
                                >
                                  {deployment.environment || pipeline?.environment}
                                </Badge>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <GitBranch className="w-3 h-3" style={{ color: '#9ca3af' }} />
                                  <span className="text-xs font-mono" style={{ color: '#9ca3af' }}>
                                    {deployment.branch}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm" style={{ color: '#6b21a8' }}>
                                {deployment.buildNumber}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm" style={{ color: '#7c3aed' }}>
                                {repo?.name || 'Unknown'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {deployment.workflowRunId && repo ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    window.open(
                                      `https://github.com/${repo.owner}/${repo.repo}/actions/runs/${deployment.workflowRunId}`,
                                      '_blank'
                                    );
                                  }}
                                  className="hover:bg-purple-100"
                                  title="View on GitHub"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />
                                </Button>
                              ) : (
                                <span className="text-xs" style={{ color: '#9ca3af' }}>-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
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
