import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plus, Folder, GitBranch, Trash2, Settings, FileJson, Download, Rocket, Database, ChevronDown } from 'lucide-react';
import { Project, getProjects, deleteProject, downloadProjectAsJson } from '../lib/storage';
import { Separator } from './ui/separator';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
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

  const handleQuickDownload = (project: Project, exportType: 'config' | 'full', e: React.MouseEvent) => {
    e.stopPropagation();
    downloadProjectAsJson(project, exportType === 'full');
    const message = exportType === 'full'
      ? `${project.name} full backup downloaded!`
      : `${project.name} configuration downloaded!`;
    toast.success(message);
  };

  // Separate production and other projects
  const productionProjects = projects.filter(p => p.isProductionRelease === true);
  const otherProjects = projects.filter(p => !p.isProductionRelease);

  const renderProjectCard = (project: Project, isProduction: boolean = false) => (
    <Card
      key={project.id}
      className="border-2 transition-all cursor-pointer hover:shadow-lg"
      style={{ 
        background: isProduction 
          ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #dbeafe 100%)' 
          : 'linear-gradient(to bottom right, #ffffff, #faf5ff)', 
        borderColor: isProduction ? '#60a5fa' : '#e9d5ff',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = isProduction ? '#3b82f6' : '#a855f7'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = isProduction ? '#60a5fa' : '#e9d5ff'}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={() => onSelectProject(project)}>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle style={{ color: isProduction ? '#1e40af' : '#6b21a8' }}>
                {project.name}
              </CardTitle>
              {isProduction && (
                <Rocket className="w-4 h-4" style={{ color: '#3b82f6' }} />
              )}
            </div>
            <CardDescription style={{ color: isProduction ? '#2563eb' : '#7c3aed' }}>
              {project.repositories.length} repositor{project.repositories.length !== 1 ? 'ies' : 'y'}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8"
                  style={{ 
                    hover: isProduction ? 'bg-blue-100' : 'bg-purple-50' 
                  }}
                  title="Export project"
                >
                  <Download className="w-4 h-4" style={{ color: isProduction ? '#2563eb' : '#7c3aed' }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={(e) => handleQuickDownload(project, 'config', e)}
                  className="cursor-pointer"
                >
                  <Settings className="w-4 h-4 mr-2" style={{ color: '#7c3aed' }} />
                  <div>
                    <div className="font-medium">Configuration Only</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      Export project structure
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => handleQuickDownload(project, 'full', e)}
                  className="cursor-pointer"
                >
                  <Database className="w-4 h-4 mr-2" style={{ color: '#7c3aed' }} />
                  <div>
                    <div className="font-medium">Full Backup</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      Include deployments & releases
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(project);
                  }}
                  className="cursor-pointer"
                >
                  <FileJson className="w-4 h-4 mr-2" style={{ color: '#7c3aed' }} />
                  <div>
                    <div className="font-medium">View/Copy JSON</div>
                    <div className="text-xs" style={{ color: '#6b7280' }}>
                      Open export dialog
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onConfigureProject(project);
              }}
              className="h-8 w-8"
              style={{ 
                hover: isProduction ? 'bg-blue-100' : 'bg-purple-50' 
              }}
              title="Configure"
            >
              <Settings className="w-4 h-4" style={{ color: isProduction ? '#2563eb' : '#7c3aed' }} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm(project.id);
              }}
              className="h-8 w-8 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" style={{ color: '#ec4899' }} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent onClick={() => onSelectProject(project)}>
        <div className="flex items-center gap-2" style={{ color: isProduction ? '#2563eb' : '#7c3aed' }}>
          <GitBranch className="w-4 h-4" />
          <span className="text-sm">{project.pipelines.length} pipeline{project.pipelines.length !== 1 ? 's' : ''}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl" style={{ color: '#e9d5ff' }}>Projects</h2>
          <p style={{ color: '#c4b5fd' }}>Manage your GitHub repositories and deployment pipelines</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            variant="outline"
            className="border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50"
            style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
          >
            <FileJson className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={onAddProject}
            className="text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-2" style={{ background: 'linear-gradient(to bottom, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="w-16 h-16 mb-4" style={{ color: '#a855f7' }} />
            <h3 style={{ color: '#6b21a8' }} className="mb-2">No projects yet</h3>
            <p className="text-center mb-6" style={{ color: '#7c3aed' }}>
              Get started by adding your first GitHub project
            </p>
            <Button
              onClick={onAddProject}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Other Projects Section */}
          {otherProjects.length > 0 && (
            <div className="space-y-4">
              {productionProjects.length > 0 && (
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5" style={{ color: '#a855f7' }} />
                  <h3 className="text-xl" style={{ color: '#6b21a8' }}>
                    Other Projects
                  </h3>
                  <div 
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ background: '#faf5ff', color: '#6b21a8' }}
                  >
                    {otherProjects.length}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherProjects.map((project) => renderProjectCard(project, false))}
              </div>
            </div>
          )}

          {/* Separator between sections */}
          {productionProjects.length > 0 && otherProjects.length > 0 && (
            <div className="py-4">
              <Separator style={{ background: 'linear-gradient(90deg, transparent 0%, #93c5fd 50%, transparent 100%)' }} />
            </div>
          )}

          {/* Production Projects Section */}
          {productionProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5" style={{ color: '#3b82f6' }} />
                <h3 className="text-xl" style={{ color: '#1e40af' }}>
                  Production Projects
                </h3>
                <div 
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ background: '#dbeafe', color: '#1e40af' }}
                >
                  {productionProjects.length}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productionProjects.map((project) => renderProjectCard(project, true))}
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="border-2" style={{ background: 'linear-gradient(to bottom, #ffffff, #fef2f2)', borderColor: '#fecaca' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#991b1b' }}>Delete Project</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#dc2626' }}>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-2 hover:bg-purple-50"
              style={{ background: '#ffffff', color: '#7c3aed', borderColor: '#c4b5fd' }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', boxShadow: '0 2px 8px rgba(236, 72, 153, 0.25)' }}
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
