import { Button } from './ui/button';
import { Github, LogOut } from 'lucide-react';
import { clearGitHubToken } from '../lib/storage';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const handleLogout = () => {
    if (confirm('Are you sure you want to logout? This will clear your GitHub token.')) {
      clearGitHubToken();
      onLogout();
    }
  };

  return (
    <header className="border-b border-[#e5e7eb]" style={{ background: '#ffffff' }}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: '#f3f4f6' }}>
              <Github className="w-6 h-6" style={{ color: '#1f2937' }} />
            </div>
            <div>
              <h1 style={{ color: '#1f2937' }}>GitHub Deploy Manager</h1>
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Manage your deployments and releases
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="hover:bg-[#f3f4f6]"
          >
            <LogOut className="w-4 h-4 mr-2" style={{ color: '#6b7280' }} />
            <span style={{ color: '#6b7280' }}>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
