// src/hooks/useProfiles.ts
import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileExperience {
    id: string
    type: 'pro' | 'perso'
    title: string
    organization: string
    startDate: string       // YYYY-MM
    endDate?: string        // YYYY-MM, undefined = en cours
    description: string
    companyId?: string
}

export interface CandidateProfile {
    id: string
    name: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    skills: string
    degrees: string
    experiences: ProfileExperience[]
    createdAt: string
    updatedAt: string
}

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'jat_candidate_profiles'

function readAll(): CandidateProfile[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as CandidateProfile[]
    } catch {
        return []
    }
}

function writeAll(profiles: CandidateProfile[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

// ── Shared module-level state (same pattern as useToast) ──────────────────────
let _profiles: CandidateProfile[] = readAll()
let _listeners: Array<(profiles: CandidateProfile[]) => void> = []

function emit(next: CandidateProfile[]) {
    _profiles = next
    _listeners.forEach(l => l([..._profiles]))
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useProfiles() {
    const [profiles, setProfilesState] = useState<CandidateProfile[]>(_profiles)

    useEffect(() => {
        const handler = (next: CandidateProfile[]) => setProfilesState(next)
        _listeners.push(handler)
        return () => {
            _listeners = _listeners.filter(l => l !== handler)
        }
    }, [])

    const saveProfile = useCallback(
        (data: Omit<CandidateProfile, 'id' | 'createdAt' | 'updatedAt'>): CandidateProfile => {
            const now = new Date().toISOString()
            const created: CandidateProfile = {
                ...data,
                id: crypto.randomUUID(),
                createdAt: now,
                updatedAt: now,
            }
            const next = [..._profiles, created]
            writeAll(next)
            emit(next)
            return created
        },
        []
    )

    const updateProfile = useCallback(
        (id: string, updates: Partial<Omit<CandidateProfile, 'id' | 'createdAt'>>): void => {
            const next = _profiles.map(p =>
                p.id === id
                    ? { ...p, ...updates, id, updatedAt: new Date().toISOString() }
                    : p
            )
            writeAll(next)
            emit(next)
        },
        []
    )

    const deleteProfile = useCallback((id: string): void => {
        const next = _profiles.filter(p => p.id !== id)
        writeAll(next)
        emit(next)
    }, [])

    return { profiles, saveProfile, updateProfile, deleteProfile }
}   
