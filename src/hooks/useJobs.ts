// src/hooks/useJobs.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jobRepository } from '@/repositories'
import type { JobApplication } from '@/types'

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

export function useImportJobs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (jobs: JobApplication[]) => {
      // Overwrite all — clear + re-insert each job directly
      const existing = await jobRepository.getAll()
      for (const j of existing) {
        await jobRepository.delete(j.id)
      }
      for (const j of jobs) {
        await jobRepository.save({
          company: j.company,
          role: j.role,
          url: j.url,
          status: j.status,
          dateApplied: j.dateApplied,
          contact: j.contact,
          notes: j.notes,
        })
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
