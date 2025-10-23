import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Plus, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { Project, Pipeline, Repository, saveProject } from '../lib/storage';
import { listWorkflows } from '../lib/github';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="hover:bg-[#f3f4f6]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl" style={{ color: '#1f2937' }}>
            {project ? 'Edit Project' : 'New Project'}
          </h2>
          <p style={{ color: '#6b7280' }}>
            Configure your GitHub repositories and deployment pipelines
          </p>
        </div>
      </div>

      <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader>
          <CardTitle style={{ color: '#1f2937' }}>Project Details</CardTitle>
          <CardDescription style={{ color: '#6b7280' }}>
            Basic information about your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" style={{ color: '#374151' }}>Project Name</Label>
            <Input
              id="name"
              placeholder="My App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[#d1d5db]"
              style={{ background: '#f9fafb', color: '#1f2937' }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#1f2937' }}>Repositories</CardTitle>
              <CardDescription style={{ color: '#6b7280' }}>
                GitHub repositories associated with this project
              </CardDescription>
            </div>
            <Button
              onClick={handleAddRepository}
              size="sm"
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Repository
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {repositories.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#6b7280' }}>
              No repositories configured. Click "Add Repository" to get started.
            </div>
          ) : (
            repositories.map((repo) => (
              <Card
                key={repo.id}
                className="border-[#e5e7eb]"
                style={{ background: '#f9fafb' }}
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label style={{ color: '#374151' }}>Repository Name</Label>
                        <Input
                          placeholder="Frontend"
                          value={repo.name}
                          onChange={(e) =>
                            handleUpdateRepository(repo.id, 'name', e.target.value)
                          }
                          className="border-[#d1d5db]"
                          style={{ background: '#ffffff', color: '#1f2937' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: '#374151' }}>Owner</Label>
                        <Input
                          placeholder="username or org"
                          value={repo.owner}
                          onChange={(e) =>
                            handleUpdateRepository(repo.id, 'owner', e.target.value)
                          }
                          className="border-[#d1d5db]"
                          style={{ background: '#ffffff', color: '#1f2937' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: '#374151' }}>Repository</Label>
                        <Input
                          placeholder="my-repo"
                          value={repo.repo}
                          onChange={(e) =>
                            handleUpdateRepository(repo.id, 'repo', e.target.value)
                          }
                          className="border-[#d1d5db]"
                          style={{ background: '#ffffff', color: '#1f2937' }}
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveRepository(repo.id)}
                      className="hover:bg-[#f3f4f6] mt-7"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleLoadWorkflows(repo.id)}
                    disabled={loadingWorkflows[repo.id] || !repo.owner || !repo.repo}
                    variant="outline"
                    size="sm"
                    className="border-[#d1d5db] hover:bg-[#f3f4f6]"
                    style={{ color: '#374151' }}
                  >
                    {loadingWorkflows[repo.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading Workflows...
                      </>
                    ) : (
                      'Load Available Workflows'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle style={{ color: '#1f2937' }}>Pipelines</CardTitle>
              <CardDescription style={{ color: '#6b7280' }}>
                Configure deployment pipelines for this project
              </CardDescription>
            </div>
            <Button
              onClick={handleAddPipeline}
              size="sm"
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              disabled={repositories.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pipeline
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pipelines.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#6b7280' }}>
              No pipelines configured. Click "Add Pipeline" to get started.
            </div>
          ) : (
            pipelines.map((pipeline) => (
              <Card
                key={pipeline.id}
                className="border-[#e5e7eb]"
                style={{ background: '#f9fafb' }}
              >
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label style={{ color: '#374151' }}>Repository</Label>
                        <Select
                          value={pipeline.repositoryId}
                          onValueChange={(value) =>
                            handleUpdatePipeline(pipeline.id, 'repositoryId', value)
                          }
                        >
                          <SelectTrigger
                            className="border-[#d1d5db]"
                            style={{ background: '#ffffff', color: '#1f2937' }}
                          >
                            <SelectValue placeholder="Select repository" />
                          </SelectTrigger>
                          <SelectContent
                            className="border-[#e5e7eb]"
                            style={{ background: '#ffffff' }}
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
                        <Label style={{ color: '#374151' }}>Pipeline Name</Label>
                        <Input
                          placeholder="Production Deploy"
                          value={pipeline.name}
                          onChange={(e) =>
                            handleUpdatePipeline(pipeline.id, 'name', e.target.value)
                          }
                          className="border-[#d1d5db]"
                          style={{ background: '#ffffff', color: '#1f2937' }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: '#374151' }}>Workflow File</Label>
                        {workflows[pipeline.repositoryId]?.length > 0 ? (
                          <Select
                            value={pipeline.workflowFile}
                            onValueChange={(value) =>
                              handleUpdatePipeline(pipeline.id, 'workflowFile', value)
                            }
                          >
                            <SelectTrigger
                              className="border-[#d1d5db]"
                              style={{ background: '#ffffff', color: '#1f2937' }}
                            >
                              <SelectValue placeholder="Select workflow" />
                            </SelectTrigger>
                            <SelectContent
                              className="border-[#e5e7eb]"
                              style={{ background: '#ffffff' }}
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
                            className="border-[#d1d5db]"
                            style={{ background: '#ffffff', color: '#1f2937' }}
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label style={{ color: '#374151' }}>Branch</Label>
                        <Input
                          placeholder="main"
                          value={pipeline.branch}
                          onChange={(e) =>
                            handleUpdatePipeline(pipeline.id, 'branch', e.target.value)
                          }
                          className="border-[#d1d5db]"
                          style={{ background: '#ffffff', color: '#1f2937' }}
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemovePipeline(pipeline.id)}
                      className="hover:bg-[#f3f4f6] mt-7"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-[#ef4444] bg-[#fef2f2]">
          <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
          <AlertDescription style={{ color: '#dc2626' }}>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-[#d1d5db] hover:bg-[#f3f4f6]"
          style={{ color: '#374151' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
        >
          {loading ? 'Saving...' : 'Save Project'}
        </Button>
      </div>
    </div>
  );
}
