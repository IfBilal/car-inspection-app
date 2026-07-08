import type { Recommendation } from './types';
import type { ChipTone } from '@/components/ui/Chip';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  recommended: 'Recommended',
  recommended_with_repairs: 'With repairs',
  not_recommended: 'Not recommended',
};

export const RECOMMENDATION_TONE: Record<Recommendation, ChipTone> = {
  recommended: 'pass',
  recommended_with_repairs: 'repair',
  not_recommended: 'fail',
};

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}
