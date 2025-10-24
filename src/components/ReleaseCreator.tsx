import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Search, Tag as TagIcon } from 'lucide-react';
import { Repository } from '../lib/storage';
import { createRelease, listTags, GitHubTag } from '../lib/github';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

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
  const [tags, setTags] = useState<GitHubTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Fetch tags when repository changes
  useEffect(() => {
    if (repository) {
      fetchTags();
    }
  }, [repository]);

  const fetchTags = async () => {
    if (!repository) return;

    setLoadingTags(true);
    try {
      const fetchedTags = await listTags(repository.owner, repository.repo);
      setTags(fetchedTags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      // Don't show error to user, tags are optional
    } finally {
      setLoadingTags(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

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
          <Label htmlFor="tag-name" className="font-medium" style={{ color: '#6b21a8' }}>
            Tag Name <span style={{ color: '#ec4899' }}>*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="tag-name"
              placeholder="v1.0.0"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="border-2 flex-1"
              style={{ background: '#ffffff', color: '#1f2937', borderColor: '#c4b5fd' }}
            />
            <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-2"
                  style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
                  disabled={loadingTags || !repository}
                >
                  {loadingTags ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TagIcon className="w-4 h-4" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search tags..." 
                    value={tagSearch}
                    onValueChange={setTagSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup heading={`${filteredTags.length} tag${filteredTags.length !== 1 ? 's' : ''}`}>
                      {filteredTags.slice(0, 50).map((tag) => (
                        <CommandItem
                          key={tag.name}
                          value={tag.name}
                          onSelect={() => {
                            setTagName(tag.name);
                            setTagPickerOpen(false);
                            setTagSearch('');
                          }}
                        >
                          <TagIcon className="w-4 h-4 mr-2" style={{ color: '#7c3aed' }} />
                          <span>{tag.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs" style={{ color: '#7c3aed' }}>
            {tags.length > 0 
              ? `Select from ${tags.length} existing tags or create a new one`
              : 'The tag will be created if it doesn\'t exist'
            }
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="branch" className="font-medium" style={{ color: '#6b21a8' }}>
            Target Branch
          </Label>
          <Input
            id="branch"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="border-2"
            style={{ background: '#ffffff', color: '#1f2937', borderColor: '#c4b5fd' }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="release-name" className="font-medium" style={{ color: '#6b21a8' }}>
          Release Name <span style={{ color: '#ec4899' }}>*</span>
        </Label>
        <Input
          id="release-name"
          placeholder="Version 1.0.0 - Production Release"
          value={releaseName}
          onChange={(e) => setReleaseName(e.target.value)}
          className="border-2"
          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#c4b5fd' }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="release-notes" className="font-medium" style={{ color: '#6b21a8' }}>
          Release Notes
        </Label>
        <Textarea
          id="release-notes"
          placeholder="## What's Changed&#10;&#10;- Feature 1&#10;- Bug fix 2&#10;- Improvement 3&#10;&#10;**Full Changelog**: https://github.com/..."
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          rows={10}
          className="border-2 font-mono text-sm"
          style={{ background: '#ffffff', color: '#1f2937', borderColor: '#c4b5fd' }}
        />
        <p className="text-xs" style={{ color: '#7c3aed' }}>
          Supports Markdown formatting
        </p>
      </div>

      {error && (
        <Alert className="border-2" style={{ background: 'linear-gradient(to right, #fef2f2, #fce7f3)', borderColor: '#fda4af' }}>
          <AlertCircle className="h-4 w-4" style={{ color: '#ec4899' }} />
          <AlertDescription style={{ color: '#be123c' }}>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="border-2 hover:bg-purple-50"
          style={{ borderColor: '#c4b5fd', color: '#7c3aed' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={loading || !repository}
          className="text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}
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
