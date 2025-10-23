import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Repository } from '../lib/storage';
import { createRelease } from '../lib/github';

interface ReleaseCreatorProps {
  repository?: Repository;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReleaseCreator({ repository, onSuccess, onCancel }: ReleaseCreatorProps) {
  const [tagName, setTagName] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!repository) {
      setError('Please select a repository');
      return;
    }

    if (!tagName || !releaseName) {
      setError('Please provide both tag name and release name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createRelease(
        repository.owner,
        repository.repo,
        tagName,
        releaseName,
        releaseNotes,
        branch
      );

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create release');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tag-name" style={{ color: '#374151' }}>
            Tag Name *
          </Label>
          <Input
            id="tag-name"
            placeholder="v1.0.0"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            className="border-[#d1d5db]"
            style={{ background: '#f9fafb', color: '#1f2937' }}
          />
          <p className="text-xs" style={{ color: '#6b7280' }}>
            The tag will be created if it doesn't exist
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch" style={{ color: '#374151' }}>
            Target Branch
          </Label>
          <Input
            id="branch"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border-[#d1d5db]"
            style={{ background: '#f9fafb', color: '#1f2937' }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="release-name" style={{ color: '#374151' }}>
          Release Name *
        </Label>
        <Input
          id="release-name"
          placeholder="Version 1.0.0 - Production Release"
          value={releaseName}
          onChange={(e) => setReleaseName(e.target.value)}
          className="border-[#d1d5db]"
          style={{ background: '#f9fafb', color: '#1f2937' }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="release-notes" style={{ color: '#374151' }}>
          Release Notes
        </Label>
        <Textarea
          id="release-notes"
          placeholder="## What's Changed&#10;&#10;- Feature 1&#10;- Bug fix 2&#10;- Improvement 3&#10;&#10;**Full Changelog**: https://github.com/..."
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          rows={10}
          className="border-[#d1d5db] font-mono text-sm"
          style={{ background: '#f9fafb', color: '#1f2937' }}
        />
        <p className="text-xs" style={{ color: '#6b7280' }}>
          Supports Markdown formatting
        </p>
      </div>

      {error && (
        <Alert className="border-[#ef4444] bg-[#fef2f2]">
          <AlertCircle className="h-4 w-4" style={{ color: '#ef4444' }} />
          <AlertDescription style={{ color: '#dc2626' }}>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="border-[#d1d5db] hover:bg-[#f3f4f6]"
          style={{ color: '#374151' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={loading || !repository}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Release...
            </>
          ) : (
            'Create Release'
          )}
        </Button>
      </div>
    </div>
  );
}
