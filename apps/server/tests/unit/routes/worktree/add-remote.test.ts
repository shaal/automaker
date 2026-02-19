import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Request, Response } from 'express';
import { createMockExpressContext } from '../../../utils/mocks.js';

// Mock child_process with importOriginal to keep other exports
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execFile: vi.fn(),
  };
});

// Mock util.promisify to return the function as-is so we can mock execFile
vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('util')>();
  return {
    ...actual,
    promisify: (fn: unknown) => fn,
  };
});

// Import handler after mocks are set up
import { createAddRemoteHandler } from '@/routes/worktree/routes/add-remote.js';
import { execFile } from 'child_process';

// Get the mocked execFile
const mockExecFile = execFile as Mock;

/**
 * Helper to create a standard mock implementation for git commands
 */
function createGitMock(options: {
  existingRemotes?: string[];
  addRemoteFails?: boolean;
  addRemoteError?: string;
  fetchFails?: boolean;
}): (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }> {
  const {
    existingRemotes = [],
    addRemoteFails = false,
    addRemoteError = 'git remote add failed',
    fetchFails = false,
  } = options;

  return (command: string, args: string[]) => {
    if (command === 'git' && args[0] === 'remote' && args.length === 1) {
      return Promise.resolve({ stdout: existingRemotes.join('\n'), stderr: '' });
    }
    if (command === 'git' && args[0] === 'remote' && args[1] === 'add') {
      if (addRemoteFails) {
        return Promise.reject(new Error(addRemoteError));
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    }
    if (command === 'git' && args[0] === 'fetch') {
      if (fetchFails) {
        return Promise.reject(new Error('fetch failed'));
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    }
    return Promise.resolve({ stdout: '', stderr: '' });
  };
}

describe('add-remote route', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    vi.clearAllMocks();

    const context = createMockExpressContext();
    req = context.req;
    res = context.res;
  });

  describe('input validation', () => {
    it('should return 400 if worktreePath is missing', async () => {
      req.body = { remoteName: 'origin', remoteUrl: 'https://github.com/user/repo.git' };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'worktreePath required',
      });
    });

    it('should return 400 if remoteName is missing', async () => {
      req.body = { worktreePath: '/test/path', remoteUrl: 'https://github.com/user/repo.git' };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'remoteName required',
      });
    });

    it('should return 400 if remoteUrl is missing', async () => {
      req.body = { worktreePath: '/test/path', remoteName: 'origin' };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'remoteUrl required',
      });
    });
  });

  describe('remote name validation', () => {
    it('should return 400 for empty remote name', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: '',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'remoteName required',
      });
    });

    it('should return 400 for remote name starting with dash', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: '-invalid',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error:
          'Invalid remote name. Must start with alphanumeric character and contain only letters, numbers, dashes, underscores, or periods.',
      });
    });

    it('should return 400 for remote name starting with period', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: '.invalid',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error:
          'Invalid remote name. Must start with alphanumeric character and contain only letters, numbers, dashes, underscores, or periods.',
      });
    });

    it('should return 400 for remote name with invalid characters', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'invalid name',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error:
          'Invalid remote name. Must start with alphanumeric character and contain only letters, numbers, dashes, underscores, or periods.',
      });
    });

    it('should return 400 for remote name exceeding 250 characters', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'a'.repeat(251),
        remoteUrl: 'https://github.com/user/repo.git',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error:
          'Invalid remote name. Must start with alphanumeric character and contain only letters, numbers, dashes, underscores, or periods.',
      });
    });

    it('should accept valid remote names with alphanumeric, dashes, underscores, and periods', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'my-remote_name.1',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      // Mock git remote to return empty list (no existing remotes)
      mockExecFile.mockImplementation(createGitMock({ existingRemotes: [] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      // Should not return 400 for invalid name
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });

  describe('remote URL validation', () => {
    it('should return 400 for empty remote URL', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: '',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'remoteUrl required',
      });
    });

    it('should return 400 for invalid remote URL', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'not-a-valid-url',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid remote URL. Must be a valid git URL (HTTPS, SSH, or git:// protocol).',
      });
    });

    it('should return 400 for URL exceeding 2048 characters', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/' + 'a'.repeat(2049) + '.git',
      };

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid remote URL. Must be a valid git URL (HTTPS, SSH, or git:// protocol).',
      });
    });

    it('should accept HTTPS URLs', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation(createGitMock({ existingRemotes: [] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('should accept HTTP URLs', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'http://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation(createGitMock({ existingRemotes: [] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('should accept SSH URLs', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'git@github.com:user/repo.git',
      };

      mockExecFile.mockImplementation(createGitMock({ existingRemotes: [] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('should accept git:// protocol URLs', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'git://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation(createGitMock({ existingRemotes: [] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('should accept ssh:// protocol URLs', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'ssh://git@github.com/user/repo.git',
      };

      mockExecFile.mockImplementation(createGitMock({ existingRemotes: [] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });

  describe('remote already exists check', () => {
    it('should return 400 with REMOTE_EXISTS code when remote already exists', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation(createGitMock({ existingRemotes: ['origin', 'upstream'] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Remote 'origin' already exists",
        code: 'REMOTE_EXISTS',
      });
    });

    it('should proceed if remote does not exist', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'new-remote',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation(createGitMock({ existingRemotes: ['origin'] }));

      const handler = createAddRemoteHandler();
      await handler(req, res);

      // Should call git remote add with array arguments
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['remote', 'add', 'new-remote', 'https://github.com/user/repo.git'],
        expect.any(Object)
      );
    });
  });

  describe('successful remote addition', () => {
    it('should add remote successfully with successful fetch', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'upstream',
        remoteUrl: 'https://github.com/other/repo.git',
      };

      mockExecFile.mockImplementation(
        createGitMock({ existingRemotes: ['origin'], fetchFails: false })
      );

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: {
          remoteName: 'upstream',
          remoteUrl: 'https://github.com/other/repo.git',
          fetched: true,
          message: "Successfully added remote 'upstream' and fetched its branches",
        },
      });
    });

    it('should add remote successfully even if fetch fails', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'upstream',
        remoteUrl: 'https://github.com/other/repo.git',
      };

      mockExecFile.mockImplementation(
        createGitMock({ existingRemotes: ['origin'], fetchFails: true })
      );

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: {
          remoteName: 'upstream',
          remoteUrl: 'https://github.com/other/repo.git',
          fetched: false,
          message:
            "Successfully added remote 'upstream' (fetch failed - you may need to fetch manually)",
        },
      });
    });

    it('should pass correct cwd option to git commands', async () => {
      req.body = {
        worktreePath: '/custom/worktree/path',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      const execCalls: { command: string; args: string[]; options: unknown }[] = [];
      mockExecFile.mockImplementation((command: string, args: string[], options: unknown) => {
        execCalls.push({ command, args, options });
        if (command === 'git' && args[0] === 'remote' && args.length === 1) {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const handler = createAddRemoteHandler();
      await handler(req, res);

      // Check that git remote was called with correct cwd
      expect((execCalls[0].options as { cwd: string }).cwd).toBe('/custom/worktree/path');
      // Check that git remote add was called with correct cwd
      expect((execCalls[1].options as { cwd: string }).cwd).toBe('/custom/worktree/path');
    });
  });

  describe('error handling', () => {
    it('should return 500 when git remote add fails', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation(
        createGitMock({
          existingRemotes: [],
          addRemoteFails: true,
          addRemoteError: 'git remote add failed',
        })
      );

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'git remote add failed',
      });
    });

    it('should continue adding remote if git remote check fails', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation((command: string, args: string[]) => {
        if (command === 'git' && args[0] === 'remote' && args.length === 1) {
          return Promise.reject(new Error('not a git repo'));
        }
        if (command === 'git' && args[0] === 'remote' && args[1] === 'add') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (command === 'git' && args[0] === 'fetch') {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const handler = createAddRemoteHandler();
      await handler(req, res);

      // Should still try to add remote with array arguments
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        ['remote', 'add', 'origin', 'https://github.com/user/repo.git'],
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: expect.objectContaining({
          remoteName: 'origin',
        }),
      });
    });

    it('should handle non-Error exceptions', async () => {
      req.body = {
        worktreePath: '/test/path',
        remoteName: 'origin',
        remoteUrl: 'https://github.com/user/repo.git',
      };

      mockExecFile.mockImplementation((command: string, args: string[]) => {
        if (command === 'git' && args[0] === 'remote' && args.length === 1) {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        if (command === 'git' && args[0] === 'remote' && args[1] === 'add') {
          return Promise.reject('String error');
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const handler = createAddRemoteHandler();
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
      });
    });
  });
});
