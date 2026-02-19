import { createFileRoute } from '@tanstack/react-router';
import { OverviewView } from '@/components/views/overview-view';

export const Route = createFileRoute('/overview')({
  component: OverviewView,
});
