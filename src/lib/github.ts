// GitHub API integration
import { getGitHubToken } from "./storage";
import yaml from "js-yaml";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  head_branch: string;
  head_sha: string;
  head_commit?: {
    message: string;
    author: {
      name: string;
    };
  };
}

export interface WorkflowInput {
  name: string;
  description?: string;
  required?: boolean;
  type?: "string" | "choice" | "boolean" | "number" | "environment";
  default?: string | boolean | number;
  options?: string[];
}

async function githubFetch(
  endpoint: string,
  options: RequestInit = {},
) {
  const token = getGitHubToken();
  if (!token) {
    throw new Error("GitHub token not configured");
  }

  const response = await fetch(
    `${GITHUB_API_BASE}${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      error.message || `GitHub API error: ${response.status}`,
    );
  }

  // Handle 204 No Content responses (e.g., workflow dispatch)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function listWorkflows(
  owner: string,
  repo: string,
): Promise<GitHubWorkflow[]> {
  const data = await githubFetch(
    `/repos/${owner}/${repo}/actions/workflows`,
  );
  return data.workflows || [];
}

export async function triggerWorkflow(
  owner: string,
  repo: string,
  workflowFile: string,
  branch: string,
  inputs?: Record<string, string>,
): Promise<void> {
  await githubFetch(
    `/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      body: JSON.stringify({
        ref: branch,
        inputs: inputs || {},
      }),
    },
  );
}

export async function getWorkflowRuns(
  owner: string,
  repo: string,
  workflowFile: string,
  limit: number = 10,
  branch?: string,
): Promise<GitHubWorkflowRun[]> {
  let url = `/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?per_page=${limit}`;
  if (branch) {
    url += `&branch=${encodeURIComponent(branch)}`;
  }
  const data = await githubFetch(url);
  return data.workflow_runs || [];
}

export async function getWorkflowRun(
  owner: string,
  repo: string,
  runId: number,
): Promise<GitHubWorkflowRun> {
  return await githubFetch(
    `/repos/${owner}/${repo}/actions/runs/${runId}`,
  );
}

export async function findTriggeredWorkflowRun(
  owner: string,
  repo: string,
  workflowFile: string,
  buildNumber: string,
  branch: string,
  maxRetries: number = 5,
  delayMs: number = 2000,
): Promise<number | null> {
  // Try multiple times to find the run, as it may take a moment for GitHub to create it
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    try {
      // Get recent runs for this workflow on the specified branch
      const runs = await getWorkflowRuns(owner, repo, workflowFile, 20, branch);
      
      if (runs.length === 0) {
        continue;
      }

      // Strategy 1: Try to find a run with the build number in its name
      const runWithBuildNumber = runs.find(run => 
        run.name && run.name.includes(buildNumber)
      );
      if (runWithBuildNumber) {
        return runWithBuildNumber.id;
      }

      // Strategy 2: Find the most recent run that is queued or in_progress
      // (created within the last 30 seconds to avoid picking up old runs)
      const now = new Date().getTime();
      const recentRuns = runs.filter(run => {
        const createdAt = new Date(run.created_at).getTime();
        const ageSeconds = (now - createdAt) / 1000;
        return ageSeconds < 30 && (run.status === 'queued' || run.status === 'in_progress');
      });

      if (recentRuns.length > 0) {
        // Return the most recently created one
        const sortedByDate = recentRuns.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return sortedByDate[0].id;
      }

      // Strategy 3: If this is our last attempt, take the most recent run
      if (attempt === maxRetries - 1 && runs.length > 0) {
        return runs[0].id;
      }
    } catch (err) {
      console.error(`Attempt ${attempt + 1} to find workflow run failed:`, err);
    }
  }

  return null;
}

export async function createRelease(
  owner: string,
  repo: string,
  tagName: string,
  name: string,
  body: string,
  targetCommitish?: string,
): Promise<any> {
  return await githubFetch(`/repos/${owner}/${repo}/releases`, {
    method: "POST",
    body: JSON.stringify({
      tag_name: tagName,
      name,
      body,
      target_commitish: targetCommitish || "main",
      draft: false,
      prerelease: false,
    }),
  });
}

