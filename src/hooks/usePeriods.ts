// src/hooks/usePeriods.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { periodRepository } from '@/repositories/LocalStoragePeriodRepository'
import type { Period } from '@/types'

const QUERY_KEY = ['periods'] as const

export function usePeriods() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => periodRepository.getAll(),
    })
}

export function useCreatePeriod() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (period: Omit<Period, 'id' | 'createdAt'>) => periodRepository.save(period),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}

export function useUpdatePeriod() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Period> }) =>
            periodRepository.update(id, updates),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}

export function useDeletePeriod() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => periodRepository.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}
