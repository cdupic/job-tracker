// src/repositories/JobRepository.ts
import type { JobApplication } from '@/types'

export interface JobRepository {
  getAll(): Promise<JobApplication[]>
  getById(id: string): Promise<JobApplication | null>
  save(job: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>): Promise<JobApplication>
  update(id: string, updates: Partial<JobApplication>): Promise<JobApplication>
  delete(id: string): Promise<void>
  saveMany(jobs: JobApplication[]): Promise<void>
}
