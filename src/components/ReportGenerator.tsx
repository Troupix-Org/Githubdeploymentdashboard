import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { FileText, Download, Copy, CheckCircle2, FileCode, FileJson } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { ProductionRelease, Project } from '../lib/storage';

interface ReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: ProductionRelease;
  project: Project;
}

type ReportFormat = 'markdown' | 'html' | 'json';

interface ReportOptions {
  includeTimeline: boolean;
  includePipelines: boolean;
  includeSignoffs: boolean;
  includeNotes: boolean;
  includeMetrics: boolean;
}

export function ReportGenerator({ open, onOpenChange, release, project }: ReportGeneratorProps) {
  const [format, setFormat] = useState<ReportFormat>('markdown');
  const [options, setOptions] = useState<ReportOptions>({
    includeTimeline: true,
    includePipelines: true,
    includeSignoffs: true,
    includeNotes: true,
    includeMetrics: true,
  });

  const toggleOption = (key: keyof ReportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (start: string | undefined, end: string | undefined) => {
    if (!start || !end) return null;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateTotalDuration = () => {
    const firstTimestamp = release.stagingDeployedAt;
    const lastTimestamp = release.buildVersionsUpdatedAt;
    return calculateDuration(firstTimestamp, lastTimestamp);
  };

  const getStepStatus = (stepKey: keyof ProductionRelease) => {
    return release[stepKey] ? '✅' : '⏳';
  };

  const generateMarkdown = () => {
    let md = `# Production Release Report: ${release.name}\n\n`;
    md += `**Generated:** ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}\n\n`;
    md += `---\n\n`;

    // Summary
    md += `## 📊 Summary\n\n`;
    md += `- **Status:** ${release.buildVersionsUpdated ? '✅ Completed' : '🔄 In Progress'}\n`;
    md += `- **Release Name:** ${release.name}\n`;
    md += `- **Project:** ${project.name}\n`;
    const totalDuration = calculateTotalDuration();
    if (totalDuration) {
      md += `- **Total Duration:** ${totalDuration}\n`;
    }
    const deployedPipelines = Object.keys(release.deployments || {}).length;
    md += `- **Pipelines Deployed:** ${deployedPipelines}\n`;
    md += `\n`;

    // Timeline
    if (options.includeTimeline) {
      md += `## ⏱️ Deployment Timeline\n\n`;
      const steps = [
        { key: 'stagingDeployed', label: 'Staging Deployed', timestamp: release.stagingDeployedAt },
        { key: 'qaValidated', label: 'QA Validated', timestamp: release.qaValidatedAt },
        { key: 'poValidated', label: 'PO Validated', timestamp: release.poValidatedAt },
        { key: 'productionDeployed', label: 'Production Deployed', timestamp: release.productionDeployedAt },
        { key: 'healthChecked', label: 'Health Checked', timestamp: release.healthCheckedAt },
        { key: 'complianceDocumented', label: 'Compliance Documented', timestamp: release.complianceDocumentedAt },
        { key: 'releaseNotesCreated', label: 'Release Notes Created', timestamp: release.releaseNotesCreatedAt },
        { key: 'teamNotified', label: 'Team Notified', timestamp: release.teamNotifiedAt },
        { key: 'buildVersionsUpdated', label: 'Build Versions Updated', timestamp: release.buildVersionsUpdatedAt },
      ];

      steps.forEach((step, index) => {
        const status = getStepStatus(step.key as keyof ProductionRelease);
        const timestamp = step.timestamp ? formatDate(step.timestamp) : 'Pending';
        md += `${index + 1}. ${status} **${step.label}**\n`;
        md += `   - ${timestamp}\n`;
        if (index < steps.length - 1 && step.timestamp && steps[index + 1].timestamp) {
          const duration = calculateDuration(step.timestamp, steps[index + 1].timestamp);
          if (duration) {
            md += `   - Duration to next step: ${duration}\n`;
          }
        }
      });
      md += `\n`;
    }

    // Pipelines
    if (options.includePipelines && release.deployments) {
      md += `## 🚀 Deployed Pipelines\n\n`;
      Object.entries(release.deployments).forEach(([pipelineId, deployment]) => {
        const pipeline = project.pipelines.find(p => p.id === pipelineId);
        if (pipeline) {
          const repo = project.repositories.find(r => r.id === pipeline.repositoryId);
          md += `### ${pipeline.name}\n`;
          if (repo) {
            md += `- **Repository:** ${repo.owner}/${repo.repo}\n`;
          }
          md += `- **Branch:** ${pipeline.branch}\n`;
          if (pipeline.environment) {
            md += `- **Environment:** ${pipeline.environment}\n`;
          }
          md += `- **Workflow:** ${pipeline.workflowFile}\n`;
          if (deployment.buildNumber) {
            md += `- **Build Number:** ${deployment.buildNumber}\n`;
          }
          if (deployment.runId) {
            md += `- **Run ID:** ${deployment.runId}\n`;
          }
          if (deployment.deployedAt) {
            md += `- **Deployed At:** ${formatDate(deployment.deployedAt)}\n`;
          }
          md += `\n`;
        }
      });
    }

    // Sign-offs
    if (options.includeSignoffs) {
      md += `## ✍️ Sign-offs & Validations\n\n`;
      
      if (release.qaValidated) {
        md += `### QA Validation\n`;
        md += `- **Status:** ✅ Approved\n`;
        if (release.qaValidatedBy) {
          md += `- **Validated By:** ${release.qaValidatedBy}\n`;
        }
        if (release.qaValidatedAt) {
          md += `- **Date:** ${formatDate(release.qaValidatedAt)}\n`;
        }
        if (release.qaValidationNotes) {
          md += `- **Notes:** ${release.qaValidationNotes}\n`;
        }
        md += `\n`;
      }

      if (release.poValidated) {
        md += `### PO Validation\n`;
        md += `- **Status:** ✅ Approved\n`;
        if (release.poValidatedBy) {
          md += `- **Validated By:** ${release.poValidatedBy}\n`;
        }
        if (release.poValidatedAt) {
          md += `- **Date:** ${formatDate(release.poValidatedAt)}\n`;
        }
        if (release.poValidationNotes) {
          md += `- **Notes:** ${release.poValidationNotes}\n`;
        }
        md += `\n`;
      }

      if (release.complianceDocumented && release.complianceFiles) {
        md += `### Compliance Documentation\n`;
        md += `- **Status:** ✅ Documented\n`;
        md += `- **Files Attached:** ${release.complianceFiles.length}\n`;
        release.complianceFiles.forEach((file, index) => {
          md += `  ${index + 1}. ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n`;
        });
        md += `\n`;
      }
    }

    // Notes
    if (options.includeNotes) {
      md += `## 📝 Notes & Comments\n\n`;
      
      if (release.releaseNotesCreated && release.releaseNotes) {
        md += `### Release Notes\n`;
        md += `${release.releaseNotes}\n\n`;
      }

      if (release.teamNotified && release.notificationMessage) {
        md += `### Team Notification\n`;
        md += `${release.notificationMessage}\n\n`;
      }

      if (!release.releaseNotes && !release.notificationMessage) {
        md += `*No additional notes or comments.*\n\n`;
      }
    }

    // Metrics
    if (options.includeMetrics) {
      md += `## 📈 Metrics\n\n`;
      const completedSteps = [
        release.stagingDeployed,
        release.qaValidated,
        release.poValidated,
        release.productionDeployed,
        release.healthChecked,
        release.complianceDocumented,
        release.releaseNotesCreated,
        release.teamNotified,
        release.buildVersionsUpdated,
      ].filter(Boolean).length;
      
      md += `- **Steps Completed:** ${completedSteps}/9\n`;
      md += `- **Completion Rate:** ${Math.round((completedSteps / 9) * 100)}%\n`;
      
      if (totalDuration) {
        md += `- **Total Process Duration:** ${totalDuration}\n`;
      }

      if (release.stagingDeployedAt && release.productionDeployedAt) {
        const stagingToProd = calculateDuration(release.stagingDeployedAt, release.productionDeployedAt);
        md += `- **Staging to Production:** ${stagingToProd}\n`;
      }

      md += `\n`;
    }

    md += `---\n\n`;
    md += `*Report generated by GitHub Actions Deployment Manager*\n`;

    return md;
  };

  const generateHTML = () => {
    const md = generateMarkdown();
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Production Release Report: ${release.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #0f172a;
      color: #e2e8f0;
    }
    h1 {
      color: #e9d5ff;
      border-bottom: 3px solid #a78bfa;
      padding-bottom: 10px;
    }
    h2 {
      color: #c4b5fd;
      margin-top: 30px;
      border-bottom: 2px solid #6d28d9;
      padding-bottom: 8px;
    }
    h3 {
      color: #ddd6fe;
      margin-top: 20px;
    }
    ul, ol {
      padding-left: 20px;
    }
    li {
      margin: 8px 0;
    }
    code {
      background: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      color: #fbbf24;
    }
    hr {
      border: none;
      border-top: 1px solid #475569;
      margin: 30px 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .summary-item {
      background: #1e293b;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #a78bfa;
    }
    .summary-item strong {
      color: #c4b5fd;
      display: block;
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #475569;
    }
    th {
      background: #1e293b;
      color: #c4b5fd;
    }
    .status-complete {
      color: #4ade80;
    }
    .status-pending {
      color: #fbbf24;
    }
    @media print {
      body {
        background: white;
        color: black;
      }
      h1, h2, h3 {
        color: #1f2937;
      }
    }
  </style>
</head>
<body>
`;

    // Convert markdown to HTML (simple conversion)
    html += md
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.*$)/gm, '<p>$1</p>')
      .replace(/✅/g, '<span class="status-complete">✅</span>')
      .replace(/⏳/g, '<span class="status-pending">⏳</span>');

    html += `
</body>
</html>`;

    return html;
  };

  const generateJSON = () => {
    const data = {
      metadata: {
        generatedAt: new Date().toISOString(),
        reportVersion: '1.0',
        format: 'json',
      },
      release: {
        id: release.id,
        name: release.name,
        createdAt: release.createdAt,
        status: release.buildVersionsUpdated ? 'completed' : 'in-progress',
      },
      project: {
        id: project.id,
        name: project.name,
      },
      summary: {
        totalDuration: calculateTotalDuration(),
        pipelinesDeployed: Object.keys(release.deployments || {}).length,
        stepsCompleted: [
          release.stagingDeployed,
          release.qaValidated,
          release.poValidated,
          release.productionDeployed,
          release.healthChecked,
          release.complianceDocumented,
          release.releaseNotesCreated,
          release.teamNotified,
          release.buildVersionsUpdated,
        ].filter(Boolean).length,
      },
      timeline: options.includeTimeline ? [
        { step: 'Staging Deployed', completed: release.stagingDeployed, timestamp: release.stagingDeployedAt },
        { step: 'QA Validated', completed: release.qaValidated, timestamp: release.qaValidatedAt },
        { step: 'PO Validated', completed: release.poValidated, timestamp: release.poValidatedAt },
        { step: 'Production Deployed', completed: release.productionDeployed, timestamp: release.productionDeployedAt },
        { step: 'Health Checked', completed: release.healthChecked, timestamp: release.healthCheckedAt },
        { step: 'Compliance Documented', completed: release.complianceDocumented, timestamp: release.complianceDocumentedAt },
        { step: 'Release Notes Created', completed: release.releaseNotesCreated, timestamp: release.releaseNotesCreatedAt },
        { step: 'Team Notified', completed: release.teamNotified, timestamp: release.teamNotifiedAt },
        { step: 'Build Versions Updated', completed: release.buildVersionsUpdated, timestamp: release.buildVersionsUpdatedAt },
      ] : undefined,
      deployments: options.includePipelines ? Object.entries(release.deployments || {}).map(([pipelineId, deployment]) => {
        const pipeline = project.pipelines.find(p => p.id === pipelineId);
        const repo = pipeline ? project.repositories.find(r => r.id === pipeline.repositoryId) : undefined;
        return {
          pipelineId,
          pipelineName: pipeline?.name,
          repository: repo ? `${repo.owner}/${repo.repo}` : undefined,
          branch: pipeline?.branch,
          environment: pipeline?.environment,
          workflow: pipeline?.workflowFile,
          buildNumber: deployment.buildNumber,
          runId: deployment.runId,
          deployedAt: deployment.deployedAt,
        };
      }) : undefined,
      signoffs: options.includeSignoffs ? {
        qa: release.qaValidated ? {
          validated: true,
          validatedBy: release.qaValidatedBy,
          validatedAt: release.qaValidatedAt,
          notes: release.qaValidationNotes,
        } : null,
        po: release.poValidated ? {
          validated: true,
          validatedBy: release.poValidatedBy,
          validatedAt: release.poValidatedAt,
          notes: release.poValidationNotes,
        } : null,
        compliance: release.complianceDocumented ? {
          documented: true,
          filesCount: release.complianceFiles?.length || 0,
          files: release.complianceFiles?.map(f => ({ name: f.name, size: f.size })),
        } : null,
      } : undefined,
      notes: options.includeNotes ? {
        releaseNotes: release.releaseNotes,
        notificationMessage: release.notificationMessage,
      } : undefined,
      metrics: options.includeMetrics ? {
        completionRate: Math.round(([
          release.stagingDeployed,
          release.qaValidated,
          release.poValidated,
          release.productionDeployed,
          release.healthChecked,
          release.complianceDocumented,
          release.releaseNotesCreated,
          release.teamNotified,
          release.buildVersionsUpdated,
        ].filter(Boolean).length / 9) * 100),
        stagingToProductionDuration: release.stagingDeployedAt && release.productionDeployedAt 
          ? calculateDuration(release.stagingDeployedAt, release.productionDeployedAt)
          : null,
      } : undefined,
    };

    return JSON.stringify(data, null, 2);
  };

  const generateReport = () => {
    switch (format) {
      case 'markdown':
        return generateMarkdown();
      case 'html':
        return generateHTML();
      case 'json':
        return generateJSON();
    }
  };

  const handleCopyToClipboard = () => {
    const content = generateReport();
    navigator.clipboard.writeText(content).then(() => {
      toast.success('Report copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy report');
    });
  };

  const handleDownload = () => {
    const content = generateReport();
    const extensions = { markdown: 'md', html: 'html', json: 'json' };
    const mimeTypes = {
      markdown: 'text/markdown',
      html: 'text/html',
      json: 'application/json',
    };

    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release-report-${release.name}.${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Report downloaded as ${extensions[format].toUpperCase()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" style={{ background: '#0f172a', borderColor: '#475569' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#e9d5ff' }}>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: '#a78bfa' }} />
              Generate Release Report
            </div>
          </DialogTitle>
          <DialogDescription style={{ color: '#cbd5e1' }}>
            Create a comprehensive report for release "{release.name}". Choose format and customize content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label style={{ color: '#cbd5e1' }}>Report Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ReportFormat)}>
              <SelectTrigger style={{ background: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: '#1e293b', borderColor: '#475569' }}>
                <SelectItem value="markdown" style={{ color: '#e2e8f0' }}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Markdown (.md) - For GitHub/Docs
                  </div>
                </SelectItem>
                <SelectItem value="html" style={{ color: '#e2e8f0' }}>
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    HTML (.html) - Visual Report
                  </div>
                </SelectItem>
                <SelectItem value="json" style={{ color: '#e2e8f0' }}>
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4" />
                    JSON (.json) - Data Export
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Options */}
          <div className="space-y-3">
            <Label style={{ color: '#cbd5e1' }}>Include in Report</Label>
            <div className="space-y-2 p-4 rounded-lg border" style={{ background: '#1e293b', borderColor: '#475569' }}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="timeline"
                  checked={options.includeTimeline}
                  onCheckedChange={() => toggleOption('includeTimeline')}
                />
                <Label htmlFor="timeline" className="cursor-pointer" style={{ color: '#e2e8f0' }}>
                  ⏱️ Deployment Timeline
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pipelines"
                  checked={options.includePipelines}
                  onCheckedChange={() => toggleOption('includePipelines')}
                />
                <Label htmlFor="pipelines" className="cursor-pointer" style={{ color: '#e2e8f0' }}>
                  🚀 Pipeline Details
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="signoffs"
                  checked={options.includeSignoffs}
                  onCheckedChange={() => toggleOption('includeSignoffs')}
                />
                <Label htmlFor="signoffs" className="cursor-pointer" style={{ color: '#e2e8f0' }}>
                  ✍️ Sign-off Information
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notes"
                  checked={options.includeNotes}
                  onCheckedChange={() => toggleOption('includeNotes')}
                />
                <Label htmlFor="notes" className="cursor-pointer" style={{ color: '#e2e8f0' }}>
                  📝 Notes & Comments
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metrics"
                  checked={options.includeMetrics}
                  onCheckedChange={() => toggleOption('includeMetrics')}
                />
                <Label htmlFor="metrics" className="cursor-pointer" style={{ color: '#e2e8f0' }}>
                  📈 Metrics & Statistics
                </Label>
              </div>
            </div>
          </div>

          {/* Preview Info */}
          <div className="p-4 rounded-lg border" style={{ background: 'rgba(168, 85, 247, 0.1)', borderColor: '#a855f7' }}>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#a78bfa' }} />
              <p className="text-sm" style={{ color: '#e9d5ff' }}>
                Report will include {Object.values(options).filter(Boolean).length} section{Object.values(options).filter(Boolean).length !== 1 ? 's' : ''} 
                {' '}for release <strong>{release.name}</strong>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="flex-1"
              style={{ borderColor: '#475569', color: '#cbd5e1' }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button
              onClick={handleDownload}
              className="flex-1"
              style={{ background: '#7c3aed', color: 'white' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
