// IndexedDB storage for projects and pipelines
const DB_NAME = 'github-deploy-db';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

export interface Pipeline {
  id: string;
  name: string;
  workflowFile: string;
  branch: string;
  repositoryId: string;
}

export interface Repository {
  id: string;
  name: string;
  owner: string;
  repo: string;
}

export interface Project {
  id: string;
  name: string;
  repositories: Repository[];
  pipelines: Pipeline[];
  createdAt: number;
}

export interface Deployment {
  id: string;
  projectId: string;
  pipelineId: string;
  repositoryId: string;
  buildNumber: string;
  status: 'pending' | 'in_progress' | 'success' | 'failure';
  workflowRunId?: number;
  startedAt: number;
  completedAt?: number;
}

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Projects CRUD
export async function saveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.put(project);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// GitHub token storage (localStorage)
const TOKEN_KEY = 'github_token';

export function saveGitHubToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getGitHubToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearGitHubToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Deployments storage (localStorage for POC)
const DEPLOYMENTS_KEY = 'deployments';

export function getDeployments(): Deployment[] {
  const data = localStorage.getItem(DEPLOYMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveDeployment(deployment: Deployment): void {
  const deployments = getDeployments();
  const index = deployments.findIndex(d => d.id === deployment.id);
  
  if (index >= 0) {
    deployments[index] = deployment;
  } else {
    deployments.push(deployment);
  }
  
  localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(deployments));
}

export function getDeploymentsByProject(projectId: string): Deployment[] {
  return getDeployments().filter(d => d.projectId === projectId);
}

// Project Import/Export
export function exportProject(project: Project): string {
  // Create a clean export without deployments
  const exportData = {
    version: '1.0',
    project: {
      name: project.name,
      repositories: project.repositories,
      pipelines: project.pipelines,
    },
    exportedAt: new Date().toISOString(),
  };
  
  return JSON.stringify(exportData, null, 2);
}

export async function importProject(jsonString: string): Promise<Project> {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate the structure
    if (!data.project || !data.project.name) {
      throw new Error('Invalid project format: missing project name');
    }
    
    if (!Array.isArray(data.project.repositories)) {
      throw new Error('Invalid project format: repositories must be an array');
    }
    
    if (!Array.isArray(data.project.pipelines)) {
      throw new Error('Invalid project format: pipelines must be an array');
    }
    
    // Generate new IDs for the imported project
    const newProject: Project = {
      id: Date.now().toString(),
      name: data.project.name,
      repositories: data.project.repositories.map((repo: any) => ({
        ...repo,
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      })),
      pipelines: [],
      createdAt: Date.now(),
    };
    
    // Update pipeline repository IDs to match new repository IDs
    const oldToNewRepoIds = new Map<string, string>();
    data.project.repositories.forEach((oldRepo: any, index: number) => {
      oldToNewRepoIds.set(oldRepo.id, newProject.repositories[index].id);
    });
    
    newProject.pipelines = data.project.pipelines.map((pipeline: any) => ({
      ...pipeline,
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      repositoryId: oldToNewRepoIds.get(pipeline.repositoryId) || newProject.repositories[0]?.id || '',
    }));
    
    // Save the imported project
    await saveProject(newProject);
    
    return newProject;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw err;
  }
}

export function downloadProjectAsJson(project: Project): void {
  const jsonString = exportProject(project);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_config.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
