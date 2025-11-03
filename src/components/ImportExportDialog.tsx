import { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, CheckCircle2, Copy, Download, Upload, FileJson, Database, Settings } from 'lucide-react';
import { Project, exportProject, importProject, downloadProjectAsJson } from '../lib/storage';
import { toast } from 'sonner@2.0.3';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onImportSuccess: () => void;
}

export function ImportExportDialog({
  open,
  onOpenChange,
  project,
  onImportSuccess,
}: ImportExportDialogProps) {
  const [importJson, setImportJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportType, setExportType] = useState<'config' | 'full'>('config');
  const [importPreview, setImportPreview] = useState<{
    projectName: string;
    exportType: string;
    repoCount: number;
    pipelineCount: number;
    deploymentCount?: number;
    productionReleaseCount?: number;
    hasQaSignOffs?: boolean;
    hasPoApprovals?: boolean;
    hasComplianceFiles?: boolean;
  } | null>(null);

  const handleExport = () => {
    if (!project) return;
    
    const jsonString = exportProject(project, exportType === 'full');
    setImportJson(jsonString);
  };

  const handleCopyToClipboard = async () => {
    if (!project) return;
    
    const jsonString = exportProject(project, exportType === 'full');
    try {
      await navigator.clipboard.writeText(jsonString);
      const message = exportType === 'full' 
        ? 'Full project backup copied to clipboard!' 
        : 'Project configuration copied to clipboard!';
      toast.success(message);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    if (!project) return;
    downloadProjectAsJson(project, exportType === 'full');
    const message = exportType === 'full' 
      ? 'Full project backup downloaded!' 
      : 'Project configuration downloaded!';
    toast.success(message);
  };

  const analyzeImportData = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      
      if (!data.project || !data.project.name) {
        setImportPreview(null);
        return;
      }

      const preview = {
        projectName: data.project.name,
        exportType: data.exportType || 'config',
        repoCount: data.project.repositories?.length || 0,
        pipelineCount: data.project.pipelines?.length || 0,
      };

      if (data.exportType === 'full') {
        const deployments = data.deployments || [];
        const productionReleases = data.productionReleases || [];
        
        Object.assign(preview, {
          deploymentCount: deployments.length,
          productionReleaseCount: productionReleases.length,
          hasQaSignOffs: productionReleases.some((r: any) => r.qaSignOff),
          hasPoApprovals: productionReleases.some((r: any) => r.poSignOff),
          hasComplianceFiles: productionReleases.some((r: any) => r.complianceFile),
        });
      }

      setImportPreview(preview);
    } catch {
      setImportPreview(null);
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      setError('Please paste the JSON configuration');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await importProject(importJson);
      
      let successMessage = 'Project imported successfully!';
      if (importPreview) {
        if (importPreview.exportType === 'full') {
          successMessage += ` Imported ${importPreview.repoCount} repositories, ${importPreview.pipelineCount} pipelines`;
          if (importPreview.deploymentCount) {
            successMessage += `, ${importPreview.deploymentCount} deployments`;
          }
          if (importPreview.productionReleaseCount) {
            successMessage += `, and ${importPreview.productionReleaseCount} production releases`;
          }
          successMessage += '.';
        }
      }
      
      setSuccess(successMessage);
      setImportJson('');
      setImportPreview(null);
      
      setTimeout(() => {
        onImportSuccess();
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import project');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportJson(content);
      analyzeImportData(content);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] border-2 flex flex-col"
        style={{ background: 'linear-gradient(to bottom, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle style={{ color: '#6b21a8' }}>
            <FileJson className="w-5 h-5 inline mr-2" style={{ color: '#7c3aed' }} />
            Import / Export Project
          </DialogTitle>
          <DialogDescription style={{ color: '#7c3aed' }}>
            Share your project configuration or import from others
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={project ? 'export' : 'import'} className="w-full flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="export" disabled={!project}>Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 overflow-y-auto flex-1 mt-4">
            {project ? (
              <>
                <div className="space-y-3">
                  <Label style={{ color: '#374151' }}>Export Type</Label>
                  <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as 'config' | 'full')}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer hover:bg-purple-50/50" 
                         style={{ borderColor: exportType === 'config' ? '#7c3aed' : '#e5e7eb' }}
                         onClick={() => setExportType('config')}>
                      <RadioGroupItem value="config" id="config" />
                      <Label htmlFor="config" className="flex items-center gap-2 cursor-pointer flex-1" style={{ color: '#374151' }}>
                        <Settings className="w-4 h-4" style={{ color: '#7c3aed' }} />
                        <div className="flex-1">
                          <div className="font-semibold">Configuration Only</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>
                            Export project structure (repositories and pipelines) - for sharing with team
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border-2 cursor-pointer hover:bg-purple-50/50" 
                         style={{ borderColor: exportType === 'full' ? '#7c3aed' : '#e5e7eb' }}
                         onClick={() => setExportType('full')}>
                      <RadioGroupItem value="full" id="full" />
                      <Label htmlFor="full" className="flex items-center gap-2 cursor-pointer flex-1" style={{ color: '#374151' }}>
                        <Database className="w-4 h-4" style={{ color: '#7c3aed' }} />
                        <div className="flex-1">
                          <div className="font-semibold">Full Backup</div>
                          <div className="text-xs" style={{ color: '#6b7280' }}>
                            Export everything: configuration, deployments, production releases, and all process steps
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label style={{ color: '#374151' }}>
                    {exportType === 'full' ? 'Full Project Backup' : 'Project Configuration'}
                  </Label>
                  <Textarea
                    value={exportProject(project, exportType === 'full')}
                    readOnly
                    className="border-[#d1d5db] font-mono text-sm min-h-[300px] max-h-[400px]"
                    style={{ background: '#f9fafb', color: '#1f2937' }}
                  />
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    {exportType === 'full' 
                      ? 'This JSON contains your complete project data including all deployments, production releases, QA sign-offs, PO approvals, and compliance files.'
                      : 'This JSON contains your project configuration (repositories and pipelines). Share it with your team or save it for backup.'}
                  </p>
                </div>

                <div className="flex gap-3 pt-2 border-t border-[#e5e7eb] bg-white sticky bottom-0">
                  <Button
                    onClick={handleCopyToClipboard}
                    className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="flex-1 border-[#d1d5db] hover:bg-[#f3f4f6]"
                    style={{ color: '#374151' }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8" style={{ color: '#6b7280' }}>
                No project selected for export
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4 overflow-y-auto flex-1 mt-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4" style={{ color: '#2563eb' }} />
              <AlertDescription style={{ color: '#1e40af' }}>
                <div className="space-y-1">
                  <div>Importing supports both configuration-only and full backup exports.</div>
                  <div className="text-sm">
                    <strong>Configuration:</strong> repositories and pipelines only<br />
                    <strong>Full Backup:</strong> includes deployments, production releases, QA sign-offs, PO approvals, and compliance files
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label style={{ color: '#374151' }}>Import from File</Label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  variant="outline"
                  className="border-[#d1d5db] hover:bg-[#f3f4f6]"
                  style={{ color: '#374151' }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload JSON File
                </Button>
                {importJson && (
                  <span className="text-sm" style={{ color: '#10b981' }}>
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    File loaded
                  </span>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#e5e7eb]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2" style={{ background: '#ffffff', color: '#6b7280' }}>
                  Or paste JSON
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-json" style={{ color: '#374151' }}>
                Project Data JSON
              </Label>
              <Textarea
                id="import-json"
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  analyzeImportData(e.target.value);
                }}
                placeholder='{\n  "version": "2.0",\n  "exportType": "full",\n  "project": {\n    "name": "My Project",\n    ...\n  }\n}'
                className="border-[#d1d5db] font-mono text-sm min-h-[300px] max-h-[400px]"
                style={{ background: '#f9fafb', color: '#1f2937' }}
              />
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Paste the JSON data from another project (configuration or full backup)
              </p>
            </div>

            {importPreview && (
              <Alert className="border-purple-200 bg-purple-50">
                <CheckCircle2 className="h-4 w-4" style={{ color: '#7c3aed' }} />
                <AlertDescription style={{ color: '#6b21a8' }}>
                  <div className="space-y-1">
                    <div><strong>{importPreview.projectName}</strong> - {importPreview.exportType === 'full' ? 'Full Backup' : 'Configuration Only'}</div>
                    <div className="text-sm">
                      • {importPreview.repoCount} {importPreview.repoCount === 1 ? 'repository' : 'repositories'}
                      {' • '}
                      {importPreview.pipelineCount} {importPreview.pipelineCount === 1 ? 'pipeline' : 'pipelines'}
                      {importPreview.exportType === 'full' && (
                        <>
                          {importPreview.deploymentCount !== undefined && (
                            <>{' • '}{importPreview.deploymentCount} {importPreview.deploymentCount === 1 ? 'deployment' : 'deployments'}</>
                          )}
                          {importPreview.productionReleaseCount !== undefined && importPreview.productionReleaseCount > 0 && (
                            <>{' • '}{importPreview.productionReleaseCount} production {importPreview.productionReleaseCount === 1 ? 'release' : 'releases'}</>
                          )}
                        </>
                      )}
                    </div>
                    {importPreview.exportType === 'full' && (importPreview.hasQaSignOffs || importPreview.hasPoApprovals || importPreview.hasComplianceFiles) && (
                      <div className="text-sm">
                        Includes:
                        {importPreview.hasQaSignOffs && ' QA sign-offs'}
                        {importPreview.hasPoApprovals && (importPreview.hasQaSignOffs ? ',' : '') + ' PO approvals'}
                        {importPreview.hasComplianceFiles && ((importPreview.hasQaSignOffs || importPreview.hasPoApprovals) ? ',' : '') + ' compliance files'}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="border-[#ef4444] bg-[#fef2f2]">
                <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
                <AlertDescription style={{ color: '#dc2626' }}>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-[#10b981] bg-[#f0fdf4]">
                <CheckCircle2 className="h-4 w-4" style={{ color: '#10b981' }} />
                <AlertDescription style={{ color: '#059669' }}>{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-[#e5e7eb] bg-white sticky bottom-0">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[#d1d5db] hover:bg-[#f3f4f6]"
                style={{ color: '#374151' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={loading || !importJson.trim()}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                {loading ? 'Importing...' : 'Import Project'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