export async function listReleases(
  owner: string,
  repo: string,
  limit: number = 10,
): Promise<any[]> {
  return await githubFetch(
    `/repos/${owner}/${repo}/releases?per_page=${limit}`,
  );
}

export async function verifyToken(): Promise<{
  login: string;
  name: string;
}> {
  const data = await githubFetch("/user");
  return { login: data.login, name: data.name };
}

export async function getCommit(
  owner: string,
  repo: string,
  sha: string,
): Promise<any> {
  return await githubFetch(`/repos/${owner}/${repo}/commits/${sha}`);
}

export async function getLatestBuildForBranch(
  owner: string,
  repo: string,
  workflowFile: string,
  branch: string,
): Promise<{
  buildNumber?: string;
  commit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  status?: string;
  conclusion?: string;
  url?: string;
} | null> {
  try {
    const runs = await getWorkflowRuns(owner, repo, workflowFile, 1, branch);
    if (runs.length === 0) {
      return null;
    }

    const latestRun = runs[0];
    
    // Try to extract build number from the run name or get commit details
    const commit = await getCommit(owner, repo, latestRun.head_sha);
    
    return {
      buildNumber: latestRun.name,
      commit: {
        sha: latestRun.head_sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0], // First line only
        author: commit.commit.author.name,
        date: commit.commit.author.date,
      },
      status: latestRun.status,
      conclusion: latestRun.conclusion,
      url: latestRun.html_url,
    };
  } catch (err) {
    console.error('Failed to get latest build:', err);
    return null;
  }
}

export async function getLatestBuildsForBranch(
  owner: string,
  repo: string,
  workflowFile: string,
  branch: string,
  limit: number = 5,
): Promise<Array<{
  buildNumber?: string;
  commit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  status?: string;
  conclusion?: string;
  url?: string;
  runId?: number;
  createdAt?: string;
}>> {
  try {
    const runs = await getWorkflowRuns(owner, repo, workflowFile, limit, branch);
    if (runs.length === 0) {
      return [];
    }

    const builds = await Promise.all(
      runs.map(async (run) => {
        try {
          const commit = await getCommit(owner, repo, run.head_sha);
          
          return {
            buildNumber: run.name,
            commit: {
              sha: run.head_sha.substring(0, 7),
              message: commit.commit.message.split('\n')[0], // First line only
              author: commit.commit.author.name,
              date: commit.commit.author.date,
            },
            status: run.status,
            conclusion: run.conclusion,
            url: run.html_url,
            runId: run.id,
            createdAt: run.created_at,
          };
        } catch (err) {
          console.error(`Failed to get commit for run ${run.id}:`, err);
          return {
            buildNumber: run.name,
            status: run.status,
            conclusion: run.conclusion,
            url: run.html_url,
            runId: run.id,
            createdAt: run.created_at,
          };
        }
      })
    );

    return builds;
  } catch (err) {
    console.error('Failed to get latest builds:', err);
    return [];
  }
}

export async function getWorkflowFileContent(
  owner: string,
  repo: string,
  workflowFile: string,
): Promise<string> {
  const token = getGitHubToken();
  if (!token) {
    throw new Error("GitHub token not configured");
  }

  const path = workflowFile.startsWith('.github/workflows/') 
    ? workflowFile 
    : `.github/workflows/${workflowFile}`;

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/vnd.github.v3.raw",
      },
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      error.message || `Failed to fetch workflow file: ${response.status}`,
    );
  }

  return await response.text();
}

export async function getWorkflowInputs(
  owner: string,
  repo: string,
  workflowFile: string,
): Promise<WorkflowInput[]> {
  try {
    const content = await getWorkflowFileContent(owner, repo, workflowFile);
    const parsed = yaml.load(content) as any;

    if (!parsed?.on?.workflow_dispatch?.inputs) {
      return [];
    }

    const inputs: WorkflowInput[] = [];
    const inputsObj = parsed.on.workflow_dispatch.inputs;

    for (const [name, config] of Object.entries(inputsObj as Record<string, any>)) {
      inputs.push({
        name,
        description: config.description,
        required: config.required === true,
        type: config.type || "string",
        default: config.default,
        options: config.options,
      });
    }

    return inputs;
  } catch (err) {
    console.error('Failed to parse workflow inputs:', err);
    return [];
  }
}