// src/hooks/useProfiles.ts
import { useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileExperience {
    id: string
    type: 'pro' | 'perso'
    title: string
    organization: string
    startDate: string       // YYYY-MM
    endDate?: string        // YYYY-MM, undefined = en cours
    description: string
    companyId?: string      // optional link to JAT company profile
}

export interface CandidateProfile {
    id: string
    name: string            // display name for the selector
    firstName: string
    lastName: string
    email?: string
    phone?: string
    skills: string          // free text : "React, TypeScript, gestion de projet…"
    degrees: string         // free text : "Master Finance, Polytechnique 2023"
    experiences: ProfileExperience[]
    createdAt: string
    updatedAt: string
}

// ── Storage key ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'jat_candidate_profiles'

// ── Repository helpers (pure functions, no class overhead) ────────────────────
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

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useProfiles() {
    const [profiles, setProfilesState] = useState<CandidateProfile[]>(() => readAll())

    const refresh = useCallback(() => setProfilesState(readAll()), [])

    const saveProfile = useCallback(
        (data: Omit<CandidateProfile, 'id' | 'createdAt' | 'updatedAt'>): CandidateProfile => {
            const now = new Date().toISOString()
            const created: CandidateProfile = {
                ...data,
                id: crypto.randomUUID(),
                createdAt: now,
                updatedAt: now,
            }
            const all = readAll()
            writeAll([...all, created])
            setProfilesState([...all, created])
            return created
        },
        []
    )

    const updateProfile = useCallback(
        (id: string, updates: Partial<Omit<CandidateProfile, 'id' | 'createdAt'>>): void => {
            const all = readAll()
            const idx = all.findIndex(p => p.id === id)
            if (idx === -1) return
            const updated: CandidateProfile = {
                ...all[idx],
                ...updates,
                id,
                updatedAt: new Date().toISOString(),
            }
            all[idx] = updated
            writeAll(all)
            setProfilesState([...all])
        },
        []
    )

    const deleteProfile = useCallback((id: string): void => {
        const next = readAll().filter(p => p.id !== id)
        writeAll(next)
        setProfilesState(next)
    }, [])

    return { profiles, saveProfile, updateProfile, deleteProfile, refresh }
}
