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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #7c3aed 50%, #a855f7 100%)' }}>
      <Card className="w-full max-w-md border-2 shadow-2xl" style={{ background: 'linear-gradient(to bottom, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
              <Github className="w-8 h-8" style={{ color: '#ffffff' }} />
            </div>
          </div>
          <CardTitle className="text-center" style={{ color: '#6b21a8' }}>GitHub Deploy Manager</CardTitle>
          <CardDescription className="text-center" style={{ color: '#7c3aed' }}>
            Enter your GitHub Personal Access Token to get started
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="font-medium" style={{ color: '#6b21a8' }}>Personal Access Token</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4" style={{ color: '#a855f7' }} />
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="pl-10 border-2"
                style={{ background: '#ffffff', color: '#1f2937', borderColor: '#c4b5fd' }}
                disabled={loading}
              />
            </div>
            <p className="text-xs" style={{ color: '#7c3aed' }}>
              Required scopes: <span className="font-semibold" style={{ color: '#a855f7' }}>repo, workflow</span>
            </p>
          </div>

          {error && (
            <Alert className="border-2" style={{ background: 'linear-gradient(to right, #fef2f2, #fce7f3)', borderColor: '#fda4af' }}>
              <AlertCircle className="h-4 w-4" style={{ color: '#ec4899' }} />
              <AlertDescription style={{ color: '#be123c' }}>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-2" style={{ background: 'linear-gradient(to right, #f0fdf4, #ede9fe)', borderColor: '#a7f3d0' }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: '#10b981' }} />
              <AlertDescription style={{ color: '#059669' }}>
                Token verified successfully!
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}
          >
            {loading ? 'Verifying...' : 'Save & Continue'}
          </Button>

          <div className="pt-4 border-t-2" style={{ borderColor: '#e9d5ff' }}>
            <p className="text-xs text-center" style={{ color: '#7c3aed' }}>
              Don't have a token?{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,workflow"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
                style={{ color: '#a855f7' }}
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
