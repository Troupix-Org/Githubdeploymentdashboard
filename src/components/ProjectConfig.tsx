import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Plus, Trash2, AlertCircle, Loader2, Share2 } from 'lucide-react';
import { Project, Pipeline, Repository, saveProject } from '../lib/storage';
import { listWorkflows } from '../lib/github';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ImportExportDialog } from './ImportExportDialog';

interface ProjectConfigProps {
  project?: Project;
  onBack: () => void;
  onSaved: () => void;
}

export function ProjectConfig({ project, onBack, onSaved }: ProjectConfigProps) {
  const [name, setName] = useState(project?.name || '');
  const [repositories, setRepositories] = useState<Repository[]>(project?.repositories || []);
  const [pipelines, setPipelines] = useState<Pipeline[]>(project?.pipelines || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workflows, setWorkflows] = useState<{ [repoId: string]: any[] }>({});
  const [loadingWorkflows, setLoadingWorkflows] = useState<{ [repoId: string]: boolean }>({});
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setRepositories(project.repositories);
      setPipelines(project.pipelines);
    }
  }, [project]);

  const handleAddRepository = () => {
    setRepositories([
      ...repositories,
      {
        id: Date.now().toString(),
        name: '',
        owner: '',
        repo: '',
      },
    ]);
  };

  const handleRemoveRepository = (id: string) => {
    setRepositories(repositories.filter((r) => r.id !== id));
    // Remove pipelines associated with this repository
    setPipelines(pipelines.filter((p) => p.repositoryId !== id));
    // Remove workflows for this repository
    const newWorkflows = { ...workflows };
    delete newWorkflows[id];
    setWorkflows(newWorkflows);
  };

  const handleUpdateRepository = (id: string, field: keyof Repository, value: string) => {
    setRepositories(
      repositories.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleLoadWorkflows = async (repoId: string) => {
    const repo = repositories.find((r) => r.id === repoId);
    if (!repo || !repo.owner || !repo.repo) {
      setError('Please enter owner and repository name first');
      return;
    }

    setLoadingWorkflows({ ...loadingWorkflows, [repoId]: true });
    setError('');

    try {
      const data = await listWorkflows(repo.owner, repo.repo);
      setWorkflows({ ...workflows, [repoId]: data });
      if (data.length === 0) {
        setError('No workflows found in this repository');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoadingWorkflows({ ...loadingWorkflows, [repoId]: false });
    }
  };

  const handleAddPipeline = () => {
    setPipelines([
      ...pipelines,
      {
        id: Date.now().toString(),
        name: '',
        workflowFile: '',
        branch: 'main',
        repositoryId: repositories[0]?.id || '',
      },
    ]);
  };

  const handleRemovePipeline = (id: string) => {
    setPipelines(pipelines.filter((p) => p.id !== id));
  };

  const handleUpdatePipeline = (id: string, field: keyof Pipeline, value: string) => {
    setPipelines(
      pipelines.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleSave = async () => {
    if (!name) {
      setError('Please enter a project name');
      return;
    }

    if (repositories.length === 0) {
      setError('Please add at least one repository');
      return;
    }

    for (const repo of repositories) {
      if (!repo.name || !repo.owner || !repo.repo) {
        setError('Please fill in all repository fields');
        return;
      }
    }

    if (pipelines.length === 0) {
      setError('Please add at least one pipeline');
      return;
    }

    for (const pipeline of pipelines) {
      if (!pipeline.name || !pipeline.workflowFile || !pipeline.branch || !pipeline.repositoryId) {
        setError('Please fill in all pipeline fields');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const projectData: Project = {
        id: project?.id || Date.now().toString(),
        name,
        repositories,
        pipelines,
        createdAt: project?.createdAt || Date.now(),
      };

      await saveProject(projectData);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="hover:bg-purple-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" style={{ color: '#7c3aed' }} />
            <span style={{ color: '#7c3aed' }}>Back</span>
          </Button>
          <div>
            <h2 className="text-2xl" style={{ color: '#6b21a8' }}>
              {project ? 'Edit Project' : 'New Project'}
            </h2>
            <p style={{ color: '#7c3aed' }}>
              Configure your GitHub repositories and deployment pipelines
            </p>
          </div>
        </div>
        {project && (
          <Button
            onClick={() => setShowExportDialog(true)}
            variant="outline"
            className="border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50"
            style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
      </div>

      <Card className="border-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
        <CardHeader>
          <CardTitle style={{ color: '#6b21a8' }}>Project Details</CardTitle>
          <CardDescription style={{ color: '#7c3aed' }}>
            Basic information about your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-medium" style={{ color: '#6b21a8' }}>Project Name</Label>
            <Input
              id="name"
              placeholder="My App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-2"
              style={{ background: '#ffffff', color: '#1f2937', borderColor: '#c4b5fd' }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#6b21a8' }}>Repositories</CardTitle>
              <CardDescription style={{ color: '#7c3aed' }}>
                GitHub repositories associated with this project
              </CardDescription>
            </div>
            <Button
              onClick={handleAddRepository}
              size="sm"
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Repository
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {repositories.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#7c3aed' }}>
              No repositories configured. Click "Add Repository" to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repositories.map((repo) => (
                <Card
                  key={repo.id}
                  className="border-2"
                  style={{ background: 'linear-gradient(to bottom right, #ffffff, #faf5ff)', borderColor: '#c4b5fd' }}
                >
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="truncate font-semibold" style={{ color: '#6b21a8' }}>
                        {repo.name || 'Unnamed Repository'}
                      </h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveRepository(repo.id)}
                        className="hover:bg-red-50 h-6 w-6 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" style={{ color: '#ec4899' }} />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium" style={{ color: '#6b21a8' }}>Repository Name</Label>
                        <Input
                          placeholder="Frontend"
                          value={repo.name}
                          onChange={(e) =>
                            handleUpdateRepository(repo.id, 'name', e.target.value)
                          }
                          className="border h-8 text-xs"
                          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium" style={{ color: '#6b21a8' }}>Owner</Label>
                        <Input
                          placeholder="username or org"
                          value={repo.owner}
                          onChange={(e) =>
                            handleUpdateRepository(repo.id, 'owner', e.target.value)
                          }
                          className="border h-8 text-xs"
                          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium" style={{ color: '#6b21a8' }}>Repository</Label>
                        <Input
                          placeholder="my-repo"
                          value={repo.repo}
                          onChange={(e) =>
                            handleUpdateRepository(repo.id, 'repo', e.target.value)
                          }
                          className="border h-8 text-xs"
                          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleLoadWorkflows(repo.id)}
                      disabled={loadingWorkflows[repo.id] || !repo.owner || !repo.repo}
                      variant="outline"
                      size="sm"
                      className="border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 w-full h-8 text-xs"
                      style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
                    >
                      {loadingWorkflows[repo.id] ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load Workflows'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#6b21a8' }}>Pipelines</CardTitle>
              <CardDescription style={{ color: '#7c3aed' }}>
                Configure deployment pipelines. Add environment name (qa, staging, prod) to identify runs correctly.
              </CardDescription>
            </div>
            <Button
              onClick={handleAddPipeline}
              size="sm"
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
              disabled={repositories.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pipeline
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pipelines.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#7c3aed' }}>
              No pipelines configured. Click "Add Pipeline" to get started.
            </div>
          ) : (
            pipelines.map((pipeline) => (
              <Card
                key={pipeline.id}
                className="border-2"
                style={{ background: 'linear-gradient(to bottom right, #ffffff, #faf5ff)', borderColor: '#c4b5fd' }}
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label className="font-medium" style={{ color: '#6b21a8' }}>Repository</Label>
                        <Select
                          value={pipeline.repositoryId}
                          onValueChange={(value) =>
                            handleUpdatePipeline(pipeline.id, 'repositoryId', value)
                          }
                        >
                          <SelectTrigger
                            className="border"
                            style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                          >
                            <SelectValue placeholder="Select repository" />
                          </SelectTrigger>
                          <SelectContent
                            className="border-2"
                            style={{ background: '#ffffff', borderColor: '#e9d5ff' }}
                          >
                            {repositories.map((repo) => (
                              <SelectItem key={repo.id} value={repo.id}>
                                {repo.name || `${repo.owner}/${repo.repo}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium" style={{ color: '#6b21a8' }}>Pipeline Name</Label>
                        <Input
                          placeholder="Production Deploy"
                          value={pipeline.name}
                          onChange={(e) =>
                            handleUpdatePipeline(pipeline.id, 'name', e.target.value)
                          }
                          className="border"
                          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium" style={{ color: '#6b21a8' }}>Workflow File</Label>
                        {workflows[pipeline.repositoryId]?.length > 0 ? (
                          <Select
                            value={pipeline.workflowFile}
                            onValueChange={(value) =>
                              handleUpdatePipeline(pipeline.id, 'workflowFile', value)
                            }
                          >
                            <SelectTrigger
                              className="border"
                              style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                            >
                              <SelectValue placeholder="Select workflow" />
                            </SelectTrigger>
                            <SelectContent
                              className="border-2"
                              style={{ background: '#ffffff', borderColor: '#e9d5ff' }}
                            >
                              {workflows[pipeline.repositoryId].map((wf) => (
                                <SelectItem key={wf.id} value={wf.path.split('/').pop() || wf.path}>
                                  {wf.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="deploy.yml"
                            value={pipeline.workflowFile}
                            onChange={(e) =>
                              handleUpdatePipeline(pipeline.id, 'workflowFile', e.target.value)
                            }
                            className="border"
                            style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium" style={{ color: '#6b21a8' }}>Branch</Label>
                        <Input
                          placeholder="main"
                          value={pipeline.branch}
                          onChange={(e) =>
                            handleUpdatePipeline(pipeline.id, 'branch', e.target.value)
                          }
                          className="border"
                          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium" style={{ color: '#6b21a8' }}>
                          Environment
                          <span className="text-xs font-normal ml-1" style={{ color: '#9ca3af' }}>(optional)</span>
                        </Label>
                        <Input
                          placeholder="qa, staging, prod..."
                          value={pipeline.environment || ''}
                          onChange={(e) =>
                            handleUpdatePipeline(pipeline.id, 'environment', e.target.value)
                          }
                          className="border"
                          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#ddd6fe' }}
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemovePipeline(pipeline.id)}
                      className="hover:bg-red-50 mt-7"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#ec4899' }} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-2" style={{ background: 'linear-gradient(to right, #fef2f2, #fce7f3)', borderColor: '#fda4af' }}>
          <AlertCircle className="h-4 w-4" style={{ color: '#ec4899' }} />
          <AlertDescription style={{ color: '#be123c' }}>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-2 hover:bg-purple-50"
          style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
        >
          {loading ? 'Saving...' : 'Save Project'}
        </Button>
      </div>

      {project && (
        <ImportExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          project={project}
          onImportSuccess={onSaved}
        />
      )}
    </div>
  );
}
