// IndexedDB storage for projects and pipelines
const DB_NAME = 'github-deploy-db';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

export interface Pipeline {
  id: string;
  name: string;
  workflowFile: string;
  branch: string;
  environment?: string; // Environment name (qa, staging, prod, etc.) - optional for backward compatibility
  repositoryId: string;
  defaultInputValues?: Record<string, any>; // Default values for workflow inputs
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
  isProductionRelease?: boolean; // Flag to indicate if this is a production release project
}

export interface Deployment {
  id: string;
  projectId: string;
  pipelineId: string;
  repositoryId: string;
  buildNumber: string;
  branch: string; // The branch where this was triggered (develop, main, etc.)
  environment?: string; // The environment where this was deployed (qa, staging, prod, etc.)
  globalReleaseNumber?: string; // Global release number that encompasses all pipeline builds
  batchId?: string; // Groups deployments triggered together in the same session
  productionReleaseId?: string; // Link to ProductionRelease if part of production release process
  status: 'pending' | 'in_progress' | 'success' | 'failure';
  workflowRunId?: number;
  startedAt: number;
  completedAt?: number;
}

export interface ProductionReleaseStep {
  stepId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: number;
  completedBy?: string;
  notes?: string;
  metadata?: Record<string, any>; // For storing step-specific data (emails sent, sign-offs, etc.)
}

export interface ProductionRelease {
  id: string;
  releaseNumber: string; // e.g., "2025.10.1" or custom format
  projectId: string;
  createdAt: number;
  createdBy?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  steps: ProductionReleaseStep[]; // State of the 8 steps
  deploymentIds: string[]; // Associated deployment IDs
  stagingDeploymentIds?: string[]; // Specific staging deployments
  productionDeploymentIds?: string[]; // Specific production deployments
  qaSignOff?: {
    testerName: string;
    testDate: string;
    testEnvironment: 'staging' | 'production';
    testsPassed: boolean;
    comments: string;
  };
  poSignOff?: {
    ownerName: string;
    approvalDate: string;
    comments: string;
  };
  complianceFile?: {
    fileName: string;
    fileContent: string;
    uploadDate: string;
  };
  emailRecipients?: {
    staging?: string;
    production?: string;
  };
  notes?: string;
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

export function deleteDeployment(deploymentId: string): void {
  const deployments = getDeployments();
  const filtered = deployments.filter(d => d.id !== deploymentId);
  localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(filtered));
}

export function deleteDeploymentsByBatch(batchId: string): void {
  const deployments = getDeployments();
  const filtered = deployments.filter(d => d.batchId !== batchId);
  localStorage.setItem(DEPLOYMENTS_KEY, JSON.stringify(filtered));
}

// Project Import/Export
export function exportProject(project: Project, includeFull: boolean = false): string {
  // Base export data with project configuration
  const exportData: any = {
    version: '2.0',
    exportType: includeFull ? 'full' : 'config',
    project: {
      name: project.name,
      repositories: project.repositories,
      pipelines: project.pipelines,
      isProductionRelease: project.isProductionRelease,
    },
    exportedAt: new Date().toISOString(),
  };
  
  // If full export, include deployments and production releases
  if (includeFull) {
    // Get all deployments for this project
    const deployments = getDeploymentsByProject(project.id);
    exportData.deployments = deployments;
    
    // Get all production releases for this project (if it's a production release project)
    if (project.isProductionRelease) {
      const productionReleases = getProductionReleasesByProject(project.id);
      exportData.productionReleases = productionReleases;
    }
  }
  
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
    const newProjectId = Date.now().toString();
    const newProject: Project = {
      id: newProjectId,
      name: data.project.name,
      repositories: data.project.repositories.map((repo: any) => ({
        ...repo,
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      })),
      pipelines: [],
      createdAt: Date.now(),
      isProductionRelease: data.project.isProductionRelease || false,
    };
    
    // Update pipeline repository IDs to match new repository IDs
    const oldToNewRepoIds = new Map<string, string>();
    data.project.repositories.forEach((oldRepo: any, index: number) => {
      oldToNewRepoIds.set(oldRepo.id, newProject.repositories[index].id);
    });
    
    // Map old pipeline IDs to new ones
    const oldToNewPipelineIds = new Map<string, string>();
    
    newProject.pipelines = data.project.pipelines.map((pipeline: any) => {
      // Validate required pipeline fields
      if (!pipeline.name || !pipeline.workflowFile || !pipeline.branch) {
        console.warn('Pipeline missing required fields:', pipeline);
      }
      
      const newPipelineId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      oldToNewPipelineIds.set(pipeline.id, newPipelineId);
      
      return {
        ...pipeline,
        id: newPipelineId,
        repositoryId: oldToNewRepoIds.get(pipeline.repositoryId) || newProject.repositories[0]?.id || '',
      };
    });
    
    // Save the imported project
    await saveProject(newProject);
    
    // If this is a full export, restore deployments and production releases
    if (data.exportType === 'full') {
      // Import deployments
      if (Array.isArray(data.deployments)) {
        const oldToNewDeploymentIds = new Map<string, string>();
        
        data.deployments.forEach((deployment: Deployment) => {
          const newDeploymentId = `deployment_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          oldToNewDeploymentIds.set(deployment.id, newDeploymentId);
          
          const newDeployment: Deployment = {
            ...deployment,
            id: newDeploymentId,
            projectId: newProjectId,
            pipelineId: oldToNewPipelineIds.get(deployment.pipelineId) || deployment.pipelineId,
            repositoryId: oldToNewRepoIds.get(deployment.repositoryId) || deployment.repositoryId,
          };
          
          saveDeployment(newDeployment);
        });
        
        // Import production releases if present
        if (newProject.isProductionRelease && Array.isArray(data.productionReleases)) {
          data.productionReleases.forEach((release: ProductionRelease) => {
            const newRelease: ProductionRelease = {
              ...release,
              id: `prod_release_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              projectId: newProjectId,
              deploymentIds: release.deploymentIds.map(oldId => 
                oldToNewDeploymentIds.get(oldId) || oldId
              ),
              stagingDeploymentIds: release.stagingDeploymentIds?.map(oldId => 
                oldToNewDeploymentIds.get(oldId) || oldId
              ),
              productionDeploymentIds: release.productionDeploymentIds?.map(oldId => 
                oldToNewDeploymentIds.get(oldId) || oldId
              ),
            };
            
            saveProductionRelease(newRelease);
          });
        }
      }
    }
    
    return newProject;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Invalid JSON format');
    }
    throw err;
  }
}

