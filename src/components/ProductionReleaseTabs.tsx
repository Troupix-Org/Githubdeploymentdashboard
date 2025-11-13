import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Plus, X, CheckCircle2, Loader2, Circle, XCircle, Rocket, RefreshCw, AlertCircle, Info, Star, FolderGit2, GitBranch, ChevronDown, ChevronUp, GitCommit, ExternalLink, Clock, FileText } from 'lucide-react';
import { 
  Project, 
  Deployment, 
  ProductionRelease,
  Repository,
  getProductionReleasesByProject,
  createProductionRelease,
  deleteProductionRelease,
  generateReleaseNumber,
  getDeploymentsByProject,
  saveProject,
  saveDeployment,
  saveProductionRelease,
} from '../lib/storage';
import { triggerWorkflow, getWorkflowInputs, WorkflowInput, findTriggeredWorkflowRun, listEnvironments, getLatestBuildsForBranch } from '../lib/github';
import { ProductionReleaseProcess } from './ProductionReleaseProcess';
import { DeploymentStatusSection } from './DeploymentStatusSection';
import { ReportGenerator } from './ReportGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface ProductionReleaseTabsProps {
  project: Project;
  deployments: Deployment[];
  onDeployToProduction: (releaseId: string) => void;
  onCreateRelease?: (repository: Repository) => void;
  onProjectUpdate?: (project: Project) => void;
}

