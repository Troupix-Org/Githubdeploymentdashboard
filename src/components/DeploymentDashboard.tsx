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
  ChevronDown,
  ChevronUp,
  Star,
  Activity,
  Clock,
  XCircle,
  Loader2,
  Info,
  Trash2,
} from 'lucide-react';
import { Project, Deployment, saveDeployment, Repository, saveProject, getDeploymentsByProject, deleteDeployment, deleteDeploymentsByBatch } from '../lib/storage';
import { triggerWorkflow, getWorkflowInputs, WorkflowInput, findTriggeredWorkflowRun, getWorkflowRun } from '../lib/github';
import { ProductionReleaseProcess } from './ProductionReleaseProcess';
import { ProductionReleaseTabs } from './ProductionReleaseTabs';
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

export function DeploymentDashboard({ project: initialProject, onBack }: DeploymentDashboardProps) {
  const [project, setProject] = useState<Project>(initialProject);
  const [buildNumbers, setBuildNumbers] = useState<{ [pipelineId: string]: string }>({});
  const [loadingPipelines, setLoadingPipelines] = useState<{ [pipelineId: string]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  
  // Deploy All Dialog states
  const [showDeployAllDialog, setShowDeployAllDialog] = useState(false);
  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([]);
  const [deployProgress, setDeployProgress] = useState({ current: 0, total: 0 });
  const [isDeploying, setIsDeploying] = useState(false);
  const [editingSelection, setEditingSelection] = useState(false);

  // Workflow inputs states
  const [workflowInputs, setWorkflowInputs] = useState<{ [pipelineId: string]: WorkflowInput[] }>({});
  const [inputValues, setInputValues] = useState<{ [pipelineId: string]: Record<string, any> }>({});

  // Collapsible sections states
  const [deployOpen, setDeployOpen] = useState(false);
  const [deploymentStatusOpen, setDeploymentStatusOpen] = useState(true);

  // Deployment Status states
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState<number>(0);
  
  // Delete deployment states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBatchDialogOpen, setDeleteBatchDialogOpen] = useState(false);
  const [deploymentToDelete, setDeploymentToDelete] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  // Current production release ID (for production projects)
  const [currentProductionReleaseId, setCurrentProductionReleaseId] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const loadDeployments = () => {
    const data = getDeploymentsByProject(project.id);
    setDeployments(data.sort((a, b) => b.startedAt - a.startedAt));
  };

  const handleDeleteDeployment = () => {
    if (deploymentToDelete) {
      deleteDeployment(deploymentToDelete);
      loadDeployments();
      setDeleteDialogOpen(false);
      setDeploymentToDelete(null);
      setSuccess('Deployment deleted successfully');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const handleDeleteBatch = () => {
    if (batchToDelete) {
      deleteDeploymentsByBatch(batchToDelete);
      loadDeployments();
      setDeleteBatchDialogOpen(false);
      setBatchToDelete(null);
      setSuccess('Batch deleted successfully');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const refreshDeploymentStatus = async (silent = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    
    try {
      // Get fresh deployments from storage
      const currentDeployments = getDeploymentsByProject(project.id);
      const updatedDeployments = [...currentDeployments];
      let hasUpdates = false;
      const completedDeployments: { pipeline: string; status: string }[] = [];

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
            
            // Track completed deployments for notification
            if (status === 'success' || status === 'failure') {
              completedDeployments.push({
                pipeline: pipeline.name,
                status: status,
              });
            }
          }
        } catch (err) {
          console.error(`Failed to refresh status for deployment ${deployment.id}:`, err);
        }
      }

      if (hasUpdates) {
        setDeployments(updatedDeployments);
        
        // Show subtle notification for completed deployments (only for auto-refresh)
        if (silent && completedDeployments.length > 0) {
          const successCount = completedDeployments.filter(d => d.status === 'success').length;
          const failureCount = completedDeployments.filter(d => d.status === 'failure').length;
          
          if (successCount > 0 && failureCount === 0) {
            setSuccess(`✓ ${successCount} deployment${successCount > 1 ? 's' : ''} completed successfully`);
            setTimeout(() => setSuccess(''), 3000);
          } else if (failureCount > 0 && successCount === 0) {
            setError(`✗ ${failureCount} deployment${failureCount > 1 ? 's' : ''} failed`);
            setTimeout(() => setError(''), 3000);
          } else if (successCount > 0 && failureCount > 0) {
            setSuccess(`${successCount} succeeded, ${failureCount} failed`);
            setTimeout(() => setSuccess(''), 3000);
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh deployment status:', err);
    } finally {
      if (!silent) {
        setRefreshing(false);
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
    loadWorkflowInputs();
  }, [project.id]);

  // Auto-refresh deployment status when there are active deployments
  useEffect(() => {
    // Check if there are any active deployments (pending or in_progress)
    const hasActiveDeployments = deployments.some(
      d => d.status === 'pending' || d.status === 'in_progress'
    );

    if (!hasActiveDeployments) {
      setNextRefreshIn(0);
      return; // No need to poll if all deployments are completed
    }

    // Determine polling interval based on deployment age
    const getPollingInterval = () => {
      const activeDeployments = deployments.filter(d => d.status === 'pending' || d.status === 'in_progress');
      if (activeDeployments.length === 0) return 15000;

      const oldestActiveDeployment = activeDeployments.reduce((oldest, current) => 
        current.startedAt < oldest.startedAt ? current : oldest
      );

      const age = Date.now() - oldestActiveDeployment.startedAt;
      const ageMinutes = age / 60000;

      // More frequent polling for recent deployments
      if (ageMinutes < 2) return 10000;  // Every 10 seconds for first 2 minutes
      if (ageMinutes < 5) return 20000;  // Every 20 seconds for 2-5 minutes
      return 30000; // Every 30 seconds after 5 minutes
    };

    const pollingInterval = getPollingInterval();
    setNextRefreshIn(pollingInterval);

    // Countdown timer for visual feedback
    const countdownInterval = setInterval(() => {
      setNextRefreshIn(prev => Math.max(0, prev - 1000));
    }, 1000);

    // Start polling
    const refreshInterval = setInterval(() => {
      refreshDeploymentStatus(true); // Silent refresh with notifications
      setNextRefreshIn(pollingInterval); // Reset countdown
    }, pollingInterval);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [deployments]);

  // Reset editing state when dialog opens/closes
  useEffect(() => {
    if (!showDeployAllDialog) {
      setEditingSelection(false);
    }
  }, [showDeployAllDialog]);

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
        batchId,
        productionReleaseId: currentProductionReleaseId || undefined,
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
          batchId,
          productionReleaseId: currentProductionReleaseId || undefined,
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
    // Clear the current production release ID after deployment
    setCurrentProductionReleaseId(null);

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
      // Only select pipelines that have build numbers
      const pipelinesWithBuildNumbers = project.pipelines.filter(p => 
        inputValues[p.id]?.build_number || buildNumbers[p.id]
      );
      setSelectedPipelines(pipelinesWithBuildNumbers.map(p => p.id));
    }
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="hover:bg-slate-700" style={{ color: '#e9d5ff' }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl" style={{ color: '#e9d5ff' }}>{project.name}</h2>
            {project.isProductionRelease && (
              <Badge className="text-white px-2 py-0.5" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}>
                PRODUCTION
              </Badge>
            )}
          </div>
          <p style={{ color: '#cbd5e1' }}>
            {project.repositories.length} repositor{project.repositories.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
      </div>

      {/* Production Release Process - Show tabs for production projects, otherwise show single process */}
      {(() => {
        const hasProdPipelines = project.pipelines.some(p => 
          p.environment?.toLowerCase().includes('prod')
        );
        
        if (!hasProdPipelines && !project.isProductionRelease) {
          return null;
        }

        const handleDeployToProduction = (releaseId?: string) => {
          // Store the current release ID if provided
          if (releaseId) {
            setCurrentProductionReleaseId(releaseId);
          }
          
          // Trigger deployment to production pipelines
          const prodPipelines = project.pipelines.filter(p => 
            p.environment?.toLowerCase().includes('prod')
          );
          
          if (prodPipelines.length === 0) {
            setError('No production pipelines found');
            setTimeout(() => setError(''), 3000);
            return;
          }
          
          // Select all production pipelines
          setSelectedPipelines(prodPipelines.map(p => p.id));
          
          // Open the deploy all dialog
          setShowDeployAllDialog(true);
        };

        // If this is a production project, show tabs
        if (project.isProductionRelease) {
          return (
            <ProductionReleaseTabs
              project={project}
              deployments={deployments}
              onDeployToProduction={handleDeployToProduction}
              onProjectUpdate={setProject}
            />
          );
        }
        
        // Otherwise, show the single process view
        return (
          <ProductionReleaseProcess
            project={project}
            deployments={deployments}
            onDeployToProduction={() => handleDeployToProduction()}
          />
        );
      })()}

      {/* Deploy Section - Hidden for production projects (now integrated in tabs) */}
      {!project.isProductionRelease && (
      <Collapsible open={deployOpen} onOpenChange={setDeployOpen}>
        <Card id="deploy-section" className="border-[#e5e7eb]" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)' }}>
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
      )}

      {/* Deployment Status - Hidden for production projects */}
      {!project.isProductionRelease && (
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
                      {(() => {
                        const activeCount = deployments.filter(d => d.status === 'pending' || d.status === 'in_progress').length;
                        if (activeCount === 0) return null;
                        return (
                          <Badge 
                            variant="outline" 
                            className="ml-1 text-xs px-2 py-0.5 flex items-center gap-1" 
                            style={{ 
                              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
                              color: '#1e40af', 
                              border: '2px solid #60a5fa' 
                            }}
                            title={`${activeCount} active deployment${activeCount > 1 ? 's' : ''} • Next refresh in ${Math.ceil(nextRefreshIn / 1000)} seconds`}
                          >
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>{activeCount} active • {Math.ceil(nextRefreshIn / 1000)}s</span>
                          </Badge>
                        );
                      })()}
                    </div>
                    <CardDescription style={{ color: '#7c3aed' }}>
                      {(() => {
                        const activeDeployments = deployments.filter(d => d.status === 'pending' || d.status === 'in_progress');
                        if (activeDeployments.length === 0) {
                          return 'Deployments grouped by session - each trigger creates a new batch';
                        }
                        
                        const oldestActive = activeDeployments.reduce((oldest, current) => 
                          current.startedAt < oldest.startedAt ? current : oldest
                        );
                        const ageMinutes = (Date.now() - oldestActive.startedAt) / 60000;
                        const interval = ageMinutes < 2 ? '10s' : ageMinutes < 5 ? '20s' : '30s';
                        
                        return `Auto-refreshing every ${interval} • ${activeDeployments.length} active deployment${activeDeployments.length > 1 ? 's' : ''}`;
                      })()}
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setBatchToDelete(batchId);
                              setDeleteBatchDialogOpen(true);
                            }}
                            className="hover:bg-red-50 h-7"
                            title="Delete this batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                          </Button>
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
                              <div className="flex items-center justify-end gap-1">
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
                                    className="hover:bg-purple-100 h-7 w-7 p-0"
                                    title="View on GitHub"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setDeploymentToDelete(deployment.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="hover:bg-red-50 h-7 w-7 p-0"
                                  title="Delete deployment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                                </Button>
                              </div>
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
      )}

      {/* Deploy All Confirmation Dialog */}
      <AlertDialog open={showDeployAllDialog} onOpenChange={setShowDeployAllDialog}>
        <AlertDialogContent className="max-w-3xl" style={{ background: '#ffffff' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <Rocket className="w-5 h-5" style={{ color: '#7c3aed' }} />
              Confirm Deployment - {selectedPipelines.length} Pipeline{selectedPipelines.length !== 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#6b7280' }}>
              Review the deployment details below before proceeding. All pipelines will be deployed sequentially.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Deployment Summary Table */}
            <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: '#e9d5ff' }}>
              <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%)', borderBottom: '2px solid #e9d5ff' }}>
                <div className="font-semibold flex items-center gap-3" style={{ color: '#6b21a8' }}>
                  <Activity className="w-4 h-4" />
                  <span>Deployment Summary</span>
                  <Badge 
                    variant="outline" 
                    className="text-xs font-normal" 
                    style={{ 
                      background: '#ffffff', 
                      color: selectedPipelines.length === project.pipelines.length ? '#10b981' : '#7c3aed', 
                      border: `1px solid ${selectedPipelines.length === project.pipelines.length ? '#10b981' : '#c4b5fd'}` 
                    }}
                  >
                    {selectedPipelines.length} / {project.pipelines.length} selected
                  </Badge>
                </div>
                {!isDeploying && !editingSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSelection(true)}
                    className="text-xs h-7"
                    style={{ color: '#7c3aed' }}
                  >
                    Edit Selection
                  </Button>
                )}
                {editingSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSelection(false)}
                    className="text-xs h-7"
                    style={{ color: '#10b981' }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Done
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow style={{ background: '#fafafa' }}>
                    {editingSelection && <TableHead className="w-12"></TableHead>}
                    <TableHead className="font-semibold" style={{ color: '#6b21a8' }}>Pipeline</TableHead>
                    <TableHead className="font-semibold" style={{ color: '#6b21a8' }}>Repository</TableHead>
                    <TableHead className="font-semibold" style={{ color: '#6b21a8' }}>Branch</TableHead>
                    <TableHead className="font-semibold" style={{ color: '#6b21a8' }}>Environment</TableHead>
                    <TableHead className="font-semibold" style={{ color: '#6b21a8' }}>Build Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editingSelection ? project.pipelines : project.pipelines.filter(p => selectedPipelines.includes(p.id)))
                    .map((pipeline, index) => {
                      const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
                      const buildNumber = inputValues[pipeline.id]?.build_number || buildNumbers[pipeline.id];
                      const isSelected = selectedPipelines.includes(pipeline.id);
                      return (
                        <TableRow 
                          key={pipeline.id}
                          className="hover:bg-purple-50/30"
                          style={{ 
                            borderColor: '#f3e8ff',
                            background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                            opacity: editingSelection && !isSelected ? 0.5 : 1
                          }}
                        >
                          {editingSelection && (
                            <TableCell className="w-12">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => {
                                  if (isSelected) {
                                    setSelectedPipelines(prev => prev.filter(id => id !== pipeline.id));
                                  } else {
                                    setSelectedPipelines(prev => [...prev, pipeline.id]);
                                  }
                                }}
                                disabled={!buildNumber}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className="text-xs" 
                              style={{ color: '#7c3aed', background: '#fefcff', borderColor: '#c4b5fd' }}
                            >
                              {pipeline.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm" style={{ color: '#7c3aed' }}>
                              <FolderGit2 className="w-3.5 h-3.5" />
                              {repo?.name || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs font-mono" style={{ color: '#6b7280' }}>
                              <GitBranch className="w-3 h-3" />
                              {pipeline.branch}
                            </div>
                          </TableCell>
                          <TableCell>
                            {pipeline.environment ? (
                              <Badge 
                                variant="outline" 
                                className="text-xs font-mono" 
                                style={getEnvironmentBadgeStyle(pipeline.environment)}
                              >
                                {pipeline.environment}
                              </Badge>
                            ) : (
                              <span className="text-xs" style={{ color: '#9ca3af' }}>-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <code 
                              className="px-2 py-1 rounded font-semibold text-sm" 
                              style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)', color: '#6b21a8' }}
                            >
                              {buildNumber}
                            </code>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            {/* Warning if no pipelines selected */}
            {!isDeploying && selectedPipelines.length === 0 && (
              <Alert className="border-[#ef4444] bg-[#fef2f2]">
                <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
                <AlertDescription style={{ color: '#dc2626' }}>
                  No pipelines selected. Please select at least one pipeline to deploy.
                </AlertDescription>
              </Alert>
            )}

            {/* Warning if not all pipelines selected */}
            {!isDeploying && selectedPipelines.length > 0 && selectedPipelines.length < project.pipelines.length && (
              <Alert className="border-[#f59e0b] bg-[#fffbeb]">
                <AlertCircle className="h-4 w-4" style={{ color: '#f59e0b' }} />
                <AlertDescription style={{ color: '#92400e' }}>
                  {project.pipelines.length - selectedPipelines.length} pipeline{project.pipelines.length - selectedPipelines.length !== 1 ? 's' : ''} will not be deployed.
                </AlertDescription>
              </Alert>
            )}

            {/* Info message */}
            {!isDeploying && selectedPipelines.length > 0 && (
              <Alert className="border-[#7c3aed] bg-[#faf5ff]">
                <Info className="h-4 w-4" style={{ color: '#7c3aed' }} />
                <AlertDescription style={{ color: '#6b21a8' }}>
                  <span className="text-xs">
                    All deployments will be grouped in a single batch. The system will wait 3 seconds after triggering each workflow before identifying the run.
                  </span>
                </AlertDescription>
              </Alert>
            )}

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
              className="border-2"
              style={{ borderColor: '#d1d5db', color: '#374151' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeployAll}
              disabled={selectedPipelines.length === 0 || isDeploying}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
            >
              {isDeploying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Deploying {deployProgress.current} / {deployProgress.total}...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Confirm & Deploy {selectedPipelines.length} Pipeline{selectedPipelines.length !== 1 ? 's' : ''}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Deployment Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent style={{ background: '#ffffff' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <Trash2 className="w-5 h-5" style={{ color: '#ef4444' }} />
              Delete Deployment
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#6b7280' }}>
              Are you sure you want to delete this deployment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeploymentToDelete(null);
              }}
              style={{ color: '#374151' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeployment}
              className="text-white"
              style={{ background: '#ef4444' }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Batch Confirmation Dialog */}
      <AlertDialog open={deleteBatchDialogOpen} onOpenChange={setDeleteBatchDialogOpen}>
        <AlertDialogContent style={{ background: '#ffffff' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: '#1f2937' }}>
              <Trash2 className="w-5 h-5" style={{ color: '#ef4444' }} />
              Delete Deployment Batch
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#6b7280' }}>
              Are you sure you want to delete this entire deployment batch? All deployments in this batch will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteBatchDialogOpen(false);
                setBatchToDelete(null);
              }}
              style={{ color: '#374151' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              className="text-white"
              style={{ background: '#ef4444' }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
