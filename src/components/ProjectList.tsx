import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Plus, Folder, FileJson } from "lucide-react";
import {
  Project,
  Deployment,
  getProjects,
  deleteProject,
  downloadProjectAsJson,
  getLastDeploymentByProject,
  getActiveDeploymentCountByProject,
} from "../lib/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { ImportExportDialog } from "./ImportExportDialog";
import { ProjectOverviewCard } from "./ProjectOverviewCard";
import { toast } from "sonner@2.0.3";

interface ProjectListProps {
  onAddProject: () => void;
  onSelectProject: (project: Project) => void;
  onConfigureProject: (project: Project) => void;
}

export function ProjectList({
  onAddProject,
  onSelectProject,
  onConfigureProject,
}: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<
    Record<string, { lastDeployment: Deployment | null; activeCount: number }>
  >({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [importExportDialog, setImportExportDialog] = useState<{
    open: boolean;
    project?: Project;
  }>({ open: false });
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const loadProjects = async () => {
    const data = await getProjects();
    setProjects(data);
    return data;
  };

  const computeStats = (data: Project[]) => {
    const stats: Record<
      string,
      { lastDeployment: Deployment | null; activeCount: number }
    > = {};
    data.forEach((p) => {
      stats[p.id] = {
        lastDeployment: getLastDeploymentByProject(p.id),
        activeCount: getActiveDeploymentCountByProject(p.id),
      };
    });
    setProjectStats(stats);
    return stats;
  };

  useEffect(() => {
    loadProjects().then(computeStats);
  }, []);

  // Live refresh every 15s when any project has active deployments
  useEffect(() => {
    const hasActive = Object.values(projectStats).some(
      (s) => s.activeCount > 0,
    );
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (!hasActive) return;
    refreshIntervalRef.current = setInterval(() => {
      loadProjects().then(computeStats);
    }, 15000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [projectStats]);

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    setDeleteConfirm(null);
    loadProjects().then(computeStats);
  };

  const handleExport = (project: Project) => {
    setImportExportDialog({ open: true, project });
  };

  const handleImport = () => {
    setImportExportDialog({ open: true });
  };

  const handleQuickDownload = (
    project: Project,
    exportType: "config" | "full",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    downloadProjectAsJson(project, exportType === "full");
    const message =
      exportType === "full"
        ? `${project.name} full backup downloaded!`
        : `${project.name} configuration downloaded!`;
    toast.success(message);
  };

  // Sort: active deployments first → most recent deployment → alphabetical
  const sortedProjects = [...projects].sort((a, b) => {
    const aStats = projectStats[a.id];
    const bStats = projectStats[b.id];
    const aActive = aStats?.activeCount ?? 0;
    const bActive = bStats?.activeCount ?? 0;
    if (aActive !== bActive) return bActive - aActive;
    const aLast = aStats?.lastDeployment?.startedAt ?? 0;
    const bLast = bStats?.lastDeployment?.startedAt ?? 0;
    if (aLast !== bLast) return bLast - aLast;
    return a.name.localeCompare(b.name);
  });

  const productionProjects = sortedProjects.filter(
    (p) => p.isProductionRelease,
  );
  const otherProjects = sortedProjects.filter((p) => !p.isProductionRelease);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl" style={{ color: "#e9d5ff" }}>
            Projects
          </h2>
          <p style={{ color: "#c4b5fd" }}>
            Manage your GitHub repositories and deployment pipelines
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleImport}
            variant="outline"
            className="border-2 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50"
            style={{ borderColor: "#c4b5fd", color: "#7c3aed" }}
          >
            <FileJson className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={onAddProject}
            className="text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card
          className="border-2"
          style={{
            background: "linear-gradient(to bottom, #ffffff, #faf5ff)",
            borderColor: "#e9d5ff",
          }}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="w-16 h-16 mb-4" style={{ color: "#a855f7" }} />
            <h3 style={{ color: "#6b21a8" }} className="mb-2">
              No projects yet
            </h3>
            <p className="text-center mb-6" style={{ color: "#7c3aed" }}>
              Get started by adding your first GitHub project
            </p>
            <Button
              onClick={onAddProject}
              className="text-white"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
              }}
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
                  <Folder className="w-5 h-5" style={{ color: "#a855f7" }} />
                  <h3 className="text-xl" style={{ color: "#6b21a8" }}>
                    Other Projects
                  </h3>
                  <div
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ background: "#faf5ff", color: "#6b21a8" }}
                  >
                    {otherProjects.length}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherProjects.map((project) => (
                  <ProjectOverviewCard
                    key={project.id}
                    project={project}
                    lastDeployment={
                      projectStats[project.id]?.lastDeployment ?? null
                    }
                    activeCount={projectStats[project.id]?.activeCount ?? 0}
                    onOpen={() => onSelectProject(project)}
                    onConfigure={() => onConfigureProject(project)}
                    onDelete={() => setDeleteConfirm(project.id)}
                    onExport={handleExport}
                    onQuickDownload={handleQuickDownload}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Separator between sections */}
          {productionProjects.length > 0 && otherProjects.length > 0 && (
            <div className="py-2">
              <div
                className="h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, #93c5fd 50%, transparent 100%)",
                }}
              />
            </div>
          )}

          {/* Production Projects Section */}
          {productionProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5" style={{ color: "#3b82f6" }} />
                <h3 className="text-xl" style={{ color: "#1e40af" }}>
                  Production Projects
                </h3>
                <div
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ background: "#dbeafe", color: "#1e40af" }}
                >
                  {productionProjects.length}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {productionProjects.map((project) => (
                  <ProjectOverviewCard
                    key={project.id}
                    project={project}
                    lastDeployment={
                      projectStats[project.id]?.lastDeployment ?? null
                    }
                    activeCount={projectStats[project.id]?.activeCount ?? 0}
                    onOpen={() => onSelectProject(project)}
                    onConfigure={() => onConfigureProject(project)}
                    onDelete={() => setDeleteConfirm(project.id)}
                    onExport={handleExport}
                    onQuickDownload={handleQuickDownload}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent
          className="border-2"
          style={{
            background: "linear-gradient(to bottom, #ffffff, #fef2f2)",
            borderColor: "#fecaca",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "#991b1b" }}>
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "#dc2626" }}>
              Are you sure you want to delete this project? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-2 hover:bg-purple-50"
              style={{
                background: "#ffffff",
                color: "#7c3aed",
                borderColor: "#c4b5fd",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="text-white"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
                boxShadow: "0 2px 8px rgba(236, 72, 153, 0.25)",
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportExportDialog
        open={importExportDialog.open}
        onOpenChange={(open) =>
          setImportExportDialog({ ...importExportDialog, open })
        }
        project={importExportDialog.project}
        onImportSuccess={loadProjects}
      />
    </div>
  );
}
