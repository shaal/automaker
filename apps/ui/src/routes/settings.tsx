import { createFileRoute } from '@tanstack/react-router';
import { SettingsView } from '@/components/views/settings-view';
import type { SettingsViewId } from '@/components/views/settings-view/hooks';

interface SettingsSearchParams {
  view?: SettingsViewId;
}

export const Route = createFileRoute('/settings')({
  component: SettingsView,
  validateSearch: (search: Record<string, unknown>): SettingsSearchParams => {
    return {
      view: search.view as SettingsViewId | undefined,
    };
  },
});
