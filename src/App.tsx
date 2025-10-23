import { useState, useEffect } from 'react';
import { TokenSetup } from './components/TokenSetup';
import { Header } from './components/Header';
import { ProjectList } from './components/ProjectList';
import { ProjectConfig } from './components/ProjectConfig';
import { DeploymentDashboard } from './components/DeploymentDashboard';
import { getGitHubToken } from './lib/storage';
import { Project } from './lib/storage';
import { Toaster } from './components/ui/sonner';

type View = 'projects' | 'config' | 'deploy';

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [view, setView] = useState<View>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  useEffect(() => {
    const token = getGitHubToken();
    setHasToken(!!token);
  }, []);

  const handleTokenSaved = () => {
    setHasToken(true);
  };

  const handleLogout = () => {
    setHasToken(false);
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
      <Header onLogout={handleLogout} />
      
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