export function downloadProjectAsJson(project: Project, includeFull: boolean = false): void {
  const jsonString = exportProject(project, includeFull);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const suffix = includeFull ? '_full_backup' : '_config';
  link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}${suffix}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Production Releases storage (localStorage for POC)
const PRODUCTION_RELEASES_KEY = 'production_releases';

export function getProductionReleases(): ProductionRelease[] {
  const data = localStorage.getItem(PRODUCTION_RELEASES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveProductionRelease(release: ProductionRelease): void {
  const releases = getProductionReleases();
  const index = releases.findIndex(r => r.id === release.id);
  
  if (index >= 0) {
    releases[index] = release;
  } else {
    releases.push(release);
  }
  
  localStorage.setItem(PRODUCTION_RELEASES_KEY, JSON.stringify(releases));
}

export function getProductionReleaseById(id: string): ProductionRelease | undefined {
  return getProductionReleases().find(r => r.id === id);
}

export function getProductionReleasesByProject(projectId: string): ProductionRelease[] {
  return getProductionReleases().filter(r => r.projectId === projectId);
}

export function deleteProductionRelease(id: string): void {
  const releases = getProductionReleases();
  const filtered = releases.filter(r => r.id !== id);
  localStorage.setItem(PRODUCTION_RELEASES_KEY, JSON.stringify(filtered));
}

export function generateReleaseNumber(projectId: string): string {
  const releases = getProductionReleasesByProject(projectId);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Find releases from the current month
  const prefix = `${year}.${month}`;
  const currentMonthReleases = releases.filter(r => 
    r.releaseNumber.startsWith(prefix)
  );
  
  // Extract the sequence number and find the max
  let maxSequence = 0;
  currentMonthReleases.forEach(r => {
    const parts = r.releaseNumber.split('.');
    if (parts.length >= 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSequence) {
        maxSequence = seq;
      }
    }
  });
  
  return `${prefix}.${maxSequence + 1}`;
}

export function createProductionRelease(projectId: string, customReleaseNumber?: string): ProductionRelease {
  const releaseNumber = customReleaseNumber || generateReleaseNumber(projectId);
  
  const release: ProductionRelease = {
    id: `prod_release_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    releaseNumber,
    projectId,
    createdAt: Date.now(),
    status: 'draft',
    steps: [
      { stepId: 1, status: 'pending' },
      { stepId: 2, status: 'pending' },
      { stepId: 3, status: 'pending' },
      { stepId: 4, status: 'pending' },
      { stepId: 5, status: 'pending' },
      { stepId: 6, status: 'pending' },
      { stepId: 7, status: 'pending' },
      { stepId: 8, status: 'pending' },
    ],
    deploymentIds: [],
  };
  
  saveProductionRelease(release);
  return release;
}
