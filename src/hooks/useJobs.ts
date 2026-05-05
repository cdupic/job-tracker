// src/hooks/useJobs.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jobRepository } from '@/repositories'
import { periodRepository } from '@/repositories/LocalStoragePeriodRepository'
import { companyRepository } from '@/repositories/LocalStorageCompanyRepository'
import { coverLetterRepository } from '@/repositories/LocalStorageCoverLetterRepository'
import type { JobApplication, ExportData } from '@/types'

const QUERY_KEY = ['jobs'] as const

export function useJobs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => jobRepository.getAll(),
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => jobRepository.getById(id),
    enabled: !!id,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (job: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>) =>
        jobRepository.save(job),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<JobApplication> }) =>
        jobRepository.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => jobRepository.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteJobsByPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (periodId: string) => {
      const all = await jobRepository.getAll()
      const toDelete = all.filter((j) => j.periodId === periodId)
      for (const j of toDelete) await jobRepository.delete(j.id)
      return toDelete.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export type ImportStrategy = 'replace' | 'merge'

// ── Settings helpers (for import/export of model pref) ───────────────────────
const SETTINGS_KEY = 'jat_settings'
const OR_MODEL_KEY = 'jat_or_model'

function readSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

// ── Full import ───────────────────────────────────────────────────────────────
export function useFullImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
                         data,
                         isV2,
                         strategy,
                       }: {
      data: ExportData
      isV2: boolean
      strategy: ImportStrategy
    }) => {
      if (strategy === 'replace') {
        // ── Applications ──────────────────────────────────────────────────────
        await jobRepository.saveMany(data.applications)

        if (isV2) {
          // ── Periods ──────────────────────────────────────────────────────
          if (data.periods?.length) await periodRepository.saveMany(data.periods)
          // ── Companies ─────────────────────────────────────────────────────
          if (data.companies?.length) await companyRepository.saveMany(data.companies)
          // ── Cover letters ─────────────────────────────────────────────────
          if (data.coverLetters?.length) await coverLetterRepository.saveMany(data.coverLetters)
          // ── Settings (follow-up days + OpenRouter model) ──────────────────
          if (data.settings) {
            if (data.settings.followUpDays != null) {
              const current = readSettings()
              localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                ...current,
                followUpDays: data.settings.followUpDays,
              }))
            }
            if (data.settings.openRouterModel) {
              localStorage.setItem(OR_MODEL_KEY, data.settings.openRouterModel)
            }
          }
        }
      } else {
        // ── Merge strategy: add only what doesn't already exist by id ─────────

        // Applications
        const existingJobs = await jobRepository.getAll()
        const existingJobIds = new Set(existingJobs.map((j) => j.id))
        const newJobs = data.applications.filter((j) => !existingJobIds.has(j.id))
        if (newJobs.length) await jobRepository.saveMany([...existingJobs, ...newJobs])

        if (isV2) {
          // Periods
          if (data.periods?.length) {
            const existingPeriods = await periodRepository.getAll()
            const existingIds = new Set(existingPeriods.map((p) => p.id))
            const newItems = data.periods.filter((p) => !existingIds.has(p.id))
            if (newItems.length)
              await periodRepository.saveMany([...existingPeriods, ...newItems])
          }

          // Companies
          if (data.companies?.length) {
            const existingCompanies = await companyRepository.getAll()
            const existingIds = new Set(existingCompanies.map((c) => c.id))
            const newItems = data.companies.filter((c) => !existingIds.has(c.id))
            if (newItems.length)
              await companyRepository.saveMany([...existingCompanies, ...newItems])
          }

          // Cover letters
          if (data.coverLetters?.length) {
            const existingLetters = await coverLetterRepository.getAll()
            const existingIds = new Set(existingLetters.map((l) => l.id))
            const newItems = data.coverLetters.filter((l) => !existingIds.has(l.id))
            if (newItems.length)
              await coverLetterRepository.saveMany([...existingLetters, ...newItems])
          }

          // Settings — merge only if not already set locally
          if (data.settings) {
            if (data.settings.followUpDays != null) {
              const current = readSettings()
              // Only import if user hasn't customised it (still at default 7)
              if (current.followUpDays == null) {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                  ...current,
                  followUpDays: data.settings.followUpDays,
                }))
              }
            }
            if (data.settings.openRouterModel && !localStorage.getItem(OR_MODEL_KEY)) {
              localStorage.setItem(OR_MODEL_KEY, data.settings.openRouterModel)
            }
          }
        }
      }
    },
    onSuccess: (_r, { isV2 }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      if (isV2) {
        qc.invalidateQueries({ queryKey: ['periods'] })
        qc.invalidateQueries({ queryKey: ['companies'] })
        // cover letters use module-level state → force a reload via storage event
        window.dispatchEvent(new StorageEvent('storage', { key: 'jat_cover_letters' }))
      }
    },
  })
}
