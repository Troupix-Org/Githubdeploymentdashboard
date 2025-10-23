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
  GitCommit,
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
  const [qaReleaseBuilds, setQaReleaseBuilds] = useState<{ [repoId: string]: QAReleaseBuildInfo }>({});
  
  // Deploy All Dialog states
  const [showDeployAllDialog, setShowDeployAllDialog] = useState(false);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [deployProgress, setDeployProgress] = useState({ current: 0, total: 0 });
  const [isDeploying, setIsDeploying] = useState(false);

  // Workflow inputs states
  const [workflowInputs, setWorkflowInputs] = useState<{ [pipelineId: string]: WorkflowInput[] }>({});
  const [inputValues, setInputValues] = useState<{ [pipelineId: string]: Record<string, any> }>({});

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
    // Load QA release builds for each repository
    for (const repo of project.repositories) {
      // Set loading state
      setQaReleaseBuilds(prev => ({
        ...prev,
        [repo.id]: { loading: true },
      }));

      // Find a pipeline for this repository (any workflow file will do)
      const repoPipeline = project.pipelines.find(p => p.repositoryId === repo.id);
      if (!repoPipeline) {
        setQaReleaseBuilds(prev => ({
          ...prev,
          [repo.id]: {},
        }));
        continue;
      }

      try {
        const buildData = await getLatestBuildForBranch(
          repo.owner,
          repo.repo,
          repoPipeline.workflowFile,
          'qarelease'
        );
        
        setQaReleaseBuilds(prev => ({
          ...prev,
          [repo.id]: buildData || {},
        }));
      } catch (err) {
        console.error(`Failed to load QA release build for ${repo.name}:`, err);
        setQaReleaseBuilds(prev => ({
          ...prev,
          [repo.id]: {},
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
          if (input.name === 'build_number') {
            // Skip build_number as it's handled separately
            return;
          }
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
    const buildNumber = buildNumbers[pipelineId];
    if (!buildNumber) {
      setError(`Please enter a build number for ${project.pipelines.find(p => p.id === pipelineId)?.name}`);
      return;
    }

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

    setLoadingPipelines(prev => ({ ...prev, [pipelineId]: true }));
    setError('');
    setSuccess('');

    try {
      // Prepare workflow inputs
      const workflowParams: Record<string, string> = {
        build_number: buildNumber,
      };

      // Add additional inputs if they exist
      const additionalInputs = inputValues[pipeline.id] || {};
      for (const [key, value] of Object.entries(additionalInputs)) {
        if (value !== undefined && value !== null && value !== '') {
          workflowParams[key] = String(value);
        }
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

      const buildNumber = buildNumbers[pipeline.id];
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
        // Prepare workflow inputs
        const workflowParams: Record<string, string> = {
          build_number: buildNumber,
        };

        // Add additional inputs if they exist
        const additionalInputs = inputValues[pipeline.id] || {};
        for (const [key, value] of Object.entries(additionalInputs)) {
          if (value !== undefined && value !== null && value !== '') {
            workflowParams[key] = String(value);
          }
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
          <div className="flex items-center justify-between">
            <CardTitle style={{ color: '#1f2937' }}>Repositories</CardTitle>
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-1" 
              style={{ 
                background: '#dbeafe', 
                color: '#1e40af', 
                border: '1px solid #60a5fa' 
              }}
            >
              Latest QA Release Builds
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {project.repositories.map((repo) => {
              const qaInfo = qaReleaseBuilds[repo.id];
              
              return (
                <div
                  key={repo.id}
                  className="p-4 rounded-lg border border-[#e5e7eb]"
                  style={{ background: '#f9fafb' }}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FolderGit2 className="w-5 h-5 flex-shrink-0" style={{ color: '#6b7280' }} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ color: '#1f2937' }}>{repo.name}</p>
                        <p className="text-sm truncate" style={{ color: '#6b7280' }}>
                          {repo.owner}/{repo.repo}
                        </p>
                      </div>
                    </div>
                    {qaInfo && !qaInfo.loading && qaInfo.commit && (
                      <div className="flex items-center gap-2">
                        {getQAStatusIcon(qaInfo.status, qaInfo.conclusion)}
                      </div>
                    )}
                  </div>

                  {/* QA Release Build Info */}
                  {qaInfo?.loading ? (
                    <div className="flex items-center gap-2 text-sm px-3 py-2 rounded border border-[#d1d5db]" style={{ background: '#ffffff', color: '#6b7280' }}>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Loading qarelease build...</span>
                    </div>
                  ) : qaInfo?.commit ? (
                    <div className="space-y-2 px-3 py-2 rounded border border-[#d1d5db]" style={{ background: '#ffffff' }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3 h-3" style={{ color: '#6b7280' }} />
                          <span className="text-sm" style={{ color: '#6b7280' }}>qarelease</span>
                        </div>
                        {qaInfo.buildNumber && (
                          <span className="text-xs" style={{ color: '#6b7280' }}>
                            {qaInfo.buildNumber}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <GitCommit className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#6b7280' }} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm truncate" style={{ color: '#1f2937' }} title={qaInfo.commit.message}>
                            {qaInfo.commit.message}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#e5e7eb', color: '#6b7280' }}>
                              {qaInfo.commit.sha}
                            </code>
                            <span className="text-xs" style={{ color: '#9ca3af' }}>
                              by {qaInfo.commit.author}
                            </span>
                            <span className="text-xs" style={{ color: '#9ca3af' }}>
                              {formatRelativeDate(qaInfo.commit.date)}
                            </span>
                          </div>
                          {qaInfo.url && (
                            <a
                              href={qaInfo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs inline-flex items-center gap-1 hover:underline"
                              style={{ color: '#2563eb' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              View workflow run
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm px-3 py-2 rounded border border-[#d1d5db]" style={{ background: '#ffffff', color: '#9ca3af' }}>
                      No qarelease builds found
                    </div>
                  )}
                </div>
              );
            })}
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
          {/* Pipeline Rows */}
          {project.pipelines.map(pipeline => {
            const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
            const pipelineInputs = workflowInputs[pipeline.id]?.filter(input => input.name !== 'build_number') || [];
            const hasAdditionalInputs = pipelineInputs.length > 0;
            
            return (
              <div 
                key={pipeline.id} 
                className="p-4 rounded-lg border border-[#e5e7eb] space-y-3"
                style={{ background: '#f9fafb' }}
              >
                {/* Pipeline Header */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div style={{ color: '#1f2937' }}>
                      {pipeline.name}
                    </div>
                    {repo && (
                      <div className="flex items-center gap-3 text-sm" style={{ color: '#6b7280' }}>
                        <div className="flex items-center gap-1">
                          <FolderGit2 className="w-3 h-3" />
                          <span>{repo.owner}/{repo.repo}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          <span>{pipeline.branch}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {repo && qaReleaseBuilds[repo.id]?.buildNumber && (
                    <div 
                      className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80" 
                      style={{ color: '#6b7280' }}
                      onClick={() => setBuildNumbers(prev => ({ ...prev, [pipeline.id]: qaReleaseBuilds[repo.id]?.buildNumber || '' }))}
                      title="Click to use QA build number"
                    >
                      <GitBranch className="w-3 h-3" />
                      <span>qa:</span>
                      <code 
                        className="px-1.5 py-0.5 rounded" 
                        style={{ background: '#dbeafe', color: '#2563eb' }}
                      >
                        {qaReleaseBuilds[repo.id]?.buildNumber}
                      </code>
                    </div>
                  )}
                </div>

                {/* Build Number and Deploy Button */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <Input
                    placeholder="Build number (e.g. 1.0.0)"
                    value={buildNumbers[pipeline.id] || ''}
                    onChange={(e) => setBuildNumbers(prev => ({ ...prev, [pipeline.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleDeploy(pipeline.id)}
                    className="border-[#d1d5db]"
                    style={{ background: '#ffffff', color: '#1f2937' }}
                  />
                  <Button
                    onClick={() => handleDeploy(pipeline.id)}
                    disabled={loadingPipelines[pipeline.id]}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white min-w-[120px]"
                  >
                    {loadingPipelines[pipeline.id] ? (
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

                {/* Additional Workflow Inputs */}
                {hasAdditionalInputs && (
                  <div className="space-y-3 pt-3 border-t border-[#e5e7eb]">
                    <div className="text-sm" style={{ color: '#6b7280' }}>
                      Additional Parameters
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pipelineInputs.map(input => (
                        <div key={input.name} className="space-y-2">
                          <Label htmlFor={`input-${pipeline.id}-${input.name}`} className="text-sm" style={{ color: '#374151' }}>
                            {input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            {input.required && <span style={{ color: '#ef4444' }}> *</span>}
                          </Label>
                          {input.description && (
                            <p className="text-xs" style={{ color: '#9ca3af' }}>
                              {input.description}
                            </p>
                          )}
                          {input.type === 'boolean' ? (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`input-${pipeline.id}-${input.name}`}
                                checked={inputValues[pipeline.id]?.[input.name] === true}
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
                              <Label htmlFor={`input-${pipeline.id}-${input.name}`} className="cursor-pointer text-sm" style={{ color: '#6b7280' }}>
                                Enable
                              </Label>
                            </div>
                          ) : input.type === 'choice' && input.options ? (
                            <Select
                              value={inputValues[pipeline.id]?.[input.name] || ''}
                              onValueChange={(value) => {
                                setInputValues(prev => ({
                                  ...prev,
                                  [pipeline.id]: {
                                    ...prev[pipeline.id],
                                    [input.name]: value,
                                  },
                                }));
                              }}
                            >
                              <SelectTrigger
                                id={`input-${pipeline.id}-${input.name}`}
                                className="border-[#d1d5db]"
                                style={{ background: '#ffffff', color: '#1f2937' }}
                              >
                                <SelectValue placeholder={`Select ${input.name}`} />
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
                              value={inputValues[pipeline.id]?.[input.name] || ''}
                              onChange={(e) => {
                                setInputValues(prev => ({
                                  ...prev,
                                  [pipeline.id]: {
                                    ...prev[pipeline.id],
                                    [input.name]: input.type === 'number' ? parseFloat(e.target.value) : e.target.value,
                                  },
                                }));
                              }}
                              className="border-[#d1d5db]"
                              style={{ background: '#ffffff', color: '#1f2937' }}
                            />
                          )}
                        </div>
                      ))}
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
                  const allBuildNumbers = project.pipelines.every(p => buildNumbers[p.id]);
                  if (!allBuildNumbers) {
                    setError('Please enter build numbers for all pipelines');
                    return;
                  }
                  setSelectedPipelines(project.pipelines.map(p => p.id));
                  setShowDeployAllDialog(true);
                }}
                variant="outline"
                className="w-full border-[#2563eb] text-[#2563eb] hover:bg-[#eff6ff]"
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
      </Card>

      {/* Deployment History */}
      <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#1f2937' }}>Deployment History</CardTitle>
              <CardDescription style={{ color: '#6b7280' }}>
                Recent deployments for all pipelines
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
          {deployments.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#6b7280' }}>
              No deployments yet. Start your first deployment above.
            </div>
          ) : (
            <div className="space-y-3">
              {deployments.map((deployment) => {
                const pipeline = project.pipelines.find(p => p.id === deployment.pipelineId);
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
