// src/hooks/useJobs.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jobRepository } from '@/repositories'
import { periodRepository } from '@/repositories/LocalStoragePeriodRepository'
import { companyRepository } from '@/repositories/LocalStorageCompanyRepository'
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
        // Écrase tout
        await jobRepository.saveMany(data.applications)
        if (isV2) {
          if (data.periods?.length) await periodRepository.saveMany(data.periods)
          if (data.companies?.length) await companyRepository.saveMany(data.companies)
        }
      } else {
        // Fusion : ajoute uniquement ce qui n'existe pas encore (comparaison par id)
        const existingJobs = await jobRepository.getAll()
        const existingJobIds = new Set(existingJobs.map((j) => j.id))
        const newJobs = data.applications.filter((j) => !existingJobIds.has(j.id))
        if (newJobs.length) await jobRepository.saveMany([...existingJobs, ...newJobs])

        if (isV2) {
          if (data.periods?.length) {
            const existingPeriods = await periodRepository.getAll()
            const existingPeriodIds = new Set(existingPeriods.map((p) => p.id))
            const newPeriods = data.periods.filter((p) => !existingPeriodIds.has(p.id))
            if (newPeriods.length)
              await periodRepository.saveMany([...existingPeriods, ...newPeriods])
          }
          if (data.companies?.length) {
            const existingCompanies = await companyRepository.getAll()
            const existingCompanyIds = new Set(existingCompanies.map((c) => c.id))
            const newCompanies = data.companies.filter((c) => !existingCompanyIds.has(c.id))
            if (newCompanies.length)
              await companyRepository.saveMany([...existingCompanies, ...newCompanies])
          }
        }
      }
    },
    onSuccess: (_r, { isV2 }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      if (isV2) {
        qc.invalidateQueries({ queryKey: ['periods'] })
        qc.invalidateQueries({ queryKey: ['companies'] })
      }
    },
  })
}
