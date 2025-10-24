import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Plus, X, CheckCircle2, Loader2, Circle, XCircle, Rocket, RefreshCw, AlertCircle, Info, Star, FolderGit2, GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
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
} from '../lib/storage';
import { triggerWorkflow, getWorkflowInputs, WorkflowInput, findTriggeredWorkflowRun } from '../lib/github';
import { ProductionReleaseProcess } from './ProductionReleaseProcess';
import { DeploymentStatusSection } from './DeploymentStatusSection';
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
  onCreateRelease: (repository: Repository) => void;
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
  const [globalReleaseNumber, setGlobalReleaseNumber] = useState('');
  const [workflowInputs, setWorkflowInputs] = useState<{ [pipelineId: string]: WorkflowInput[] }>({});
  const [inputValues, setInputValues] = useState<{ [pipelineId: string]: Record<string, any> }>({});
  const [deployOpen, setDeployOpen] = useState(true);

  useEffect(() => {
    loadReleases();
    loadDeployments();
    loadWorkflowInputs();
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
          if (pipeline.defaultInputValues && pipeline.defaultInputValues[input.name] !== undefined) {
            defaultValues[input.name] = pipeline.defaultInputValues[input.name];
          } else if (input.default !== undefined) {
            defaultValues[input.default] = input.default;
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
    if (!buildNumber) {
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
        globalReleaseNumber: globalReleaseNumber || undefined,
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
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg" style={{ color: '#e9d5ff' }}>
                Release {release.releaseNumber}
              </h3>
              {getStatusBadge(release.status)}
              <span className="text-sm" style={{ color: '#94a3b8' }}>
                • Created {new Date(release.createdAt).toLocaleDateString()}
              </span>
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
                              Trigger a new deployment for this release
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
                        <Label htmlFor={`global-release-${release.id}`} style={{ color: '#6b21a8' }} className="flex items-center gap-2 font-semibold">
                          <span>Global Release Number (Optional)</span>
                          <Badge variant="outline" className="text-xs" style={{ color: '#7c3aed', background: '#ffffff', borderColor: '#a78bfa' }}>
                            Applies to all deployments
                          </Badge>
                        </Label>
                        <Input
                          id={`global-release-${release.id}`}
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
                                        <Label htmlFor={`input-${release.id}-${pipeline.id}-${input.name}`} className="text-xs font-medium" style={{ color: '#6b21a8' }}>
                                          {input.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          {input.required && <span style={{ color: '#ec4899' }}> *</span>}
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
    </>
  );
}
