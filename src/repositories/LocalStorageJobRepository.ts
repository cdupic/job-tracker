// src/repositories/LocalStorageJobRepository.ts
import type { JobApplication } from '@/types'
import type { JobRepository } from './JobRepository'

const STORAGE_KEY = 'jat_applications'

export class LocalStorageJobRepository implements JobRepository {
    private readAll(): JobApplication[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return []
            return JSON.parse(raw) as JobApplication[]
        } catch {
            return []
        }
    }

    private writeAll(jobs: JobApplication[]): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
    }

    async getAll(): Promise<JobApplication[]> {
        return this.readAll().sort(
            (a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime()
        )
    }

    async getById(id: string): Promise<JobApplication | null> {
        return this.readAll().find((j) => j.id === id) ?? null
    }

    async save(job: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobApplication> {
        const now = new Date().toISOString()
        const newJob: JobApplication = {
            ...job,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }
        this.writeAll([...this.readAll(), newJob])
        return newJob
    }

    async update(id: string, updates: Partial<JobApplication>): Promise<JobApplication> {
        const all = this.readAll()
        const idx = all.findIndex((j) => j.id === id)
        if (idx === -1) throw new Error(`Job ${id} not found`)
        const updated: JobApplication = {
            ...all[idx],
            ...updates,
            id,
            updatedAt: new Date().toISOString(),
        }
        all[idx] = updated
        this.writeAll(all)
        return updated
    }

    async delete(id: string): Promise<void> {
        this.writeAll(this.readAll().filter((j) => j.id !== id))
    }

    // Écrase tout le tableau en préservant les IDs existants
    async saveMany(jobs: JobApplication[]): Promise<void> {
        this.writeAll(jobs)
    }
}
