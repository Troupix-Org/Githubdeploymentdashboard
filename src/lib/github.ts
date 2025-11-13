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

async function githubFetch(endpoint: string, options: RequestInit = {}) {
  const token = getGitHubToken();
  if (!token) {
    throw new Error("GitHub token not configured");
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  // Handle 204 No Content responses (e.g., workflow dispatch)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function listWorkflows(
  owner: string,
  repo: string
): Promise<GitHubWorkflow[]> {
  const data = await githubFetch(`/repos/${owner}/${repo}/actions/workflows`);
  return data.workflows || [];
}

export async function triggerWorkflow(
  owner: string,
  repo: string,
  workflowFile: string,
  branch: string,
  inputs?: Record<string, string>
): Promise<void> {
  await githubFetch(
    `/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      body: JSON.stringify({
        ref: branch,
        inputs: inputs || {},
      }),
    }
  );
}

export async function getWorkflowRuns(
  owner: string,
  repo: string,
  workflowFile: string,
  limit: number = 10,
  branch?: string
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
  runId: number
): Promise<GitHubWorkflowRun> {
  return await githubFetch(`/repos/${owner}/${repo}/actions/runs/${runId}`);
}

export async function findTriggeredWorkflowRun(
  owner: string,
  repo: string,
  workflowFile: string,
  buildNumber: string,
  branch: string,
  environment?: string,
  maxRetries: number = 3,
  delayMs: number = 3000
): Promise<number | null> {
  const searchKey = environment
    ? `Finding workflow run for build ${buildNumber} in environment ${environment} on branch ${branch}`
    : `Finding workflow run for build ${buildNumber} on branch ${branch}`;
  console.log(searchKey);

  // Initial delay to let GitHub register the workflow run
  console.log("Waiting 3 seconds for GitHub to register the workflow run...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Try multiple times to find the run, as it may take a moment for GitHub to create it
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      // Get recent runs for this workflow on the specified branch
      const runs = await getWorkflowRuns(owner, repo, workflowFile, 20, branch);

      if (runs.length === 0) {
        console.log(
          `Attempt ${attempt + 1}: No runs found on branch ${branch}`
        );
        continue;
      }

      console.log(
        `Attempt ${attempt + 1}: Found ${runs.length} runs on branch ${branch}`
      );

      // Filter runs created recently (within the last 60 seconds since the trigger)
      const now = new Date().getTime();
      const recentRuns = runs.filter((run) => {
        const createdAt = new Date(run.created_at).getTime();
        const ageSeconds = (now - createdAt) / 1000;
        return ageSeconds < 60; // Extended to 60 seconds to account for initial delay
      });

      if (recentRuns.length === 0) {
        console.log(
          `Attempt ${attempt + 1}: No recent runs found (< 60 seconds old)`
        );
        continue;
      }

      console.log(
        `Attempt ${attempt + 1}: Found ${recentRuns.length} recent runs`
      );

      // If environment is specified, filter by environment in run name
      let candidateRuns = recentRuns;
      if (environment) {
        const envFilteredRuns = recentRuns.filter((run) => {
          if (!run.name) return false;
          const nameLower = run.name.toLowerCase();
          const envLower = environment.toLowerCase();
          // Check if both build number and environment are in the run name
          return (
            nameLower.includes(buildNumber.toLowerCase()) &&
            nameLower.includes(envLower)
          );
        });

        if (envFilteredRuns.length > 0) {
          candidateRuns = envFilteredRuns;
          console.log(
            `Found ${envFilteredRuns.length} run(s) matching build number + environment`
          );
        } else {
          // If no exact match, try just environment
          const envOnlyRuns = recentRuns.filter(
            (run) =>
              run.name &&
              run.name.toLowerCase().includes(environment.toLowerCase())
          );
          if (envOnlyRuns.length > 0) {
            candidateRuns = envOnlyRuns;
            console.log(
              `Found ${envOnlyRuns.length} run(s) matching environment only`
            );
          }
        }
      } else {
        // If no environment, try to match by build number
        const buildNumberRuns = recentRuns.filter(
          (run) =>
            run.name &&
            run.name.toLowerCase().includes(buildNumber.toLowerCase())
        );
        if (buildNumberRuns.length > 0) {
          candidateRuns = buildNumberRuns;
          console.log(
            `Found ${buildNumberRuns.length} run(s) matching build number`
          );
        }
      }

      // Take the most recently created run from the candidates
      if (candidateRuns.length > 0) {
        const sortedByDate = candidateRuns.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const selectedRun = sortedByDate[0];
        console.log(
          `✓ Selected most recent run: #${selectedRun.id} (${selectedRun.status}) - "${selectedRun.name}" - Created: ${selectedRun.created_at}`
        );
        return selectedRun.id;
      }

      console.log(
        `Attempt ${attempt + 1}: No matching runs found, will retry...`
      );
    } catch (err) {
      console.error(
        `Attempt ${
          attempt + 1
        } to find workflow run on branch ${branch} failed:`,
        err
      );
    }
  }

  const warnMsg = environment
    ? `Failed to find workflow run for build ${buildNumber} in environment ${environment} on branch ${branch} after ${maxRetries} attempts`
    : `Failed to find workflow run for build ${buildNumber} on branch ${branch} after ${maxRetries} attempts`;
  console.warn(warnMsg);
  return null;
}

