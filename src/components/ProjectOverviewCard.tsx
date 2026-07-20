import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Rocket,
  GitBranch,
  FolderGit2,
  Settings,
  Trash2,
  Download,
  FileJson,
  Database,
  RefreshCw,
} from "lucide-react";
import { Project, Deployment } from "../lib/storage";

interface ProjectOverviewCardProps {
  project: Project;
  lastDeployment: Deployment | null;
  activeCount: number;
  onOpen: () => void;
  onConfigure: () => void;
  onDelete: () => void;
  onExport: (project: Project) => void;
  onQuickDownload: (
    project: Project,
    type: "config" | "full",
    e: React.MouseEvent,
  ) => void;
}

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function StatusIcon({ status }: { status: Deployment["status"] }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-4 h-4" style={{ color: "#10b981" }} />;
    case "failure":
      return <XCircle className="w-4 h-4" style={{ color: "#ef4444" }} />;
    case "in_progress":
      return (
        <Loader2
          className="w-4 h-4 animate-spin"
          style={{ color: "#2563eb" }}
        />
      );
    default:
      return <Clock className="w-4 h-4" style={{ color: "#9ca3af" }} />;
  }
}

const statusLabel: Record<Deployment["status"], string> = {
  success: "Success",
  failure: "Failed",
  in_progress: "In progress",
  pending: "Pending",
};

const statusColor: Record<Deployment["status"], string> = {
  success: "#10b981",
  failure: "#ef4444",
  in_progress: "#2563eb",
  pending: "#9ca3af",
};

export function ProjectOverviewCard({
  project,
  lastDeployment,
  activeCount,
  onOpen,
  onConfigure,
  onDelete,
  onExport,
  onQuickDownload,
}: ProjectOverviewCardProps) {
  const isProduction = !!project.isProductionRelease;

  const borderColor = isProduction ? "#60a5fa" : "#e9d5ff";
  const hoverBorderColor = isProduction ? "#3b82f6" : "#a855f7";
  const titleColor = isProduction ? "#1e40af" : "#6b21a8";
  const accentColor = isProduction ? "#2563eb" : "#7c3aed";
  const bgGradient = isProduction
    ? "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)"
    : "linear-gradient(to bottom right, #ffffff, #faf5ff)";

  return (
    <Card
      className="border-2 transition-all"
      style={{ background: bgGradient, borderColor }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = hoverBorderColor)
      }
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = borderColor)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Title + badges — clickable to open */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CardTitle
                className="text-base truncate"
                style={{ color: titleColor }}
              >
                {project.name}
              </CardTitle>
              {isProduction && (
                <Badge
                  className="text-white text-xs px-1.5 py-0 shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                  }}
                >
                  PRODUCTION
                </Badge>
              )}
              {activeCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0 flex items-center gap-1 shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                    color: "#1e40af",
                    border: "1px solid #60a5fa",
                  }}
                >
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  {activeCount} active
                </Badge>
              )}
            </div>

            {/* Last deployment status */}
            {lastDeployment ? (
              <div className="flex items-center gap-1.5 mt-1">
                <StatusIcon status={lastDeployment.status} />
                <span
                  className="text-xs font-medium"
                  style={{ color: statusColor[lastDeployment.status] }}
                >
                  {statusLabel[lastDeployment.status]}
                </span>
                <span className="text-xs" style={{ color: "#9ca3af" }}>
                  · {formatRelativeDate(lastDeployment.startedAt)}
                </span>
                {lastDeployment.buildNumber && (
                  <code
                    className="text-xs px-1 rounded"
                    style={{ background: "#f3f4f6", color: "#6b7280" }}
                  >
                    {lastDeployment.buildNumber}
                  </code>
                )}
              </div>
            ) : (
              <span className="text-xs" style={{ color: "#9ca3af" }}>
                No deployments yet
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 w-7"
                  title="Export project"
                >
                  <Download
                    className="w-3.5 h-3.5"
                    style={{ color: accentColor }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={(e) => onQuickDownload(project, "config", e)}
                  className="cursor-pointer"
                >
                  <Settings
                    className="w-4 h-4 mr-2"
                    style={{ color: "#7c3aed" }}
                  />
                  <div>
                    <div className="font-medium text-sm">
                      Configuration Only
                    </div>
                    <div className="text-xs" style={{ color: "#6b7280" }}>
                      Export project structure
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => onQuickDownload(project, "full", e)}
                  className="cursor-pointer"
                >
                  <Database
                    className="w-4 h-4 mr-2"
                    style={{ color: "#7c3aed" }}
                  />
                  <div>
                    <div className="font-medium text-sm">Full Backup</div>
                    <div className="text-xs" style={{ color: "#6b7280" }}>
                      Include deployments & releases
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport(project);
                  }}
                  className="cursor-pointer"
                >
                  <FileJson
                    className="w-4 h-4 mr-2"
                    style={{ color: "#7c3aed" }}
                  />
                  <div>
                    <div className="font-medium text-sm">View/Copy JSON</div>
                    <div className="text-xs" style={{ color: "#6b7280" }}>
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
                onConfigure();
              }}
              className="h-7 w-7"
              title="Configure"
            >
              <Settings
                className="w-3.5 h-3.5"
                style={{ color: accentColor }}
              />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-7 w-7 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: "#ec4899" }} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Metadata chips */}
        <div
          className="flex items-center gap-3 text-xs mb-3"
          style={{ color: accentColor }}
        >
          <div className="flex items-center gap-1">
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>
              {project.repositories.length} repo
              {project.repositories.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" />
            <span>
              {project.pipelines.length} pipeline
              {project.pipelines.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Open button */}
        <Button
          onClick={onOpen}
          className="w-full text-white text-sm h-8"
          style={{
            background: isProduction
              ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)"
              : "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
            boxShadow: isProduction
              ? "0 2px 8px rgba(37, 99, 235, 0.25)"
              : "0 2px 8px rgba(124, 58, 237, 0.25)",
          }}
        >
          <Rocket className="w-3.5 h-3.5 mr-1.5" />
          Open
        </Button>
      </CardContent>
    </Card>
  );
}
