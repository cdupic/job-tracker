// src/hooks/useCompanies.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { companyRepository } from '@/repositories/LocalStorageCompanyRepository'
import type { CompanyProfile } from '@/types'

const QUERY_KEY = ['companies'] as const

export function useCompanies() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => companyRepository.getAll(),
    })
}

export function useCompany(id: string | undefined) {
    return useQuery({
        queryKey: [...QUERY_KEY, id],
        queryFn: () => (id ? companyRepository.getById(id) : null),
        enabled: !!id,
    })
}

export function useCreateCompany() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (company: Omit<CompanyProfile, 'id' | 'createdAt' | 'updatedAt'>) =>
            companyRepository.save(company),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}

export function useUpdateCompany() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<CompanyProfile> }) =>
            companyRepository.update(id, updates),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}

export function useDeleteCompany() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => companyRepository.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    })
}
