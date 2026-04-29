// src/repositories/index.ts
import type { JobRepository } from './JobRepository'
import { LocalStorageRepository } from './LocalStorageRepository'
// import { ApiRepository } from './ApiRepository'

// TODO: replace LocalStorageRepository with ApiRepository when backend is ready
export const jobRepository: JobRepository = new LocalStorageRepository()
