import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Request, Response } from 'express';
import { createMockExpressContext } from '../../../utils/mocks.js';

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    exec: vi.fn(),
  };
});

vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('util')>();
  return {
    ...actual,
    promisify: (fn: unknown) => fn,
  };
});

import { exec } from 'child_process';
import { createSwitchBranchHandler } from '@/routes/worktree/routes/switch-branch.js';

const mockExec = exec as Mock;

describe('switch-branch route', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    const context = createMockExpressContext();
    req = context.req;
    res = context.res;
  });

  it('should allow switching when only untracked files exist', async () => {
    req.body = {
      worktreePath: '/repo/path',
      branchName: 'feature/test',
    };

    mockExec.mockImplementation(async (command: string) => {
      if (command === 'git rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (command === 'git rev-parse --verify feature/test') {
        return { stdout: 'abc123\n', stderr: '' };
      }
      if (command === 'git status --porcelain') {
        return { stdout: '?? .automaker/\n?? notes.txt\n', stderr: '' };
      }
      if (command === 'git checkout "feature/test"') {
        return { stdout: '', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const handler = createSwitchBranchHandler();
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      result: {
        previousBranch: 'main',
        currentBranch: 'feature/test',
        message: "Switched to branch 'feature/test'",
      },
    });
    expect(mockExec).toHaveBeenCalledWith('git checkout "feature/test"', { cwd: '/repo/path' });
  });

  it('should block switching when tracked files are modified', async () => {
    req.body = {
      worktreePath: '/repo/path',
      branchName: 'feature/test',
    };

    mockExec.mockImplementation(async (command: string) => {
      if (command === 'git rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n', stderr: '' };
      }
      if (command === 'git rev-parse --verify feature/test') {
        return { stdout: 'abc123\n', stderr: '' };
      }
      if (command === 'git status --porcelain') {
        return { stdout: ' M src/index.ts\n?? notes.txt\n', stderr: '' };
      }
      if (command === 'git status --short') {
        return { stdout: ' M src/index.ts\n?? notes.txt\n', stderr: '' };
      }
      return { stdout: '', stderr: '' };
    });

    const handler = createSwitchBranchHandler();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error:
        'Cannot switch branches: you have uncommitted changes (M src/index.ts). Please commit your changes first.',
      code: 'UNCOMMITTED_CHANGES',
    });
  });
});
