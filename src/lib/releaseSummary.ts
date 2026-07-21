import { Deployment, Project } from "./storage";

export interface SummaryData {
  batchId: string;
  timestamp: string;
  releaseNotes?: string;
  pipelines: Array<{
    name: string;
    environment?: string;
    buildNumber?: string;
    status: string;
    duration: string;
  }>;
  successCount: number;
  failureCount: number;
}

/**
 * Generate structured summary data from deployments
 */
export function generateDeploymentSummary(
  batchId: string,
  deployments: Deployment[],
  project: Project,
  releaseNotes?: string,
): SummaryData {
  const batchDeployments = deployments.filter((d) => d.batchId === batchId);

  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const pipelines = batchDeployments.map((d) => {
    const pipeline = project.pipelines.find((p) => p.id === d.pipelineId);
    const duration = d.completedAt
      ? formatDuration(d.completedAt - d.startedAt)
      : "In progress";

    return {
      name: pipeline?.name || `Pipeline ${d.pipelineId}`,
      environment: d.environment || "Unknown",
      buildNumber: d.buildNumber || "N/A",
      status: d.status,
      duration,
    };
  });

  const successCount = batchDeployments.filter(
    (d) => d.status === "success",
  ).length;
  const failureCount = batchDeployments.filter(
    (d) => d.status === "failure",
  ).length;

  return {
    batchId,
    timestamp,
    releaseNotes,
    pipelines,
    successCount,
    failureCount,
  };
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format summary as Markdown
 */
export function formatSummaryAsMarkdown(summary: SummaryData): string {
  const lines: string[] = [];

  lines.push(`# Release Summary`);
  lines.push("");

  if (summary.releaseNotes) {
    lines.push(`## Release Notes`);
    lines.push(summary.releaseNotes);
    lines.push("");
  }

  lines.push(`## Deployment Summary`);
  lines.push("");
  lines.push(`**Batch ID:** ${summary.batchId}`);
  lines.push(`**Timestamp:** ${summary.timestamp}`);
  lines.push("");

  lines.push(`| Pipeline | Environment | Build | Status | Duration |`);
  lines.push(`|----------|-------------|-------|--------|----------|`);

  for (const p of summary.pipelines) {
    const statusIcon = p.status === "success" ? "✓" : "✗";
    lines.push(
      `| ${p.name} | ${p.environment} | ${p.buildNumber} | ${statusIcon} ${p.status} | ${p.duration} |`,
    );
  }

  lines.push("");
  lines.push(
    `**Summary:** ${summary.successCount} succeeded, ${summary.failureCount} failed`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Format summary as Plain Text
 */
export function formatSummaryAsText(summary: SummaryData): string {
  const lines: string[] = [];

  lines.push(`RELEASE SUMMARY`);
  lines.push(`===============`);
  lines.push("");

  if (summary.releaseNotes) {
    lines.push(`RELEASE NOTES`);
    lines.push(`-------------`);
    lines.push(summary.releaseNotes);
    lines.push("");
  }

  lines.push(`DEPLOYMENT SUMMARY`);
  lines.push(`------------------`);
  lines.push("");
  lines.push(`Batch ID:   ${summary.batchId}`);
  lines.push(`Timestamp:  ${summary.timestamp}`);
  lines.push("");

  lines.push(`Pipeline Results:`);
  lines.push("");

  for (const p of summary.pipelines) {
    lines.push(`  Pipeline:     ${p.name}`);
    lines.push(`  Environment:  ${p.environment}`);
    lines.push(`  Build Number: ${p.buildNumber}`);
    lines.push(`  Status:       ${p.status.toUpperCase()}`);
    lines.push(`  Duration:     ${p.duration}`);
    lines.push("");
  }

  lines.push(
    `Summary: ${summary.successCount} succeeded, ${summary.failureCount} failed`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Format summary as JSON
 */
export function formatSummaryAsJson(summary: SummaryData): string {
  return JSON.stringify(summary, null, 2);
}

/**
 * Format summary as HTML
 */
export function formatSummaryAsHtml(summary: SummaryData): string {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Release Summary - ${summary.batchId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
    }
    .metadata {
      background-color: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      margin: 15px 0;
    }
    .metadata p {
      margin: 5px 0;
    }
    .release-notes {
      background-color: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #3498db;
      margin: 15px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #34495e;
      color: white;
      font-weight: bold;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .success {
      color: #27ae60;
      font-weight: bold;
    }
    .failure {
      color: #e74c3c;
      font-weight: bold;
    }
    .summary {
      background-color: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      margin-top: 15px;
      font-size: 16px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      color: #7f8c8d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Release Summary</h1>
    
    ${
      summary.releaseNotes
        ? `
    <h2>Release Notes</h2>
    <div class="release-notes">${escapeHtml(summary.releaseNotes)}</div>
    `
        : ""
    }
    
    <h2>Deployment Summary</h2>
    <div class="metadata">
      <p><strong>Batch ID:</strong> ${escapeHtml(summary.batchId)}</p>
      <p><strong>Timestamp:</strong> ${escapeHtml(summary.timestamp)}</p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Pipeline</th>
          <th>Environment</th>
          <th>Build Number</th>
          <th>Status</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${summary.pipelines
          .map(
            (p) => `
        <tr>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.environment || "—")}</td>
          <td>${escapeHtml(p.buildNumber || "—")}</td>
          <td class="${p.status === "success" ? "success" : "failure"}">
            ${p.status === "success" ? "✓" : "✗"} ${escapeHtml(p.status.toUpperCase())}
          </td>
          <td>${escapeHtml(p.duration)}</td>
        </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
    
    <div class="summary">
      Summary: <span class="success">${summary.successCount} succeeded</span>, 
      <span class="failure">${summary.failureCount} failed</span>
    </div>
    
    <div class="footer">
      Generated on ${new Date().toLocaleString("en-US", {
        timeZone: "UTC",
      })} UTC
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate filename for downloaded file
 */
export function generateFilename(
  batchId: string,
  format: "md" | "txt" | "json" | "html",
): string {
  const dateStr = new Date().toISOString().split("T")[0];
  return `release-${batchId}-${dateStr}.${format}`;
}

/**
 * Trigger file download
 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