export async function createRelease(
  owner: string,
  repo: string,
  tagName: string,
  name: string,
  body: string,
  targetCommitish?: string
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
  limit: number = 10
): Promise<any[]> {
  return await githubFetch(
    `/repos/${owner}/${repo}/releases?per_page=${limit}`
  );
}

export async function verifyToken(): Promise<{
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
}> {
  const data = await githubFetch("/user");
  return {
    login: data.login,
    name: data.name,
    avatar_url: data.avatar_url,
    email: data.email,
  };
}

export async function getCommit(
  owner: string,
  repo: string,
  sha: string
): Promise<any> {
  return await githubFetch(`/repos/${owner}/${repo}/commits/${sha}`);
}

export async function getLatestBuildForBranch(
  owner: string,
  repo: string,
  workflowFile: string,
  branch: string
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

    // Use head_commit from the run response if available
    let commit:
      | { sha: string; message: string; author: string; date: string }
      | undefined;

    if (latestRun.head_commit) {
      commit = {
        sha: latestRun.head_sha.substring(0, 7),
        message: latestRun.head_commit.message.split("\n")[0], // First line only
        author: latestRun.head_commit.author.name,
        date: latestRun.created_at, // Use run created_at as fallback
      };
    } else {
      // Fallback: fetch commit details if not included in run
      const commitData = await getCommit(owner, repo, latestRun.head_sha);
      commit = {
        sha: latestRun.head_sha.substring(0, 7),
        message: commitData.commit.message.split("\n")[0],
        author: commitData.commit.author.name,
        date: commitData.commit.author.date,
      };
    }

    return {
      buildNumber: latestRun.name,
      commit,
      status: latestRun.status,
      conclusion: latestRun.conclusion || undefined,
      url: latestRun.html_url,
    };
  } catch (err) {
    console.error("Failed to get latest build:", err);
    return null;
  }
}

export async function getLatestBuildsForBranch(
  owner: string,
  repo: string,
  workflowFile: string,
  branch: string,
  limit: number = 5
): Promise<
  Array<{
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
  }>
> {
  try {
    const runs = await getWorkflowRuns(
      owner,
      repo,
      workflowFile,
      limit,
      branch
    );
    if (runs.length === 0) {
      return [];
    }

    // Use head_commit from runs response instead of making individual API calls
    const builds = runs.map((run) => {
      let commit:
        | { sha: string; message: string; author: string; date: string }
        | undefined;

      if (run.head_commit) {
        commit = {
          sha: run.head_sha.substring(0, 7),
          message: run.head_commit.message.split("\n")[0], // First line only
          author: run.head_commit.author.name,
          date: run.created_at, // Use run created_at as fallback
        };
      }

      return {
        buildNumber: run.name,
        commit,
        status: run.status,
        conclusion: run.conclusion || undefined,
        url: run.html_url,
        runId: run.id,
        createdAt: run.created_at,
      };
    });

    return builds;
  } catch (err) {
    console.error("Failed to get latest builds:", err);
    return [];
  }
}

