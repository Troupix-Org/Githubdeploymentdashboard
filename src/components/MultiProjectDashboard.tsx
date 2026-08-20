import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Project,
  DashboardConfig,
  getDashboardConfig,
  saveDashboardConfig,
  getProjects,
} from "../lib/storage";
import { getWorkflowRuns, GitHubWorkflowRun } from "../lib/github";

interface MultiProjectDashboardProps {
  onNavigateToProject: (project: Project) => void;
}

// One row in the dashboard table — a single GitHub workflow run for a pipeline
interface PipelineRun {
  key: string; // unique: pipelineId + runId
  projectId: string;
  projectName: string;
  pipelineId: string;
  pipelineName: string;
  environment?: string;
  branch: string;
  runId: number;
  displayTitle: string;
  status: "pending" | "in_progress" | "success" | "failure";
  startedAt: number;
  htmlUrl: string;
}

type RunStatus = PipelineRun["status"];

function ghStatusToLocal(run: GitHubWorkflowRun): RunStatus {
  if (run.status === "completed") {
    return run.conclusion === "success" ? "success" : "failure";
  }
  if (run.status === "in_progress" || run.status === "queued")
    return "in_progress";
  return "pending";
}

function formatRelativeTime(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusIcon({ status }: { status: RunStatus }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-4 h-4" style={{ color: "#10b981" }} />;
    case "failure":
      return <XCircle className="w-4 h-4" style={{ color: "#ef4444" }} />;
    case "in_progress":
      return (
        <Loader2
          className="w-4 h-4 animate-spin"
          style={{ color: "#7c3aed" }}
        />
      );
    default:
      return <Clock className="w-4 h-4" style={{ color: "#f59e0b" }} />;
  }
}

function StatusBadge({ status }: { status: RunStatus }) {
  const styles: Record<RunStatus, { bg: string; text: string; label: string }> =
    {
      success: { bg: "#d1fae5", text: "#065f46", label: "Success" },
      failure: { bg: "#fee2e2", text: "#991b1b", label: "Failure" },
      in_progress: { bg: "#ede9fe", text: "#5b21b6", label: "In Progress" },
      pending: { bg: "#fef3c7", text: "#92400e", label: "Pending" },
    };
  const s = styles[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.text }}
    >
      <StatusIcon status={status} />
      {s.label}
    </span>
  );
}

function envColor(env?: string): string {
  if (!env) return "#6b7280";
  const lower = env.toLowerCase();
  if (lower.includes("prod")) return "#7c3aed";
  if (lower.includes("staging")) return "#2563eb";
  if (lower.includes("qa")) return "#d97706";
  return "#6b7280";
}

const REFRESH_OPTIONS = [1, 2, 5, 10, 15, 30] as const;
const RUNS_PER_PIPELINE_OPTIONS = [1, 3, 5, 10] as const;

