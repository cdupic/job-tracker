// src/types/index.ts

// Open string — column IDs are now user-defined
export type JobStatus = string

export type KanbanColumnColor =
    | 'blue' | 'violet' | 'amber' | 'green' | 'red' | 'gray'
    | 'pink' | 'cyan' | 'orange' | 'teal' | 'indigo' | 'rose'

export interface KanbanColumnConfig {
  id: string             // stable key (default IDs + crypto.randomUUID for new ones)
  label: string          // user-defined display label
  color: KanbanColumnColor
  order: number
}

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

// v2 export format (includes column config)
export interface ExportData {
  version: 2
  columns: KanbanColumnConfig[]
  applications: JobApplication[]
}

// Default column IDs (stable, used for first-run initialisation)
export const DEFAULT_COLUMN_IDS = [
  'applied', 'responded', 'interview', 'offer', 'rejected', 'abandoned',
] as const
export type DefaultColumnId = (typeof DEFAULT_COLUMN_IDS)[number]

export const DEFAULT_COLUMN_COLORS: Record<DefaultColumnId, KanbanColumnColor> = {
  applied: 'blue',
  responded: 'violet',
  interview: 'amber',
  offer: 'green',
  rejected: 'red',
  abandoned: 'gray',
}

export const ALL_KANBAN_COLORS: KanbanColumnColor[] = [
  'blue', 'violet', 'amber', 'green', 'red', 'gray',
  'pink', 'cyan', 'orange', 'teal', 'indigo', 'rose',
]

// All colour styles statically declared so Tailwind includes them in the bundle
export const COLUMN_COLOR_STYLES: Record<
    KanbanColumnColor,
    { dot: string; badge: string; column: string }
> = {
  blue: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    column: 'border-blue-200 dark:border-blue-900',
  },
  violet: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
    column: 'border-violet-200 dark:border-violet-900',
  },
  amber: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    column: 'border-amber-200 dark:border-amber-900',
  },
  green: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    column: 'border-emerald-200 dark:border-emerald-900',
  },
  red: {
    dot: 'bg-red-400',
    badge: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
    column: 'border-red-200 dark:border-red-900',
  },
  gray: {
    dot: 'bg-zinc-400',
    badge: 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700',
    column: 'border-zinc-200 dark:border-zinc-800',
  },
  pink: {
    dot: 'bg-pink-500',
    badge: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800',
    column: 'border-pink-200 dark:border-pink-900',
  },
  cyan: {
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
    column: 'border-cyan-200 dark:border-cyan-900',
  },
  orange: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    column: 'border-orange-200 dark:border-orange-900',
  },
  teal: {
    dot: 'bg-teal-500',
    badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
    column: 'border-teal-200 dark:border-teal-900',
  },
  indigo: {
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
    column: 'border-indigo-200 dark:border-indigo-900',
  },
  rose: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
    column: 'border-rose-200 dark:border-rose-900',
  },
}

export const FALLBACK_COLOR_STYLE = COLUMN_COLOR_STYLES.gray