export async function getWorkflowFileContent(
  owner: string,
  repo: string,
  workflowFile: string
): Promise<string> {
  const token = getGitHubToken();
  if (!token) {
    throw new Error("GitHub token not configured");
  }

  const path = workflowFile.startsWith(".github/workflows/")
    ? workflowFile
    : `.github/workflows/${workflowFile}`;

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Token ${token}`,
        Accept: "application/vnd.github.v3.raw",
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      error.message || `Failed to fetch workflow file: ${response.status}`
    );
  }

  return await response.text();
}

export async function getWorkflowInputs(
  owner: string,
  repo: string,
  workflowFile: string
): Promise<WorkflowInput[]> {
  try {
    const content = await getWorkflowFileContent(owner, repo, workflowFile);
    const parsed = yaml.load(content) as any;

    if (!parsed?.on?.workflow_dispatch?.inputs) {
      return [];
    }

    const inputs: WorkflowInput[] = [];
    const inputsObj = parsed.on.workflow_dispatch.inputs;

    for (const [name, config] of Object.entries(
      inputsObj as Record<string, any>
    )) {
      inputs.push({
        name,
        description: config.description,
        required: config.required === true,
        type: config.type || "string",
        default: config.default,
        // Convert all options to strings to handle YAML boolean parsing
        options: config.options
          ? config.options.map((opt: any) => String(opt))
          : undefined,
      });
    }

    return inputs;
  } catch (err) {
    console.error("Failed to parse workflow inputs:", err);
    return [];
  }
}

export interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
}

export async function listTags(
  owner: string,
  repo: string,
  limit: number = 100
): Promise<GitHubTag[]> {
  return await githubFetch(`/repos/${owner}/${repo}/tags?per_page=${limit}`);
}

export interface GitHubEnvironment {
  id: number;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export async function listEnvironments(
  owner: string,
  repo: string
): Promise<GitHubEnvironment[]> {
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/environments`);
    return data.environments || [];
  } catch (err) {
    console.error("Failed to fetch environments:", err);
    return [];
  }
}

export interface GitHubVariable {
  name: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubEnvironmentVariable extends GitHubVariable {
  // Additional properties specific to environment variables
}

// List repository actions variables
export async function listRepositoryVariables(
  owner: string,
  repo: string
): Promise<GitHubVariable[]> {
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/actions/variables`);
    return data.variables || [];
  } catch (err) {
    console.error("Failed to fetch repository variables:", err);
    return [];
  }
}

// List environment variables for a specific environment
export async function listEnvironmentVariables(
  owner: string,
  repo: string,
  environmentName: string
): Promise<GitHubEnvironmentVariable[]> {
  try {
    const data = await githubFetch(
      `/repos/${owner}/${repo}/environments/${environmentName}/variables`
    );
    return data.variables || [];
  } catch (err) {
    console.error("Failed to fetch environment variables:", err);
    return [];
  }
}

// Update repository variable
export async function updateRepositoryVariable(
  owner: string,
  repo: string,
  variableName: string,
  value: string
): Promise<void> {
  try {
    await githubFetch(
      `/repos/${owner}/${repo}/actions/variables/${variableName}`,
      {
        method: "PATCH",
        body: JSON.stringify({ value }),
      }
    );
  } catch (err) {
    console.error("Failed to update repository variable:", err);
    throw err;
  }
}

// Update environment variable
export async function updateEnvironmentVariable(
  owner: string,
  repo: string,
  environmentName: string,
  variableName: string,
  value: string
): Promise<void> {
  try {
    await githubFetch(
      `/repos/${owner}/${repo}/environments/${environmentName}/variables/${variableName}`,
      {
        method: "PATCH",
        body: JSON.stringify({ value }),
      }
    );
  } catch (err) {
    console.error("Failed to update environment variable:", err);
    throw err;
  }
}
