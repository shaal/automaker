import { memo } from 'react';
import { DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import type { ThemeMenuItemProps } from '../types';

export const ThemeMenuItem = memo(function ThemeMenuItem({
  option,
  onPreviewEnter,
  onPreviewLeave,
}: ThemeMenuItemProps) {
  const Icon = option.icon;
  return (
    <DropdownMenuRadioItem
      value={option.value}
      data-testid={`project-theme-${option.value}`}
      className="text-xs py-1.5"
      onPointerEnter={() => onPreviewEnter(option.value)}
      onPointerLeave={onPreviewLeave}
    >
      <Icon className="w-3.5 h-3.5 mr-1.5" style={{ color: option.color }} />
      <span>{option.label}</span>
    </DropdownMenuRadioItem>
  );
});
