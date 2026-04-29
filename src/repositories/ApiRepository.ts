// src/repositories/ApiRepository.ts
import type { JobApplication } from '@/types'
import type { JobRepository } from './JobRepository'

export class ApiRepository implements JobRepository {
  async getAll(): Promise<JobApplication[]> {
    throw new Error('Not implemented')
  }

  async getById(_id: string): Promise<JobApplication | null> {
    throw new Error('Not implemented')
  }

  async save(
    _job: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JobApplication> {
    throw new Error('Not implemented')
  }

  async update(_id: string, _updates: Partial<JobApplication>): Promise<JobApplication> {
    throw new Error('Not implemented')
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Not implemented')
  }
}
