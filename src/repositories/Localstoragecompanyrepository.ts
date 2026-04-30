// src/repositories/LocalStorageCompanyRepository.ts
import type { CompanyProfile } from '@/types'

const STORAGE_KEY = 'jat_companies'

export class LocalStorageCompanyRepository {
    private readAll(): CompanyProfile[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return []
            return JSON.parse(raw) as CompanyProfile[]
        } catch {
            return []
        }
    }

    private writeAll(companies: CompanyProfile[]): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
    }

    async getAll(): Promise<CompanyProfile[]> {
        return this.readAll().sort((a, b) => a.displayName.localeCompare(b.displayName))
    }

    async getById(id: string): Promise<CompanyProfile | null> {
        return this.readAll().find((c) => c.id === id) ?? null
    }

    async getByName(name: string): Promise<CompanyProfile | null> {
        const normalized = name.toLowerCase().trim()
        return this.readAll().find((c) => c.name === normalized) ?? null
    }

    async save(company: Omit<CompanyProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompanyProfile> {
        const now = new Date().toISOString()
        const newCompany: CompanyProfile = {
            ...company,
            name: company.displayName.toLowerCase().trim(),
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }
        const all = this.readAll()
        this.writeAll([...all, newCompany])
        return newCompany
    }

    async update(id: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile> {
        const all = this.readAll()
        const idx = all.findIndex((c) => c.id === id)
        if (idx === -1) throw new Error(`Company ${id} not found`)
        const updated: CompanyProfile = {
            ...all[idx],
            ...updates,
            id,
            name: (updates.displayName ?? all[idx].displayName).toLowerCase().trim(),
            updatedAt: new Date().toISOString(),
        }
        all[idx] = updated
        this.writeAll(all)
        return updated
    }

    async delete(id: string): Promise<void> {
        this.writeAll(this.readAll().filter((c) => c.id !== id))
    }

    async saveMany(companies: CompanyProfile[]): Promise<void> {
        this.writeAll(companies)
    }
}

export const companyRepository = new LocalStorageCompanyRepository()
