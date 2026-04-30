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

// Import complet — préserve les IDs pour que companyId/periodId restent valides
export function useFullImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ data, isV2 }: { data: ExportData; isV2: boolean }) => {
      // Toujours remplacer les candidatures (IDs préservés)
      await jobRepository.saveMany(data.applications)

      if (isV2) {
        // Remplacer périodes et entreprises avec leurs IDs originaux
        if (data.periods) await periodRepository.saveMany(data.periods)
        if (data.companies) await companyRepository.saveMany(data.companies)
      }
    },
    onSuccess: (_result, { isV2 }) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      if (isV2) {
        qc.invalidateQueries({ queryKey: ['periods'] })
        qc.invalidateQueries({ queryKey: ['companies'] })
      }
    },
  })
}