export function ProductionReleaseTabs({ 
  project, 
  deployments: propDeployments,
  onDeployToProduction,
  onCreateRelease,
  onProjectUpdate
}: ProductionReleaseTabsProps) {
  const [releases, setReleases] = useState<ProductionRelease[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showNewReleaseDialog, setShowNewReleaseDialog] = useState(false);
  const [newReleaseNumber, setNewReleaseNumber] = useState('');
  const [useAutoNumber, setUseAutoNumber] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>(propDeployments);
  
  // Deploy Section states
  const [buildNumbers, setBuildNumbers] = useState<{ [pipelineId: string]: string }>({});
  const [loadingPipelines, setLoadingPipelines] = useState<{ [pipelineId: string]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [workflowInputs, setWorkflowInputs] = useState<{ [pipelineId: string]: WorkflowInput[] }>({});
  const [inputValues, setInputValues] = useState<{ [pipelineId: string]: Record<string, any> }>({});
  const [deployOpen, setDeployOpen] = useState(true);
  const [environments, setEnvironments] = useState<{ [repositoryId: string]: string[] }>({});
  
  // Build history states
  type BuildInfo = {
    commit: { sha: string; message: string; author: string; date: string } | null;
    buildNumber: string | null;
    status: string | null;
    conclusion: string | null;
    url: string | null;
    createdAt: string | null;
    loading: boolean;
  };
  type BuildHistoryItem = {
    buildNumber: string;
    commit: { sha: string; message: string; author: string; date: string };
    status: string;
    conclusion: string | null;
    url: string;
    createdAt: string;
  };
  const [latestBuilds, setLatestBuilds] = useState<{ [pipelineId: string]: BuildInfo & { history?: BuildHistoryItem[] } }>({});
  const [showBuildHistory, setShowBuildHistory] = useState<{ [pipelineId: string]: boolean }>({});
  
  // Prepare Inputs Dialog
  const [showPrepareInputsDialog, setShowPrepareInputsDialog] = useState(false);
  const [preparedInputs, setPreparedInputs] = useState<{ [pipelineId: string]: Record<string, any> }>({});
  
  // Report Generator Dialog
  const [showReportDialog, setShowReportDialog] = useState(false);

  useEffect(() => {
    loadReleases();
    loadDeployments();
    loadWorkflowInputs();
    loadLatestBuilds();
  }, [project.id]);

  useEffect(() => {
    setDeployments(propDeployments);
  }, [propDeployments]);

  useEffect(() => {
    // Auto-generate suggested release number when dialog opens
    if (showNewReleaseDialog) {
      const suggested = generateReleaseNumber(project.id);
      setNewReleaseNumber(suggested);
      setUseAutoNumber(true);
    }
  }, [showNewReleaseDialog, project.id]);

  // Load prepared inputs when active tab changes
  useEffect(() => {
    const currentRelease = releases.find(r => r.id === activeTab);
    if (currentRelease?.preparedInputs) {
      // Load prepared inputs into inputValues
      const updatedInputValues = { ...inputValues };
      const updatedBuildNumbers = { ...buildNumbers };
      
      Object.entries(currentRelease.preparedInputs).forEach(([pipelineId, inputs]) => {
        updatedInputValues[pipelineId] = {
          ...updatedInputValues[pipelineId],
          ...inputs,
        };
        
        // Also update build numbers state if present
        if (inputs.build_number) {
          updatedBuildNumbers[pipelineId] = inputs.build_number;
        }
      });
      
      setInputValues(updatedInputValues);
      setBuildNumbers(updatedBuildNumbers);
      setPreparedInputs(currentRelease.preparedInputs);
    }
  }, [activeTab, releases]);

  const loadReleases = () => {
    const projectReleases = getProductionReleasesByProject(project.id);
    // Sort by creation date, newest first
    const sorted = projectReleases.sort((a, b) => b.createdAt - a.createdAt);
    setReleases(sorted);

    // Set active tab to the most recent in-progress or draft release, or the first one
    if (sorted.length > 0) {
      const activeRelease = sorted.find(r => r.status === 'in_progress' || r.status === 'draft') || sorted[0];
      setActiveTab(activeRelease.id);
    }
  };

  const loadDeployments = () => {
    const data = getDeploymentsByProject(project.id);
    setDeployments(data.sort((a, b) => b.startedAt - a.startedAt));
  };

  const loadWorkflowInputs = async () => {
    // First, load environments for all repositories
    const loadedEnvironments: { [repositoryId: string]: string[] } = {};
    for (const repository of project.repositories) {
      try {
        const envs = await listEnvironments(repository.owner, repository.repo);
        loadedEnvironments[repository.id] = envs.map(env => env.name);
      } catch (err) {
        console.error(`Failed to load environments for ${repository.owner}/${repository.repo}:`, err);
        loadedEnvironments[repository.id] = [];
      }
    }
    setEnvironments(loadedEnvironments);

    // Then load workflow inputs for each pipeline
    for (const pipeline of project.pipelines) {
      const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
      if (!repository) continue;

      try {
        const inputs = await getWorkflowInputs(
          repository.owner,
          repository.repo,
          pipeline.workflowFile
        );
        
        // For environment type inputs, add available environments as options
        const enrichedInputs = inputs.map(input => {
          if (input.type === 'environment' && !input.options) {
            return {
              ...input,
              options: loadedEnvironments[repository.id] || [],
            };
          }
          return input;
        });
        
        setWorkflowInputs(prev => ({
          ...prev,
          [pipeline.id]: enrichedInputs,
        }));

        // Initialize input values with defaults
        const defaultValues: Record<string, any> = {};
        enrichedInputs.forEach(input => {
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

  const handleSaveDefaultValue = async (pipelineId: string, inputName: string, value: any) => {
    const pipelineIndex = project.pipelines.findIndex(p => p.id === pipelineId);
    if (pipelineIndex === -1) return;

    const updatedPipeline = {
      ...project.pipelines[pipelineIndex],
      defaultInputValues: {
        ...project.pipelines[pipelineIndex].defaultInputValues,
        [inputName]: value,
      },
    };

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
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }
      setSuccess(`Default value saved for ${inputName}`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to save default value');
    }
  };

  const handleDeploy = async (pipelineId: string, releaseId: string) => {
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

    const buildNumber = inputValues[pipelineId]?.build_number || buildNumbers[pipelineId];
    
    // Only validate build_number if the workflow defines it as an input
    const allInputs = workflowInputs[pipelineId] || [];
    const buildNumberInput = allInputs.find(input => input.name === 'build_number');
    
    if (buildNumberInput && !buildNumber) {
      setError(`Please enter a build number for ${pipeline.name}`);
      return;
    }

    setLoadingPipelines(prev => ({ ...prev, [pipelineId]: true }));
    setError('');
    setSuccess('');

    const batchId = `batch-${Date.now()}`;

    try {
      const workflowParams: Record<string, string> = {};
      
      const allInputs = inputValues[pipeline.id] || {};
      for (const [key, value] of Object.entries(allInputs)) {
        if (value !== undefined && value !== null && value !== '') {
          workflowParams[key] = String(value);
        }
      }
      
      if (!workflowParams.build_number) {
        workflowParams.build_number = buildNumber;
      }

      await triggerWorkflow(
        repository.owner,
        repository.repo,
        pipeline.workflowFile,
        pipeline.branch,
        workflowParams
      );

      setSuccess(`Workflow triggered for ${pipeline.name}. Locating workflow run...`);

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
        productionReleaseId: releaseId,
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

  const handleCreateNewRelease = () => {
    const releaseNumber = useAutoNumber ? newReleaseNumber : newReleaseNumber.trim();
    
    if (!releaseNumber) {
      alert('Please enter a release number');
      return;
    }

    // Check if release number already exists
    const exists = releases.some(r => r.releaseNumber === releaseNumber);
    if (exists) {
      alert('A release with this number already exists. Please use a different number.');
      return;
    }

    const newRelease = createProductionRelease(project.id, releaseNumber);
    setReleases([newRelease, ...releases]);
    setActiveTab(newRelease.id);
    setShowNewReleaseDialog(false);
  };

  const handleDeleteRelease = () => {
    if (releaseToDelete) {
      deleteProductionRelease(releaseToDelete);
      const updatedReleases = releases.filter(r => r.id !== releaseToDelete);
      setReleases(updatedReleases);
      
      // If we deleted the active tab, switch to another one
      if (activeTab === releaseToDelete && updatedReleases.length > 0) {
        setActiveTab(updatedReleases[0].id);
      }
      
      setShowDeleteDialog(false);
      setReleaseToDelete(null);
    }
  };

  const confirmDeleteRelease = (releaseId: string) => {
    setReleaseToDelete(releaseId);
    setShowDeleteDialog(true);
  };

  const getStatusIcon = (status: ProductionRelease['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3" style={{ color: '#10b981' }} />;
      case 'in_progress':
        return <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#2563eb' }} />;
      case 'cancelled':
        return <XCircle className="w-3 h-3" style={{ color: '#ef4444' }} />;
      default:
        return <Circle className="w-3 h-3" style={{ color: '#9ca3af' }} />;
    }
  };

  const getStatusBadge = (status: ProductionRelease['status']) => {
    const styles = {
      completed: { background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' },
      in_progress: { background: '#dbeafe', color: '#1e40af', border: '1px solid #2563eb' },
      cancelled: { background: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' },
      draft: { background: '#f3f4f6', color: '#374151', border: '1px solid #9ca3af' },
    };

    return (
      <Badge variant="outline" style={styles[status]} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Build history functions
  const loadLatestBuilds = async () => {
    const buildsData: { [pipelineId: string]: BuildInfo & { history?: BuildHistoryItem[] } } = {};
    
    for (const pipeline of project.pipelines) {
      const repository = project.repositories.find(r => r.id === pipeline.repositoryId);
      if (!repository) continue;

      buildsData[pipeline.id] = { commit: null, buildNumber: null, status: null, conclusion: null, url: null, createdAt: null, loading: true };

      try {
        const builds = await getLatestBuildsForBranch(
          repository.owner,
          repository.repo,
          pipeline.workflowFile,
          pipeline.branch,
          5
        );

        if (builds.length > 0) {
          const latestBuild = builds[0];
          
          // Create history array with all builds
          const history: BuildHistoryItem[] = builds
            .filter(build => build.commit)
            .map(build => ({
              buildNumber: build.buildNumber || 'N/A',
              commit: build.commit!,
              status: build.status || 'unknown',
              conclusion: build.conclusion || null,
              url: build.url || '',
              createdAt: build.createdAt || new Date().toISOString(),
            }));

          buildsData[pipeline.id] = {
            commit: latestBuild.commit || null,
            buildNumber: latestBuild.buildNumber || null,
            status: latestBuild.status || null,
            conclusion: latestBuild.conclusion || null,
            url: latestBuild.url || null,
            createdAt: latestBuild.createdAt || null,
            loading: false,
            history,
          };
        } else {
          buildsData[pipeline.id] = { commit: null, buildNumber: null, status: null, conclusion: null, url: null, createdAt: null, loading: false };
        }
      } catch (err) {
        console.error(`Failed to load builds for ${pipeline.name}:`, err);
        buildsData[pipeline.id] = { commit: null, buildNumber: null, status: null, conclusion: null, url: null, createdAt: null, loading: false };
      }
    }

    setLatestBuilds(buildsData);
  };

  const handleUseBuild = (pipelineId: string, buildNumber: string) => {
    setInputValues(prev => ({
      ...prev,
      [pipelineId]: {
        ...prev[pipelineId],
        build_number: buildNumber,
      },
    }));
    setBuildNumbers(prev => ({ ...prev, [pipelineId]: buildNumber }));
  };

  const handleOpenPrepareInputsDialog = () => {
    const currentRelease = releases.find(r => r.id === activeTab);
    
    // Initialize with smart defaults: prepared > current > favorite > empty
    const initialInputs: { [pipelineId: string]: Record<string, any> } = {};
    
    project.pipelines.forEach(pipeline => {
      const inputs: Record<string, any> = {};
      const pipelineInputs = workflowInputs[pipeline.id] || [];
      
      pipelineInputs.forEach(input => {
        // Priority 1: Already prepared value
        if (currentRelease?.preparedInputs?.[pipeline.id]?.[input.name] !== undefined) {
          inputs[input.name] = currentRelease.preparedInputs[pipeline.id][input.name];
        }
        // Priority 2: Current input value (if user already entered something)
        else if (inputValues[pipeline.id]?.[input.name] !== undefined && inputValues[pipeline.id][input.name] !== '') {
          inputs[input.name] = inputValues[pipeline.id][input.name];
        }
        // Priority 3: Favorite/default value
        else if (pipeline.defaultInputValues?.[input.name] !== undefined) {
          inputs[input.name] = pipeline.defaultInputValues[input.name];
        }
        // Priority 4: Empty (will use placeholder or default from workflow)
        else {
          inputs[input.name] = input.type === 'boolean' ? false : '';
        }
      });
      
      initialInputs[pipeline.id] = inputs;
    });
    
    setPreparedInputs(initialInputs);
    setShowPrepareInputsDialog(true);
  };

  const handleSavePreparedInputs = () => {
    const currentRelease = releases.find(r => r.id === activeTab);
    if (!currentRelease) return;

    // Update the release with prepared inputs
    const updatedRelease: ProductionRelease = {
      ...currentRelease,
      preparedInputs: preparedInputs,
    };

    // Save to storage
    saveProductionRelease(updatedRelease);
    loadReleases();
    
    // Also update current input values
    const updatedInputValues = { ...inputValues };
    const updatedBuildNumbers = { ...buildNumbers };
    
    Object.entries(preparedInputs).forEach(([pipelineId, inputs]) => {
      updatedInputValues[pipelineId] = {
        ...updatedInputValues[pipelineId],
        ...inputs,
      };
      
      // Update build numbers state if present
      if (inputs.build_number) {
        updatedBuildNumbers[pipelineId] = inputs.build_number;
      }
    });
    
    setInputValues(updatedInputValues);
    setBuildNumbers(updatedBuildNumbers);
    
    setShowPrepareInputsDialog(false);
    setSuccess('Workflow inputs prepared and saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getQAStatusIcon = (status: string | null, conclusion: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') {
        return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
      } else if (conclusion === 'failure') {
        return <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />;
      }
    } else if (status === 'in_progress' || status === 'queued') {
      return <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#2563eb' }} />;
    }
    return <Circle className="w-4 h-4" style={{ color: '#9ca3af' }} />;
  };

  // If no releases exist, show a prompt to create the first one
  if (releases.length === 0) {
    return (
      <>
        <div className="border-2 border-dashed rounded-lg p-12 text-center" style={{ borderColor: '#475569', background: 'rgba(51, 65, 85, 0.2)' }}>
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' }}>
            <Plus className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl mb-2" style={{ color: '#e9d5ff' }}>
            No Production Releases Yet
          </h3>
          <p className="mb-6" style={{ color: '#cbd5e1' }}>
            Create your first production release to start managing your deployment process
          </p>
          <Button
            onClick={() => setShowNewReleaseDialog(true)}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Release
          </Button>
        </div>

        <Dialog open={showNewReleaseDialog} onOpenChange={setShowNewReleaseDialog}>
          <DialogContent className="sm:max-w-[500px]" style={{ background: '#1e293b', borderColor: '#475569' }}>
            <DialogHeader>
              <DialogTitle style={{ color: '#e9d5ff' }}>Create New Production Release</DialogTitle>
              <DialogDescription style={{ color: '#cbd5e1' }}>
                Start a new production release process with a global release number.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="release-number" style={{ color: '#e9d5ff' }}>
                  Release Number
                </Label>
                <Input
                  id="release-number"
                  value={newReleaseNumber}
                  onChange={(e) => {
                    setNewReleaseNumber(e.target.value);
                    setUseAutoNumber(false);
                  }}
                  placeholder="e.g., 2025.10.1"
                  className="bg-slate-700 border-slate-600"
                  style={{ color: '#e9d5ff' }}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-number"
                    checked={useAutoNumber}
                    onCheckedChange={(checked) => {
                      setUseAutoNumber(checked === true);
                      if (checked) {
                        setNewReleaseNumber(generateReleaseNumber(project.id));
                      }
                    }}
                  />
                  <label
                    htmlFor="auto-number"
                    className="text-sm cursor-pointer"
                    style={{ color: '#cbd5e1' }}
                  >
                    Use auto-generated number (YYYY.MM.sequence)
                  </label>
                </div>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(147, 197, 253, 0.1)', border: '1px solid #3b82f6' }}>
                <p className="text-sm" style={{ color: '#93c5fd' }}>
                  <strong>Tip:</strong> Release numbers follow the format YYYY.MM.X where X is an auto-incremented number for each release in the month.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewReleaseDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewRelease}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Release
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            {releases.map((release) => (
              <TabsTrigger
                key={release.id}
                value={release.id}
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white relative group"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(release.status)}
                  <span>{release.releaseNumber}</span>
                </div>
                {releases.length > 1 && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDeleteRelease(release.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        confirmDeleteRelease(release.id);
                      }
                    }}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    aria-label="Delete release"
                  >
                    <X className="w-3 h-3" />
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <Button
            onClick={() => setShowNewReleaseDialog(true)}
            size="sm"
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Release
          </Button>
        </div>

        {releases.map((release) => (
          <TabsContent key={release.id} value={release.id} className="mt-0">
            <div className="mb-4 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg" style={{ color: '#e9d5ff' }}>
                  Release {release.releaseNumber}
                </h3>
                {getStatusBadge(release.status)}
                <span className="text-sm" style={{ color: '#94a3b8' }}>
                  • Created {new Date(release.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {/* Generate Report Button - Only show when release is completed */}
              {release.buildVersionsUpdated && (
                <Button
                  onClick={() => setShowReportDialog(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  style={{ borderColor: '#a78bfa', color: '#a78bfa' }}
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {/* 1. Production Release Process */}
              <ProductionReleaseProcess
                project={project}
                deployments={deployments}
                currentRelease={release}
                onDeployToProduction={() => onDeployToProduction(release.id)}
                onCreateRelease={onCreateRelease}
                onReleaseUpdated={loadReleases}
              />

              {/* 2. Deploy Section */}
              <Collapsible open={deployOpen} onOpenChange={setDeployOpen}>
                <Card id="deploy-section" className="border-[#e5e7eb]" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)' }}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex-1 text-left">
                          <div className="flex items-start justify-between w-full">
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <Rocket className="w-5 h-5" style={{ color: '#7c3aed' }} />
                                <CardTitle style={{ color: '#6b21a8' }}>Deploy</CardTitle>
                                {deployOpen ? <ChevronUp className="w-4 h-4" style={{ color: '#7c3aed' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#7c3aed' }} />}
                              </div>
                              <CardDescription style={{ color: '#6b7280' }}>
                                Trigger a new deployment for this release
                                {release.preparedInputs && Object.keys(release.preparedInputs).length > 0 && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {Object.keys(release.preparedInputs).length}/{project.pipelines.length} pipelines configured
                                  </span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenPrepareInputsDialog}
                        className="flex-shrink-0"
                        style={{ borderColor: '#c084fc', color: '#7c3aed' }}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        {release.preparedInputs && Object.keys(release.preparedInputs).length > 0 
                          ? 'Update Inputs' 
                          : 'Prepare Inputs'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {/* Prepared Inputs Info */}
                      {release.preparedInputs && Object.keys(release.preparedInputs).length > 0 && (
                        <Alert className="border-2" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                          <CheckCircle2 className="h-4 w-4" style={{ color: '#16a34a' }} />
                          <AlertDescription style={{ color: '#166534' }}>
                            <strong>Inputs Ready:</strong> {Object.keys(release.preparedInputs).length} pipeline{Object.keys(release.preparedInputs).length > 1 ? 's have' : ' has'} pre-configured inputs. 
                            You can modify them below before deploying.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* Pipeline Rows */}
                      {project.pipelines.map(pipeline => {
                        const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
                        const allInputs = workflowInputs[pipeline.id] || [];
                        
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
                                  {release.preparedInputs?.[pipeline.id] && Object.keys(release.preparedInputs[pipeline.id]).length > 0 && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs px-1.5 py-0" 
                                      style={{ background: '#dcfce7', color: '#16a34a', borderColor: '#86efac' }}
                                      title={`${Object.keys(release.preparedInputs[pipeline.id]).length} input(s) pre-configured`}
                                    >
                                      <Star className="w-3 h-3 mr-0.5" fill="#16a34a" />
                                      {Object.keys(release.preparedInputs[pipeline.id]).length}
                                    </Badge>
                                  )}
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
                              
                              {/* Latest Build Badge */}
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
                                      onClick={() => handleUseBuild(pipeline.id, latestBuilds[pipeline.id]?.buildNumber || '')}
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
                                    {latestBuilds[pipeline.id]?.history && latestBuilds[pipeline.id]?.history!.length > 1 && (
                                      <button
                                        type="button"
                                        className="text-xs hover:underline transition-all flex items-center gap-1"
                                        style={{ color: '#9ca3af' }}
                                        onClick={() => setShowBuildHistory(prev => ({
                                          ...prev,
                                          [pipeline.id]: !prev[pipeline.id]
                                        }))}
                                      >
                                        {showBuildHistory[pipeline.id] ? (
                                          <>
                                            <ChevronUp className="w-3 h-3" />
                                            <span>Hide</span>
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-3 h-3" />
                                            <span>Show {latestBuilds[pipeline.id]?.history!.length - 1} more</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </>
                                ) : null}
                              </div>
                            </div>

                            {/* Last 5 Builds Dropdown */}
                            {showBuildHistory[pipeline.id] && latestBuilds[pipeline.id]?.history && latestBuilds[pipeline.id]?.history!.length > 1 && (
                              <div className="mt-2 p-2 rounded-md border space-y-1.5" style={{ background: '#fafaf9', borderColor: '#e9d5ff' }}>
                                <div className="text-xs font-semibold mb-1.5" style={{ color: '#6b21a8' }}>
                                  Last {latestBuilds[pipeline.id]?.history!.length} builds from {pipeline.branch}
                                </div>
                                {latestBuilds[pipeline.id]?.history!.slice(0, 5).map((build, index) => {
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
                                        handleUseBuild(pipeline.id, build.buildNumber);
                                        setShowBuildHistory(prev => ({ ...prev, [pipeline.id]: false }));
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

                            {/* Workflow Inputs */}
                            {allInputs.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                  {allInputs.map(input => {
                                    const value = input.name === 'build_number' 
                                      ? (inputValues[pipeline.id]?.[input.name] || buildNumbers[pipeline.id] || '')
                                      : (inputValues[pipeline.id]?.[input.name] || '');
                                    
                                    return (
                                      <div key={input.name} className="space-y-0.5">
                                        <Label htmlFor={`input-${release.id}-${pipeline.id}-${input.name}`} className="text-xs font-medium flex items-center gap-1" style={{ color: '#6b21a8' }}>
                                          {input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          {input.required && <span style={{ color: '#ec4899' }}> *</span>}
                                          {release.preparedInputs?.[pipeline.id]?.[input.name] !== undefined && (
                                            <Star className="w-3 h-3" style={{ color: '#fbbf24' }} fill="#fbbf24" title="Pre-configured value" />
                                          )}
                                        </Label>
                                        {input.type === 'boolean' ? (
                                          <div className="flex items-center space-x-2 h-8 px-3 border border-[#d1d5db] rounded-md" style={{ background: '#ffffff' }}>
                                            <Checkbox
                                              id={`input-${release.id}-${pipeline.id}-${input.name}`}
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
                                            <Label htmlFor={`input-${release.id}-${pipeline.id}-${input.name}`} className="cursor-pointer text-xs" style={{ color: '#6b7280' }}>
                                              {input.description || 'Enable'}
                                            </Label>
                                          </div>
                                        ) : (input.type === 'choice' || input.type === 'environment') && input.options && input.options.length > 0 ? (
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
                                              id={`input-${release.id}-${pipeline.id}-${input.name}`}
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
                                            id={`input-${release.id}-${pipeline.id}-${input.name}`}
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
                                            onKeyDown={(e) => e.key === 'Enter' && handleDeploy(pipeline.id, release.id)}
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
                                    onClick={() => handleDeploy(pipeline.id, release.id)}
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
                              After triggering deployments, the system waits 3 seconds before identifying workflow runs. Deployments will be tracked in the Deployment Status section below.
                            </span>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* 3. Deployment Status Section */}
              <DeploymentStatusSection
                project={project}
                deployments={deployments}
                releaseId={release.id}
                isOpen={true}
                onDeploymentsUpdated={loadDeployments}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* New Release Dialog */}
      <Dialog open={showNewReleaseDialog} onOpenChange={setShowNewReleaseDialog}>
        <DialogContent className="sm:max-w-[500px]" style={{ background: '#1e293b', borderColor: '#475569' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#e9d5ff' }}>Create New Production Release</DialogTitle>
            <DialogDescription style={{ color: '#cbd5e1' }}>
              Start a new production release process with a global release number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="release-number" style={{ color: '#e9d5ff' }}>
                Release Number
              </Label>
              <Input
                id="release-number"
                value={newReleaseNumber}
                onChange={(e) => {
                  setNewReleaseNumber(e.target.value);
                  setUseAutoNumber(false);
                }}
                placeholder="e.g., 2025.10.1"
                className="bg-slate-700 border-slate-600"
                style={{ color: '#e9d5ff' }}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-number"
                  checked={useAutoNumber}
                  onCheckedChange={(checked) => {
                    setUseAutoNumber(checked === true);
                    if (checked) {
                      setNewReleaseNumber(generateReleaseNumber(project.id));
                    }
                  }}
                />
                <label
                  htmlFor="auto-number"
                  className="text-sm cursor-pointer"
                  style={{ color: '#cbd5e1' }}
                >
                  Use auto-generated number (YYYY.MM.sequence)
                </label>
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(147, 197, 253, 0.1)', border: '1px solid #3b82f6' }}>
              <p className="text-sm" style={{ color: '#93c5fd' }}>
                <strong>Tip:</strong> Release numbers follow the format YYYY.MM.X where X is an auto-incremented number for each release in the month.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReleaseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewRelease}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent style={{ background: '#1e293b', borderColor: '#475569' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#e9d5ff' }}>Delete Production Release?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#cbd5e1' }}>
              This will permanently delete this production release and all its associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRelease}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prepare Inputs Dialog */}
      <Dialog open={showPrepareInputsDialog} onOpenChange={setShowPrepareInputsDialog}>
        <DialogContent className="sm:max-w-[700px]" style={{ background: '#1e293b', borderColor: '#475569' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#e9d5ff' }}>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5" style={{ color: '#fbbf24' }} />
                Prepare Workflow Inputs
              </div>
            </DialogTitle>
            <DialogDescription style={{ color: '#cbd5e1' }}>
              Pre-configure all workflow inputs for each pipeline. These will be saved and automatically populated when you return to this release.
            </DialogDescription>
          </DialogHeader>
          
          {/* Favorite Values Info */}
          {(() => {
            const favoriteCount = project.pipelines.reduce((count, pipeline) => {
              return count + (pipeline.defaultInputValues ? Object.keys(pipeline.defaultInputValues).length : 0);
            }, 0);
            
            return favoriteCount > 0 ? (
              <div className="mx-6 mb-2 rounded-lg p-3 border" style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: '#fbbf24' }}>
                <div className="flex items-start gap-2">
                  <Star className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} fill="#fbbf24" />
                  <p className="text-sm" style={{ color: '#fcd34d' }}>
                    <strong>{favoriteCount} favorite value{favoriteCount > 1 ? 's' : ''}</strong> automatically loaded from your saved preferences.
                  </p>
                </div>
              </div>
            ) : null;
          })()}
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {project.pipelines.map(pipeline => {
              const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
              const latestBuild = latestBuilds[pipeline.id];
              const allInputs = workflowInputs[pipeline.id] || [];
              
              return (
                <div key={pipeline.id} className="space-y-3 p-4 rounded-lg border-2" style={{ borderColor: '#475569', background: '#0f172a' }}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4" style={{ color: '#a78bfa' }} />
                        <Label style={{ color: '#e9d5ff' }} className="font-semibold">
                          {pipeline.name}
                        </Label>
                      </div>
                      {repo && (
                        <div className="text-xs" style={{ color: '#94a3b8' }}>
                          {repo.owner}/{repo.repo} • {pipeline.branch} {pipeline.environment && `• ${pipeline.environment}`}
                        </div>
                      )}
                    </div>
                    {latestBuild && latestBuild.buildNumber && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreparedInputs(prev => ({ 
                          ...prev, 
                          [pipeline.id]: { 
                            ...prev[pipeline.id], 
                            build_number: latestBuild.buildNumber || '' 
                          } 
                        }))}
                        className="flex-shrink-0"
                        style={{ borderColor: '#475569', color: '#cbd5e1' }}
                        title={`Use latest build: ${latestBuild.buildNumber}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Use Latest Build
                      </Button>
                    )}
                  </div>
                  
                  {allInputs.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {allInputs.map(input => {
                        const currentValue = preparedInputs[pipeline.id]?.[input.name];
                        const isFavorite = pipeline.defaultInputValues?.[input.name] !== undefined;
                        
                        return (
                          <div key={input.name} className="space-y-1">
                            <Label className="text-xs flex items-center gap-1" style={{ color: '#cbd5e1' }}>
                              {input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {input.required && <span style={{ color: '#fca5a5' }}> *</span>}
                              {isFavorite && (
                                <Star 
                                  className="w-3 h-3" 
                                  style={{ color: '#fbbf24' }} 
                                  fill="#fbbf24" 
                                  title="This input has a saved favorite value"
                                />
                              )}
                            </Label>
                            
                            {input.type === 'boolean' ? (
                              <div className="flex items-center space-x-2 h-9 px-3 border rounded-md" style={{ background: '#1e293b', borderColor: '#475569' }}>
                                <Checkbox
                                  checked={currentValue === true}
                                  onCheckedChange={(checked) => {
                                    setPreparedInputs(prev => ({
                                      ...prev,
                                      [pipeline.id]: {
                                        ...prev[pipeline.id],
                                        [input.name]: checked,
                                      },
                                    }));
                                  }}
                                />
                                <Label className="cursor-pointer text-xs" style={{ color: '#94a3b8' }}>
                                  {input.description || 'Enable'}
                                </Label>
                              </div>
                            ) : (input.type === 'choice' || input.type === 'environment') && input.options && input.options.length > 0 ? (
                              <Select
                                value={currentValue || ''}
                                onValueChange={(val) => {
                                  setPreparedInputs(prev => ({
                                    ...prev,
                                    [pipeline.id]: {
                                      ...prev[pipeline.id],
                                      [input.name]: val,
                                    },
                                  }));
                                }}
                              >
                                <SelectTrigger
                                  className="h-9 text-xs"
                                  style={{ background: '#1e293b', borderColor: '#475569', color: '#e9d5ff' }}
                                >
                                  <SelectValue placeholder={input.description || `Select ${input.name}`} />
                                </SelectTrigger>
                                <SelectContent style={{ background: '#1e293b', borderColor: '#475569' }}>
                                  {input.options.map(option => (
                                    <SelectItem key={option} value={option} style={{ color: '#e9d5ff' }}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={input.type === 'number' ? 'number' : 'text'}
                                placeholder={input.default ? String(input.default) : input.description || ''}
                                value={currentValue || ''}
                                onChange={(e) => {
                                  const val = input.type === 'number' ? parseFloat(e.target.value) : e.target.value;
                                  setPreparedInputs(prev => ({
                                    ...prev,
                                    [pipeline.id]: {
                                      ...prev[pipeline.id],
                                      [input.name]: val,
                                    },
                                  }));
                                }}
                                className="h-9 text-xs"
                                style={{ background: '#1e293b', borderColor: '#475569', color: '#e9d5ff' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-center py-4" style={{ color: '#94a3b8' }}>
                      No workflow inputs detected for this pipeline
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="rounded-lg p-3 border" style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: '#fbbf24' }}>
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
              <p className="text-sm" style={{ color: '#fcd34d' }}>
                <strong>Tip:</strong> All workflow inputs will be saved and automatically loaded when you come back to this release. You can modify them at any time before deploying.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrepareInputsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePreparedInputs}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save All Inputs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Generator Dialog */}
      {activeTab && (() => {
        const currentRelease = releases.find(r => r.id === activeTab);
        return currentRelease ? (
          <ReportGenerator
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            release={currentRelease}
            project={project}
          />
        ) : null;
      })()}
    </>
  );
}
