import { useState, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { TokenSetup } from "./components/TokenSetup";
import { Header } from "./components/Header";
import { ProjectList } from "./components/ProjectList";
import { ProjectConfig } from "./components/ProjectConfig";
import { DeploymentDashboard } from "./components/DeploymentDashboard";
import { MultiProjectDashboard } from "./components/MultiProjectDashboard";
import {
  getGitHubToken,
  getGitHubUser,
  getProject,
  saveGitHubUser,
  GitHubUser,
  Project,
} from "./lib/storage";
import { Toaster } from "./components/ui/sonner";
import { verifyToken } from "./lib/github";

type View = "projects" | "config" | "deploy" | "dashboard";

function ExistingProjectRoute({ view }: { view: "config" | "deploy" }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>();

  useEffect(() => {
    let cancelled = false;

    setProject(undefined);
    if (!projectId) {
      setProject(null);
      return;
    }

    getProject(projectId)
      .then((loadedProject) => {
        if (!cancelled) setProject(loadedProject ?? null);
      })
      .catch((error: unknown) => {
        console.error("Failed to load project:", error);
        if (!cancelled) setProject(null);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (project === undefined) return <p>Loading project...</p>;
  if (!project) return <Navigate to="/projects" replace />;

  if (view === "deploy") {
    return (
      <DeploymentDashboard
        project={project}
        onBack={() => navigate("/projects")}
      />
    );
  }

  return (
    <ProjectConfig
      project={project}
      onBack={() => navigate("/projects")}
      onSaved={() => navigate("/projects")}
    />
  );
}

export default function App() {
  const [hasToken, setHasToken] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const view: View =
    location.pathname === "/dashboard"
      ? "dashboard"
      : location.pathname.endsWith("/config") ||
          location.pathname === "/projects/new"
        ? "config"
        : location.pathname.endsWith("/deploy")
          ? "deploy"
          : "projects";

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
            console.error("Failed to fetch user details:", err);
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
    navigate("/projects", { replace: true });
  };

  const handleConfigureProject = (project: Project) => {
    navigate(`/projects/${encodeURIComponent(project.id)}/config`);
  };

  const handleSelectProject = (project: Project) => {
    navigate(`/projects/${encodeURIComponent(project.id)}/deploy`);
  };

  if (!hasToken) {
    return <TokenSetup onTokenSaved={handleTokenSaved} />;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      <Header
        user={user}
        onLogout={handleLogout}
        currentView={view}
        onNavigate={(nextView) =>
          navigate(nextView === "dashboard" ? "/dashboard" : "/projects")
        }
      />

      <main className="container mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route
            path="/projects"
            element={
              <ProjectList
                onAddProject={() => navigate("/projects/new")}
                onSelectProject={handleSelectProject}
                onConfigureProject={handleConfigureProject}
              />
            }
          />
          <Route
            path="/projects/new"
            element={
              <ProjectConfig
                onBack={() => navigate("/projects")}
                onSaved={() => navigate("/projects")}
              />
            }
          />
          <Route
            path="/projects/:projectId/config"
            element={<ExistingProjectRoute view="config" />}
          />
          <Route
            path="/projects/:projectId/deploy"
            element={<ExistingProjectRoute view="deploy" />}
          />
          <Route
            path="/dashboard"
            element={
              <MultiProjectDashboard
                onNavigateToProject={handleSelectProject}
              />
            }
          />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </main>

      <Toaster />
    </div>
  );
}
