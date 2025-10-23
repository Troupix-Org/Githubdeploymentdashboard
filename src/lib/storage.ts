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
