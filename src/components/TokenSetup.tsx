import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Github, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { saveGitHubToken } from '../lib/storage';
import { verifyToken } from '../lib/github';

interface TokenSetupProps {
  onTokenSaved: () => void;
}

export function TokenSetup({ onTokenSaved }: TokenSetupProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Please enter a GitHub token');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Save token temporarily to test it
      saveGitHubToken(token);
      
      // Verify the token works
      const user = await verifyToken();
      
      setSuccess(true);
      setTimeout(() => {
        onTokenSaved();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify token');
      // Clear the token if verification failed
      saveGitHubToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1e2875 0%, #0d4a7a 100%)' }}>
      <Card className="w-full max-w-md border-[#e5e7eb]" style={{ background: '#ffffff' }}>
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full" style={{ background: '#f3f4f6' }}>
              <Github className="w-8 h-8" style={{ color: '#1f2937' }} />
            </div>
          </div>
          <CardTitle className="text-center" style={{ color: '#1f2937' }}>GitHub Deploy Manager</CardTitle>
          <CardDescription className="text-center" style={{ color: '#6b7280' }}>
            Enter your GitHub Personal Access Token to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" style={{ color: '#374151' }}>Personal Access Token</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4" style={{ color: '#9ca3af' }} />
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="pl-10 border-[#d1d5db]"
                style={{ background: '#f9fafb', color: '#1f2937' }}
                disabled={loading}
              />
            </div>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              Required scopes: <span style={{ color: '#2563eb' }}>repo, workflow</span>
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
              <AlertDescription style={{ color: '#059669' }}>
                Token verified successfully!
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
          >
            {loading ? 'Verifying...' : 'Save & Continue'}
          </Button>

          <div className="pt-4 border-t border-[#e5e7eb]">
            <p className="text-xs text-center" style={{ color: '#6b7280' }}>
              Don't have a token?{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#2563eb' }}
              >
                Create one here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
