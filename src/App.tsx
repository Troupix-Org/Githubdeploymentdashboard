import { useState, useEffect } from 'react';
import { TokenSetup } from './components/TokenSetup';
import { Header } from './components/Header';
import { ProjectList } from './components/ProjectList';
import { ProjectConfig } from './components/ProjectConfig';
import { DeploymentDashboard } from './components/DeploymentDashboard';
import { getGitHubToken, getGitHubUser, saveGitHubUser, GitHubUser } from './lib/storage';
import { Project } from './lib/storage';
import { Toaster } from './components/ui/sonner';
import { verifyToken } from './lib/github';

type View = 'projects' | 'config' | 'deploy';

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [view, setView] = useState<View>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  useEffect(() => {
    const initializeApp = async () => {
      const token = getGitHubToken();
      if (token) {
        setHasToken(true);
        
        // Try to load user from storage
        let storedUser = getGitHubUser();
        
        // If no stored user, fetch from API
        if (!storedUser) {
          try {
            storedUser = await verifyToken();
            saveGitHubUser(storedUser);
          } catch (err) {
            console.error('Failed to fetch user details:', err);
          }
        }
        
        setUser(storedUser);
      }
    };
    
    initializeApp();
  }, []);

  const handleTokenSaved = async () => {
    setHasToken(true);
    
    // Load user details after token is saved
    const storedUser = getGitHubUser();
    setUser(storedUser);
  };

  const handleLogout = () => {
    setHasToken(false);
    setUser(null);
    setView('projects');
    setSelectedProject(undefined);
    setEditingProject(undefined);
  };

  const handleAddProject = () => {
    setEditingProject(undefined);
    setView('config');
  };

  const handleConfigureProject = (project: Project) => {
    setEditingProject(project);
    setView('config');
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setView('deploy');
  };

  const handleBackToProjects = () => {
    setView('projects');
    setSelectedProject(undefined);
    setEditingProject(undefined);
  };

  const handleProjectSaved = () => {
    setView('projects');
    setEditingProject(undefined);
  };

  if (!hasToken) {
    return <TokenSetup onTokenSaved={handleTokenSaved} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <Header user={user} onLogout={handleLogout} />
      
      <main className="container mx-auto px-6 py-8">
        {view === 'projects' && (
          <ProjectList
            onAddProject={handleAddProject}
            onSelectProject={handleSelectProject}
            onConfigureProject={handleConfigureProject}
          />
        )}

        {view === 'config' && (
          <ProjectConfig
            project={editingProject}
            onBack={handleBackToProjects}
            onSaved={handleProjectSaved}
          />
        )}

        {view === 'deploy' && selectedProject && (
          <DeploymentDashboard
            project={selectedProject}
            onBack={handleBackToProjects}
          />
        )}
      </main>

      <Toaster />
    </div>
  );
}
