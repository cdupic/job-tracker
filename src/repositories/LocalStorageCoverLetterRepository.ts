// src/repositories/LocalStorageCoverLetterRepository.ts
import type { CoverLetter } from '@/types'

const STORAGE_KEY = 'jat_cover_letters'

export class LocalStorageCoverLetterRepository {
    private readAll(): CoverLetter[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return []
            return JSON.parse(raw) as CoverLetter[]
        } catch {
            return []
        }
    }

    private writeAll(letters: CoverLetter[]): void {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(letters))
    }

    async getAll(): Promise<CoverLetter[]> {
        return this.readAll().sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }

    async getById(id: string): Promise<CoverLetter | null> {
        return this.readAll().find(l => l.id === id) ?? null
    }

    async save(letter: Omit<CoverLetter, 'id' | 'createdAt' | 'updatedAt'>): Promise<CoverLetter> {
        const now = new Date().toISOString()
        const newLetter: CoverLetter = {
            ...letter,
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
        }
        this.writeAll([...this.readAll(), newLetter])
        return newLetter
    }

    async update(id: string, updates: Partial<CoverLetter>): Promise<CoverLetter> {
        const all = this.readAll()
        const idx = all.findIndex(l => l.id === id)
        if (idx === -1) throw new Error(`CoverLetter ${id} not found`)
        const updated: CoverLetter = {
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
        this.writeAll(this.readAll().filter(l => l.id !== id))
    }
}

export const coverLetterRepository = new LocalStorageCoverLetterRepository()
