/**
 * GET /check-github-remote endpoint - Check if project has a GitHub remote
 */

import type { Request, Response } from 'express';
import { execAsync, execEnv, getErrorMessage, logError } from './common.js';

const GIT_REMOTE_ORIGIN_COMMAND = 'git remote get-url origin';
const GH_REPO_VIEW_COMMAND = 'gh repo view --json name,owner';
const GITHUB_REPO_URL_PREFIX = 'https://github.com/';
const GITHUB_HTTPS_REMOTE_REGEX = /https:\/\/github\.com\/([^/]+)\/([^/.]+)/;
const GITHUB_SSH_REMOTE_REGEX = /git@github\.com:([^/]+)\/([^/.]+)/;

interface GhRepoViewResponse {
  name?: string;
  owner?: {
    login?: string;
  };
}

async function resolveRepoFromGh(projectPath: string): Promise<{
  owner: string;
  repo: string;
} | null> {
  try {
    const { stdout } = await execAsync(GH_REPO_VIEW_COMMAND, {
      cwd: projectPath,
      env: execEnv,
    });

    const data = JSON.parse(stdout) as GhRepoViewResponse;
    const owner = typeof data.owner?.login === 'string' ? data.owner.login : null;
    const repo = typeof data.name === 'string' ? data.name : null;

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

export interface GitHubRemoteStatus {
  hasGitHubRemote: boolean;
  remoteUrl: string | null;
  owner: string | null;
  repo: string | null;
}

export async function checkGitHubRemote(projectPath: string): Promise<GitHubRemoteStatus> {
  const status: GitHubRemoteStatus = {
    hasGitHubRemote: false,
    remoteUrl: null,
    owner: null,
    repo: null,
  };

  try {
    let remoteUrl = '';
    try {
      // Get the remote URL (origin by default)
      const { stdout } = await execAsync(GIT_REMOTE_ORIGIN_COMMAND, {
        cwd: projectPath,
        env: execEnv,
      });
      remoteUrl = stdout.trim();
      status.remoteUrl = remoteUrl || null;
    } catch {
      // Ignore missing origin remote
    }

    const ghRepo = await resolveRepoFromGh(projectPath);
    if (ghRepo) {
      status.hasGitHubRemote = true;
      status.owner = ghRepo.owner;
      status.repo = ghRepo.repo;
      if (!status.remoteUrl) {
        status.remoteUrl = `${GITHUB_REPO_URL_PREFIX}${ghRepo.owner}/${ghRepo.repo}`;
      }
      return status;
    }

    // Check if it's a GitHub URL
    // Formats: https://github.com/owner/repo.git, git@github.com:owner/repo.git
    if (!remoteUrl) {
      return status;
    }

    const httpsMatch = remoteUrl.match(GITHUB_HTTPS_REMOTE_REGEX);
    const sshMatch = remoteUrl.match(GITHUB_SSH_REMOTE_REGEX);

    const match = httpsMatch || sshMatch;
    if (match) {
      status.hasGitHubRemote = true;
      status.owner = match[1];
      status.repo = match[2].replace(/\.git$/, '');
    }
  } catch {
    // No remote or not a git repo - that's okay
  }

  return status;
}

export function createCheckGitHubRemoteHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath } = req.body;

      if (!projectPath) {
        res.status(400).json({ success: false, error: 'projectPath is required' });
        return;
      }

      const status = await checkGitHubRemote(projectPath);
      res.json({
        success: true,
        ...status,
      });
    } catch (error) {
      logError(error, 'Check GitHub remote failed');
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
