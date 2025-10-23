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
import { AlertCircle, CheckCircle2, Copy, Download, Upload, FileJson } from 'lucide-react';
import { Project, exportProject, importProject, downloadProjectAsJson } from '../lib/storage';
import { toast } from 'sonner@2.0.3';

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

  const handleExport = () => {
    if (!project) return;
    
    const jsonString = exportProject(project);
    setImportJson(jsonString);
  };

  const handleCopyToClipboard = async () => {
    if (!project) return;
    
    const jsonString = exportProject(project);
    try {
      await navigator.clipboard.writeText(jsonString);
      toast.success('Project configuration copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    if (!project) return;
    downloadProjectAsJson(project);
    toast.success('Project configuration downloaded!');
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
      setSuccess('Project imported successfully!');
      setImportJson('');
      
      setTimeout(() => {
        onImportSuccess();
        onOpenChange(false);
      }, 1500);
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
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl border-[#e5e7eb]"
        style={{ background: '#ffffff' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#1f2937' }}>
            <FileJson className="w-5 h-5 inline mr-2" />
            Import / Export Project
          </DialogTitle>
          <DialogDescription style={{ color: '#6b7280' }}>
            Share your project configuration or import from others
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={project ? 'export' : 'import'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" disabled={!project}>Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            {project ? (
              <>
                <div className="space-y-2">
                  <Label style={{ color: '#374151' }}>Project Configuration</Label>
                  <Textarea
                    value={exportProject(project)}
                    readOnly
                    rows={12}
                    className="border-[#d1d5db] font-mono text-sm"
                    style={{ background: '#f9fafb', color: '#1f2937' }}
                  />
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    This JSON contains your project configuration (repositories and pipelines).
                    Share it with your team or save it for backup.
                  </p>
                </div>

                <div className="flex gap-3">
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

          <TabsContent value="import" className="space-y-4">
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
                Project Configuration JSON
              </Label>
              <Textarea
                id="import-json"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{\n  "version": "1.0",\n  "project": {\n    "name": "My Project",\n    ...\n  }\n}'
                rows={12}
                className="border-[#d1d5db] font-mono text-sm"
                style={{ background: '#f9fafb', color: '#1f2937' }}
              />
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Paste the JSON configuration from another project
              </p>
            </div>

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

            <div className="flex justify-end gap-3">
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
