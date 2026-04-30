// src/repositories/index.ts
import type { JobRepository } from './JobRepository'
import { LocalStoragePeriodRepository } from './LocalStoragePeriodRepository'
// import { ApiRepository } from './ApiRepository'

// TODO: replace LocalStorageRepository with ApiRepository when backend is ready
export const jobRepository: JobRepository = new LocalStoragePeriodRepository()
