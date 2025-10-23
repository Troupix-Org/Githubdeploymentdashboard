// GitHub API integration
import { getGitHubToken } from "./storage";

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
): Promise<GitHubWorkflowRun[]> {
  const data = await githubFetch(
    `/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?per_page=${limit}`,
  );
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