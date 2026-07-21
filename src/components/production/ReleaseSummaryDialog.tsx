import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Download, CheckCircle2, XCircle } from "lucide-react";
import {
  SummaryData,
  formatSummaryAsMarkdown,
  formatSummaryAsText,
  formatSummaryAsJson,
  formatSummaryAsHtml,
  generateFilename,
  downloadFile,
} from "../../lib/releaseSummary";

interface ReleaseSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: SummaryData;
}

export function ReleaseSummaryDialog({
  open,
  onOpenChange,
  summary,
}: ReleaseSummaryDialogProps) {
  const handleDownload = (format: "md" | "txt" | "json" | "html") => {
    let content = "";

    switch (format) {
      case "md":
        content = formatSummaryAsMarkdown(summary);
        break;
      case "txt":
        content = formatSummaryAsText(summary);
        break;
      case "json":
        content = formatSummaryAsJson(summary);
        break;
      case "html":
        content = formatSummaryAsHtml(summary);
        break;
    }

    const filename = generateFilename(summary.batchId, format);
    downloadFile(content, filename);
  };

  const successCount = summary.successCount;
  const failureCount = summary.failureCount;
  const totalCount = successCount + failureCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Release Summary</DialogTitle>
          <DialogDescription>Batch ID: {summary.batchId}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Release Notes Section */}
          {summary.releaseNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Release Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm bg-slate-50 p-3 rounded border border-slate-200">
                  {summary.releaseNotes}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deployment Summary Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deployment Summary</CardTitle>
              <CardDescription className="text-xs">
                {summary.timestamp}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Overview */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm font-semibold text-blue-900">
                    Total
                  </div>
                  <div className="text-xl font-bold text-blue-700">
                    {totalCount}
                  </div>
                </div>
                <div className="p-2 bg-green-50 rounded border border-green-200">
                  <div className="text-sm font-semibold text-green-900">
                    Succeeded
                  </div>
                  <div className="text-xl font-bold text-green-700">
                    {successCount}
                  </div>
                </div>
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <div className="text-sm font-semibold text-red-900">
                    Failed
                  </div>
                  <div className="text-xl font-bold text-red-700">
                    {failureCount}
                  </div>
                </div>
              </div>

              {/* Pipeline Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="px-3 py-2 text-left font-semibold">
                        Pipeline
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Environment
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Build
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-semibold">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.pipelines.map((pipeline, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-200 ${
                          pipeline.status === "success"
                            ? "bg-green-50 hover:bg-green-100"
                            : "bg-red-50 hover:bg-red-100"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">
                          {pipeline.name}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {pipeline.environment || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono">
                          {pipeline.buildNumber || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            className="flex w-fit items-center gap-1"
                            variant={
                              pipeline.status === "success"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {pipeline.status === "success" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {pipeline.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {pipeline.duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Download Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Export Release Summary
              </CardTitle>
              <CardDescription>
                Download the release summary in your preferred format
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownload("md")}
                >
                  <Download className="w-4 h-4" />
                  Markdown
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownload("txt")}
                >
                  <Download className="w-4 h-4" />
                  Plain Text
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownload("json")}
                >
                  <Download className="w-4 h-4" />
                  JSON
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownload("html")}
                >
                  <Download className="w-4 h-4" />
                  HTML
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
