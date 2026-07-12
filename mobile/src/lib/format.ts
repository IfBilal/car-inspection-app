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
  buy: 'Buy',
  negotiate: 'Negotiate',
  walk_away: 'Walk away',
};

export const RECOMMENDATION_TONE: Record<Recommendation, ChipTone> = {
  buy: 'pass',
  negotiate: 'repair',
  walk_away: 'fail',
};

/** Score band per report.pdf: 9-10 Excellent, 7-8 Good, 5-6 Fair, 1-4 Poor */
export function scoreBand(score: number): { label: string; tone: ChipTone } {
  if (score >= 9) return { label: 'Excellent', tone: 'pass' };
  if (score >= 7) return { label: 'Good', tone: 'info' };
  if (score >= 5) return { label: 'Fair', tone: 'repair' };
  return { label: 'Poor', tone: 'fail' };
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}
