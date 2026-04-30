// src/repositories/LocalStoragePeriodRepository.ts
import type { Period } from '@/types'

const STORAGE_KEY = 'jat_periods'

export class LocalStoragePeriodRepository {
  private readAll(): Period[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as Period[]
    } catch {
      return []
    }
  }

  private writeAll(periods: Period[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(periods))
  }

  async getAll(): Promise<Period[]> {
    return this.readAll().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async getById(id: string): Promise<Period | null> {
    return this.readAll().find((p) => p.id === id) ?? null
  }

  async save(period: Omit<Period, 'id' | 'createdAt'>): Promise<Period> {
    const now = new Date().toISOString()
    const newPeriod: Period = {
      ...period,
      id: crypto.randomUUID(),
      createdAt: now,
    }
    const all = this.readAll()
    this.writeAll([...all, newPeriod])
    return newPeriod
  }

  async update(id: string, updates: Partial<Period>): Promise<Period> {
    const all = this.readAll()
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error(`Period ${id} not found`)
    const updated: Period = { ...all[idx], ...updates, id }
    all[idx] = updated
    this.writeAll(all)
    return updated
  }

  async delete(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((p) => p.id !== id))
  }

  async saveMany(periods: Period[]): Promise<void> {
    this.writeAll(periods)
  }
}

export const periodRepository = new LocalStoragePeriodRepository()
