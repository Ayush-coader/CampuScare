import { useQuery } from '@tanstack/react-query';
import api from './client';

// Categories, SLA hours, blocks etc. come from the backend so there is one source of truth
export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: async () => (await api.get('/meta')).data,
    staleTime: Infinity,
  });
}

export const STATUS_LABEL = {
  pending: 'Pending',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

export const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export const formatLocation = (loc) =>
  [loc?.block, loc?.floor && `Floor ${loc.floor}`, loc?.room && `Room ${loc.room}`].filter(Boolean).join(' · ');

export const formatDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (d) =>
  new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// "in 5h", "2d overdue"
export function slaText(dueAt, open) {
  if (!open) return null;
  const diff = new Date(dueAt).getTime() - Date.now();
  const abs = Math.abs(diff);
  const h = Math.round(abs / 36e5);
  const label = h >= 48 ? `${Math.round(h / 24)}d` : `${h}h`;
  return diff < 0 ? `${label} overdue` : `due in ${label}`;
}
