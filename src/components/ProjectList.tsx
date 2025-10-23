import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plus, Folder, GitBranch, Trash2, Settings, FileJson, Download } from 'lucide-react';
import { Project, getProjects, deleteProject, downloadProjectAsJson } from '../lib/storage';
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
import { ImportExportDialog } from './ImportExportDialog';
import { toast } from 'sonner@2.0.3';

interface ProjectListProps {
  onAddProject: () => void;
  onSelectProject: (project: Project) => void;
  onConfigureProject: (project: Project) => void;
}

export function ProjectList({ onAddProject, onSelectProject, onConfigureProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [importExportDialog, setImportExportDialog] = useState<{
    open: boolean;
    project?: Project;
  }>({ open: false });

  const loadProjects = async () => {
    const data = await getProjects();
    setProjects(data);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setDeleteConfirm(null);
    loadProjects();
  };

  const handleExport = (project: Project) => {
    setImportExportDialog({ open: true, project });
  };

  const handleImport = () => {
    setImportExportDialog({ open: true });
  };

  const handleQuickDownload = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadProjectAsJson(project);
    toast.success(`${project.name} configuration downloaded!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl" style={{ color: '#1f2937' }}>Projects</h2>
          <p style={{ color: '#6b7280' }}>Manage your GitHub repositories and deployment pipelines</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            variant="outline"
            className="border-[#d1d5db] hover:bg-[#f3f4f6]"
            style={{ color: '#374151' }}
          >
            <FileJson className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={onAddProject}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="w-16 h-16 mb-4" style={{ color: '#9ca3af' }} />
            <h3 style={{ color: '#1f2937' }} className="mb-2">No projects yet</h3>
            <p className="text-center mb-6" style={{ color: '#6b7280' }}>
              Get started by adding your first GitHub project
            </p>
            <Button
              onClick={onAddProject}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="border-[#e5e7eb] hover:border-[#2563eb] transition-colors cursor-pointer"
              style={{ background: '#ffffff' }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => onSelectProject(project)}>
                    <CardTitle style={{ color: '#1f2937' }}>{project.name}</CardTitle>
                    <CardDescription style={{ color: '#6b7280' }}>
                      {project.repositories.length} repositor{project.repositories.length !== 1 ? 'ies' : 'y'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => handleQuickDownload(project, e)}
                      className="h-8 w-8 hover:bg-[#f3f4f6]"
                      title="Download configuration"
                    >
                      <Download className="w-4 h-4" style={{ color: '#6b7280' }} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfigureProject(project);
                      }}
                      className="h-8 w-8 hover:bg-[#f3f4f6]"
                      title="Configure"
                    >
                      <Settings className="w-4 h-4" style={{ color: '#6b7280' }} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(project.id);
                      }}
                      className="h-8 w-8 hover:bg-[#f3f4f6]"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => onSelectProject(project)}>
                <div className="flex items-center gap-2" style={{ color: '#6b7280' }}>
                  <GitBranch className="w-4 h-4" />
                  <span className="text-sm">{project.pipelines.length} pipeline{project.pipelines.length !== 1 ? 's' : ''}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="border-[#e5e7eb]" style={{ background: '#ffffff' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#1f2937' }}>Delete Project</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#6b7280' }}>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-[#e5e7eb] hover:bg-[#f3f4f6]"
              style={{ background: '#ffffff', color: '#374151' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportExportDialog
        open={importExportDialog.open}
        onOpenChange={(open) => setImportExportDialog({ ...importExportDialog, open })}
        project={importExportDialog.project}
        onImportSuccess={loadProjects}
      />
    </div>
  );
}
