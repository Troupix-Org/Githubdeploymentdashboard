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
    <header className="border-b-2" style={{ background: 'linear-gradient(to right, #ffffff, #faf5ff)', borderColor: '#e9d5ff' }}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)' }}>
              <Github className="w-6 h-6" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h1 style={{ color: '#6b21a8' }}>GitHub Deploy Manager</h1>
              <p className="text-sm" style={{ color: '#7c3aed' }}>
                Manage your deployments and releases
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="hover:bg-purple-50"
          >
            <LogOut className="w-4 h-4 mr-2" style={{ color: '#7c3aed' }} />
            <span style={{ color: '#7c3aed' }}>Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
