import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, GitMerge, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getElectronAPI } from '@/lib/electron';
import { toast } from 'sonner';

interface WorktreeInfo {
  path: string;
  branch: string;
  isMain: boolean;
  hasChanges?: boolean;
  changedFilesCount?: number;
}

interface MergeWorktreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  worktree: WorktreeInfo | null;
  onMerged: (mergedWorktree: WorktreeInfo) => void;
  /** Number of features assigned to this worktree's branch */
  affectedFeatureCount?: number;
}

type DialogStep = 'confirm' | 'verify';

export function MergeWorktreeDialog({
  open,
  onOpenChange,
  projectPath,
  worktree,
  onMerged,
  affectedFeatureCount = 0,
}: MergeWorktreeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<DialogStep>('confirm');
  const [confirmText, setConfirmText] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoading(false);
      setStep('confirm');
      setConfirmText('');
    }
  }, [open]);

  const handleProceedToVerify = () => {
    setStep('verify');
  };

  const handleMerge = async () => {
    if (!worktree) return;

    setIsLoading(true);
    try {
      const api = getElectronAPI();
      if (!api?.worktree?.mergeFeature) {
        toast.error('Worktree API not available');
        return;
      }

      // Pass branchName and worktreePath directly to the API
      const result = await api.worktree.mergeFeature(projectPath, worktree.branch, worktree.path);

      if (result.success) {
        toast.success('Branch merged to main', {
          description: `Branch "${worktree.branch}" has been merged and cleaned up`,
        });
        onMerged(worktree);
        onOpenChange(false);
      } else {
        toast.error('Failed to merge branch', {
          description: result.error,
        });
      }
    } catch (err) {
      toast.error('Failed to merge branch', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!worktree) return null;

  const confirmationWord = 'merge';
  const isConfirmValid = confirmText.toLowerCase() === confirmationWord;

  // First step: Show what will happen and ask for confirmation
  if (step === 'confirm') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-green-600" />
              Merge to Main
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <span className="block">
                  Merge branch{' '}
                  <code className="font-mono bg-muted px-1 rounded">{worktree.branch}</code> into
                  main?
                </span>

                <div className="text-sm text-muted-foreground mt-2">
                  This will:
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Merge the branch into the main branch</li>
                    <li>Remove the worktree directory</li>
                    <li>Delete the branch</li>
                  </ul>
                </div>

                {worktree.hasChanges && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 mt-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="text-yellow-500 text-sm">
                      This worktree has {worktree.changedFilesCount} uncommitted change(s). Please
                      commit or discard them before merging.
                    </span>
                  </div>
                )}

                {affectedFeatureCount > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 mt-2">
                    <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-500 text-sm">
                      {affectedFeatureCount} feature{affectedFeatureCount !== 1 ? 's' : ''}{' '}
                      {affectedFeatureCount !== 1 ? 'are' : 'is'} assigned to this branch and will
                      be unassigned after merge.
                    </span>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProceedToVerify}
              disabled={worktree.hasChanges}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Second step: Type confirmation
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Confirm Merge
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-orange-600 dark:text-orange-400 text-sm">
                  This action cannot be undone. The branch{' '}
                  <code className="font-mono bg-muted px-1 rounded">{worktree.branch}</code> will be
                  permanently deleted after merging.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-merge" className="text-sm text-foreground">
                  Type <span className="font-bold text-foreground">{confirmationWord}</span> to
                  confirm:
                </Label>
                <Input
                  id="confirm-merge"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmationWord}
                  disabled={isLoading}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setStep('confirm')} disabled={isLoading}>
            Back
          </Button>
          <Button
            onClick={handleMerge}
            disabled={isLoading || !isConfirmValid}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Merge to Main
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
