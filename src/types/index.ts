// src/types/index.ts

export type JobStatus =
  | 'applied'
  | 'responded'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'abandoned'

export interface JobApplication {
  id: string
  company: string
  role: string
  url?: string
  status: JobStatus
  dateApplied: string
  contact?: {
    name?: string
    email?: string
  }
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  followUpDays: number
}

export const STATUS_LABELS: Record<JobStatus, string> = {
  applied: 'Candidaté',
  responded: 'Réponse reçue',
  interview: 'Entretien',
  offer: 'Offre reçue',
  rejected: 'Refusé',
  abandoned: 'Abandonné',
}

export const STATUS_ORDER: JobStatus[] = [
  'applied',
  'responded',
  'interview',
  'offer',
  'rejected',
  'abandoned',
]

export const STATUS_COLORS: Record<JobStatus, { dot: string; badge: string; column: string }> = {
  applied: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    column: 'border-blue-200 dark:border-blue-900',
  },
  responded: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
    column: 'border-violet-200 dark:border-violet-900',
  },
  interview: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    column: 'border-amber-200 dark:border-amber-900',
  },
  offer: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    column: 'border-emerald-200 dark:border-emerald-900',
  },
  rejected: {
    dot: 'bg-red-400',
    badge: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
    column: 'border-red-200 dark:border-red-900',
  },
  abandoned: {
    dot: 'bg-zinc-400',
    badge: 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700',
    column: 'border-zinc-200 dark:border-zinc-800',
  },
}
