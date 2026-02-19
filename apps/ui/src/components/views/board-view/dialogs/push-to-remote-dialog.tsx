import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@automaker/utils/logger';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getHttpApiClient } from '@/lib/http-api-client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, RefreshCw, AlertTriangle, Sparkles, Plus, Link } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import type { WorktreeInfo } from '../worktree-panel/types';

interface RemoteInfo {
  name: string;
  url: string;
}

const logger = createLogger('PushToRemoteDialog');

interface PushToRemoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worktree: WorktreeInfo | null;
  onConfirm: (worktree: WorktreeInfo, remote: string) => void;
}

export function PushToRemoteDialog({
  open,
  onOpenChange,
  worktree,
  onConfirm,
}: PushToRemoteDialogProps) {
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add remote form state
  const [showAddRemoteForm, setShowAddRemoteForm] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('origin');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [isAddingRemote, setIsAddingRemote] = useState(false);
  const [addRemoteError, setAddRemoteError] = useState<string | null>(null);

  /**
   * Transforms API remote data to RemoteInfo format
   */
  const transformRemoteData = useCallback(
    (remotes: Array<{ name: string; url: string }>): RemoteInfo[] => {
      return remotes.map((r) => ({
        name: r.name,
        url: r.url,
      }));
    },
    []
  );

  /**
   * Updates remotes state and hides add form if remotes exist
   */
  const updateRemotesState = useCallback((remoteInfos: RemoteInfo[]) => {
    setRemotes(remoteInfos);
    if (remoteInfos.length > 0) {
      setShowAddRemoteForm(false);
    }
  }, []);

  const fetchRemotes = useCallback(async () => {
    if (!worktree) return;

    setIsLoading(true);
    setError(null);

    try {
      const api = getHttpApiClient();
      const result = await api.worktree.listRemotes(worktree.path);

      if (result.success && result.result) {
        const remoteInfos = transformRemoteData(result.result.remotes);
        updateRemotesState(remoteInfos);
      } else {
        setError(result.error || 'Failed to fetch remotes');
      }
    } catch (err) {
      logger.error('Failed to fetch remotes:', err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [worktree, transformRemoteData, updateRemotesState]);

  // Fetch remotes when dialog opens
  useEffect(() => {
    if (open && worktree) {
      fetchRemotes();
    }
  }, [open, worktree, fetchRemotes]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedRemote('');
      setError(null);
      setShowAddRemoteForm(false);
      setNewRemoteName('origin');
      setNewRemoteUrl('');
      setAddRemoteError(null);
    }
  }, [open]);

  // Auto-select default remote when remotes are loaded
  useEffect(() => {
    if (remotes.length > 0 && !selectedRemote) {
      // Default to 'origin' if available, otherwise first remote
      const defaultRemote = remotes.find((r) => r.name === 'origin') || remotes[0];
      setSelectedRemote(defaultRemote.name);
    }
  }, [remotes, selectedRemote]);

  // Show add remote form when no remotes (but not when there's an error)
  useEffect(() => {
    if (!isLoading && remotes.length === 0 && !error) {
      setShowAddRemoteForm(true);
    }
  }, [isLoading, remotes.length, error]);

  const handleRefresh = async () => {
    if (!worktree) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const api = getHttpApiClient();
      const result = await api.worktree.listRemotes(worktree.path);

      if (result.success && result.result) {
        const remoteInfos = transformRemoteData(result.result.remotes);
        updateRemotesState(remoteInfos);
        toast.success('Remotes refreshed');
      } else {
        toast.error(result.error || 'Failed to refresh remotes');
      }
    } catch (err) {
      logger.error('Failed to refresh remotes:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddRemote = async () => {
    if (!worktree || !newRemoteName.trim() || !newRemoteUrl.trim()) return;

    setIsAddingRemote(true);
    setAddRemoteError(null);

    try {
      const api = getHttpApiClient();
      const result = await api.worktree.addRemote(
        worktree.path,
        newRemoteName.trim(),
        newRemoteUrl.trim()
      );

      if (result.success && result.result) {
        toast.success(result.result.message);
        // Add the new remote to the list and select it
        const newRemote: RemoteInfo = {
          name: result.result.remoteName,
          url: result.result.remoteUrl,
        };
        setRemotes((prev) => [...prev, newRemote]);
        setSelectedRemote(newRemote.name);
        setShowAddRemoteForm(false);
        setNewRemoteName('origin');
        setNewRemoteUrl('');
      } else {
        setAddRemoteError(result.error || 'Failed to add remote');
      }
    } catch (err) {
      logger.error('Failed to add remote:', err);
      setAddRemoteError(getErrorMessage(err));
    } finally {
      setIsAddingRemote(false);
    }
  };

  const handleConfirm = () => {
    if (!worktree || !selectedRemote) return;
    onConfirm(worktree, selectedRemote);
    onOpenChange(false);
  };

  const renderAddRemoteForm = () => (
    <div className="grid gap-4 py-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Link className="w-4 h-4" />
        <span className="text-sm">
          {remotes.length === 0
            ? 'No remotes found. Add a remote to push your branch.'
            : 'Add a new remote'}
        </span>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="remote-name">Remote Name</Label>
        <Input
          id="remote-name"
          placeholder="origin"
          value={newRemoteName}
          onChange={(e) => {
            setNewRemoteName(e.target.value);
            setAddRemoteError(null);
          }}
          disabled={isAddingRemote}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="remote-url">Remote URL</Label>
        <Input
          id="remote-url"
          placeholder="https://github.com/user/repo.git"
          value={newRemoteUrl}
          onChange={(e) => {
            setNewRemoteUrl(e.target.value);
            setAddRemoteError(null);
          }}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              newRemoteName.trim() &&
              newRemoteUrl.trim() &&
              !isAddingRemote
            ) {
              handleAddRemote();
            }
          }}
          disabled={isAddingRemote}
        />
        <p className="text-xs text-muted-foreground">
          Supports HTTPS, SSH (git@github.com:user/repo.git), or git:// URLs
        </p>
      </div>

      {addRemoteError && (
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{addRemoteError}</span>
        </div>
      )}
    </div>
  );

  const renderRemoteSelector = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="remote-select">Select Remote</Label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddRemoteForm(true)}
              className="h-6 px-2 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 px-2 text-xs"
            >
              {isRefreshing ? (
                <Spinner size="xs" className="mr-1" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Refresh
            </Button>
          </div>
        </div>
        <Select value={selectedRemote} onValueChange={setSelectedRemote}>
          <SelectTrigger id="remote-select">
            <SelectValue placeholder="Select a remote" />
          </SelectTrigger>
          <SelectContent>
            {remotes.map((remote) => (
              <SelectItem key={remote.name} value={remote.name}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{remote.name}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                    {remote.url}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRemote && (
        <div className="mt-2 p-3 rounded-md bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            This will create a new remote branch{' '}
            <span className="font-mono text-foreground">
              {selectedRemote}/{worktree?.branch}
            </span>{' '}
            and set up tracking.
          </p>
        </div>
      )}
    </div>
  );

  const renderFooter = () => {
    if (showAddRemoteForm) {
      return (
        <DialogFooter>
          {remotes.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowAddRemoteForm(false)}
              disabled={isAddingRemote}
            >
              Back
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAddingRemote}>
            Cancel
          </Button>
          <Button
            onClick={handleAddRemote}
            disabled={!newRemoteName.trim() || !newRemoteUrl.trim() || isAddingRemote}
          >
            {isAddingRemote ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Remote
              </>
            )}
          </Button>
        </DialogFooter>
      );
    }

    return (
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!selectedRemote || isLoading}>
          <Upload className="w-4 h-4 mr-2" />
          Push to {selectedRemote || 'Remote'}
        </Button>
      </DialogFooter>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showAddRemoteForm ? (
              <>
                <Plus className="w-5 h-5 text-primary" />
                Add Remote
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-primary" />
                Push New Branch to Remote
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2">
                  <Sparkles className="w-3 h-3" />
                  new
                </span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {showAddRemoteForm ? (
              <>Add a remote repository to push your changes to.</>
            ) : (
              <>
                Push{' '}
                <span className="font-mono text-foreground">
                  {worktree?.branch || 'current branch'}
                </span>{' '}
                to a remote repository for the first time.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error && !showAddRemoteForm ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRemotes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : showAddRemoteForm ? (
          renderAddRemoteForm()
        ) : (
          renderRemoteSelector()
        )}

        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
}