export function MultiProjectDashboard({
  onNavigateToProject,
}: MultiProjectDashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [config, setConfig] = useState<DashboardConfig>(getDashboardConfig());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const projectsRef = useRef<Project[]>([]);
  projectsRef.current = projects;
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  const fetchRuns = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setFetchError(null);
    try {
      const cfg = configRef.current;
      const projectList = projectsRef.current;

      const selectedIds =
        cfg.selectedProjectIds.length > 0
          ? new Set(cfg.selectedProjectIds)
          : null;

      const runsPerPipeline = cfg.maxPerProject; // repurposed field

      const fetches: Promise<void>[] = [];
      const collected: PipelineRun[] = [];

      for (const project of projectList) {
        if (selectedIds && !selectedIds.has(project.id)) continue;

        for (const pipeline of project.pipelines) {
          const repo = project.repositories.find(
            (r) => r.id === pipeline.repositoryId,
          );
          if (!repo) continue;

          fetches.push(
            getWorkflowRuns(
              repo.owner,
              repo.repo,
              pipeline.workflowFile,
              runsPerPipeline,
              pipeline.branch,
            )
              .then((ghRuns) => {
                for (const run of ghRuns) {
                  collected.push({
                    key: `${pipeline.id}-${run.id}`,
                    projectId: project.id,
                    projectName: project.name,
                    pipelineId: pipeline.id,
                    pipelineName: pipeline.name,
                    environment: pipeline.environment,
                    branch: run.head_branch ?? pipeline.branch,
                    runId: run.id,
                    displayTitle:
                      run.display_title ??
                      run.head_commit?.message?.split("\n")[0] ??
                      `Run #${run.id}`,
                    status: ghStatusToLocal(run),
                    startedAt: new Date(run.created_at).getTime(),
                    htmlUrl: run.html_url,
                  });
                }
              })
              .catch(() => {
                // skip pipelines that fail (e.g. workflow file not found)
              }),
          );
        }
      }

      await Promise.all(fetches);
      setRuns(collected);
      setLastRefreshed(Date.now());
    } catch (err) {
      setFetchError("Failed to fetch workflow runs from GitHub.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch when projects load
  useEffect(() => {
    if (projects.length > 0) fetchRuns(true);
  }, [projects, fetchRuns]);

  // Re-fetch when config changes (selected projects or runs per pipeline)
  useEffect(() => {
    if (projects.length > 0) fetchRuns(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.selectedProjectIds, config.maxPerProject]);

  // Countdown + timed refresh
  useEffect(() => {
    const intervalMs = config.refreshIntervalMinutes * 60 * 1000;
    setCountdown(intervalMs);

    const tick = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1000) {
          fetchRuns(true);
          return intervalMs;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [config.refreshIntervalMinutes, fetchRuns]);

  const sortRuns = useCallback(
    (data: PipelineRun[]): PipelineRun[] => {
      const statusOrder: Record<RunStatus, number> = {
        in_progress: 0,
        pending: 1,
        failure: 2,
        success: 3,
      };
      return [...data].sort((a, b) => {
        switch (config.sortBy) {
          case "project":
            return (
              a.projectName.localeCompare(b.projectName) ||
              b.startedAt - a.startedAt
            );
          case "status":
            return (
              statusOrder[a.status] - statusOrder[b.status] ||
              b.startedAt - a.startedAt
            );
          case "environment":
            return (
              (a.environment ?? "").localeCompare(b.environment ?? "") ||
              b.startedAt - a.startedAt
            );
          case "branch":
            return (
              a.branch.localeCompare(b.branch) || b.startedAt - a.startedAt
            );
          default: // "date"
            return b.startedAt - a.startedAt;
        }
      });
    },
    [config.sortBy],
  );

  const handleConfigChange = (patch: Partial<DashboardConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    saveDashboardConfig(next);
  };

  const toggleProject = (id: string) => {
    const current = config.selectedProjectIds;
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    handleConfigChange({ selectedProjectIds: next });
  };

  const sorted = sortRuns(runs);

  const visibleProjectCount = projects.filter(
    (p) =>
      config.selectedProjectIds.length === 0 ||
      config.selectedProjectIds.includes(p.id),
  ).length;

  const countdownSec = Math.ceil(countdown / 1000);
  const countdownDisplay =
    countdownSec >= 60
      ? `${Math.floor(countdownSec / 60)}m ${countdownSec % 60}s`
      : `${countdownSec}s`;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#ffffff" }}>
            Pipeline Dashboard
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "#a855f7" }}>
            {sorted.length} run{sorted.length !== 1 ? "s" : ""} across{" "}
            {visibleProjectCount} project{visibleProjectCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-xs" style={{ color: "#9ca3af" }}>
              Refreshed {formatRelativeTime(lastRefreshed)} · next in{" "}
              {countdownDisplay}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchRuns(false)}
            disabled={isRefreshing}
            style={{ borderColor: "#7c3aed", color: "#7c3aed" }}
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Settings panel */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Card
          className="border"
          style={{ background: "#1e293b", borderColor: "#334155" }}
        >
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" style={{ color: "#a855f7" }} />
                  <CardTitle className="text-sm" style={{ color: "#e2e8f0" }}>
                    Dashboard Settings
                  </CardTitle>
                </div>
                {settingsOpen ? (
                  <ChevronUp className="w-4 h-4" style={{ color: "#6b7280" }} />
                ) : (
                  <ChevronDown
                    className="w-4 h-4"
                    style={{ color: "#6b7280" }}
                  />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs" style={{ color: "#9ca3af" }}>
                    Refresh interval
                  </label>
                  <Select
                    value={String(config.refreshIntervalMinutes)}
                    onValueChange={(v) =>
                      handleConfigChange({ refreshIntervalMinutes: Number(v) })
                    }
                  >
                    <SelectTrigger
                      className="w-32 h-8 text-xs"
                      style={{
                        background: "#0f172a",
                        borderColor: "#334155",
                        color: "#e2e8f0",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REFRESH_OPTIONS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs" style={{ color: "#9ca3af" }}>
                    Sort by
                  </label>
                  <Select
                    value={config.sortBy}
                    onValueChange={(v) =>
                      handleConfigChange({
                        sortBy: v as DashboardConfig["sortBy"],
                      })
                    }
                  >
                    <SelectTrigger
                      className="w-40 h-8 text-xs"
                      style={{
                        background: "#0f172a",
                        borderColor: "#334155",
                        color: "#e2e8f0",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date (newest first)</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="status">
                        Status (active first)
                      </SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs" style={{ color: "#9ca3af" }}>
                    Runs per pipeline
                  </label>
                  <Select
                    value={String(config.maxPerProject)}
                    onValueChange={(v) =>
                      handleConfigChange({ maxPerProject: Number(v) })
                    }
                  >
                    <SelectTrigger
                      className="w-24 h-8 text-xs"
                      style={{
                        background: "#0f172a",
                        borderColor: "#334155",
                        color: "#e2e8f0",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RUNS_PER_PIPELINE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Project selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs" style={{ color: "#9ca3af" }}>
                    Projects to display{" "}
                    <span style={{ color: "#6b7280" }}>(empty = all)</span>
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    style={{ color: "#7c3aed" }}
                    onClick={() =>
                      handleConfigChange({ selectedProjectIds: [] })
                    }
                  >
                    Show all
                  </Button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {projects.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={
                          config.selectedProjectIds.length === 0 ||
                          config.selectedProjectIds.includes(p.id)
                        }
                        onCheckedChange={() => {
                          if (config.selectedProjectIds.length === 0) {
                            handleConfigChange({
                              selectedProjectIds: projects
                                .filter((x) => x.id !== p.id)
                                .map((x) => x.id),
                            });
                          } else {
                            toggleProject(p.id);
                          }
                        }}
                      />
                      <span className="text-xs" style={{ color: "#e2e8f0" }}>
                        {p.name}
                      </span>
                      {p.isProductionRelease && (
                        <Badge
                          className="text-white text-xs px-1 py-0"
                          style={{
                            background:
                              "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                          }}
                        >
                          PROD
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Error */}
      {fetchError && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm"
          style={{
            background: "#fee2e2",
            borderColor: "#fca5a5",
            color: "#991b1b",
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Runs table */}
      <Card
        className="border"
        style={{ background: "#1e293b", borderColor: "#334155" }}
      >
        <CardContent className="p-0">
          {isRefreshing && runs.length === 0 ? (
            <div
              className="flex items-center justify-center py-16 gap-3"
              style={{ color: "#6b7280" }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Fetching pipeline runs…</span>
            </div>
          ) : sorted.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ color: "#6b7280" }}
            >
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">
                No pipeline runs found for selected projects.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ background: "#0f172a", borderColor: "#334155" }}
                  >
                    {[
                      "Project",
                      "Pipeline",
                      "Run",
                      "Environment",
                      "Branch",
                      "Status",
                      "Started",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#9ca3af" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const proj = projects.find((p) => p.id === row.projectId);
                    return (
                      <tr
                        key={row.key}
                        className="border-b transition-colors hover:bg-white/5"
                        style={{
                          borderColor: "#1e293b",
                          background:
                            i % 2 === 0
                              ? "rgba(255,255,255,0.02)"
                              : "transparent",
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium"
                              style={{ color: "#e2e8f0" }}
                            >
                              {row.projectName}
                            </span>
                            {proj?.isProductionRelease && (
                              <Badge
                                className="text-white text-xs px-1 py-0"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                                }}
                              >
                                PROD
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: "#cbd5e1" }}>
                            {row.pipelineName}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span
                            className="text-xs truncate block"
                            style={{ color: "#94a3b8" }}
                            title={row.displayTitle}
                          >
                            {row.displayTitle}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.environment ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                background: `${envColor(row.environment)}22`,
                                color: envColor(row.environment),
                                border: `1px solid ${envColor(row.environment)}44`,
                              }}
                            >
                              {row.environment}
                            </span>
                          ) : (
                            <span style={{ color: "#6b7280" }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="font-mono text-xs"
                            style={{ color: "#94a3b8" }}
                          >
                            {row.branch}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs"
                            style={{ color: "#6b7280" }}
                            title={new Date(row.startedAt).toLocaleString()}
                          >
                            {formatRelativeTime(row.startedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <a
                              href={row.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open run on GitHub"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                style={{ color: "#7c3aed" }}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </a>
                            {proj && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                style={{ color: "#6b7280" }}
                                onClick={() => onNavigateToProject(proj)}
                                title="Open project dashboard"
                              >
                                <Settings className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
