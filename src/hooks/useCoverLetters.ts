// src/hooks/useCoverLetters.ts
import { useState, useEffect, useCallback } from 'react'
import { coverLetterRepository } from '@/repositories/LocalStorageCoverLetterRepository'
import type { CoverLetter } from '@/types'

// Shared module-level state — same pattern as useProfiles / useToast
let _letters: CoverLetter[] = []
let _loaded = false
let _listeners: Array<(letters: CoverLetter[]) => void> = []

async function loadOnce() {
    if (_loaded) return
    _loaded = true
    _letters = await coverLetterRepository.getAll()
    _listeners.forEach(l => l([..._letters]))
}

function emit(next: CoverLetter[]) {
    _letters = next
    _listeners.forEach(l => l([..._letters]))
}

export function useCoverLetters() {
    const [letters, setLetters] = useState<CoverLetter[]>(_letters)

    useEffect(() => {
        const handler = (next: CoverLetter[]) => setLetters(next)
        _listeners.push(handler)
        loadOnce()

        // React to bulk imports (useFullImport dispatches a StorageEvent)
        async function onStorage(e: StorageEvent) {
            if (e.key !== 'jat_cover_letters') return
            _loaded = false
            await loadOnce()
        }
        window.addEventListener('storage', onStorage)

        return () => {
            _listeners = _listeners.filter(l => l !== handler)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const saveLetter = useCallback(
        async (data: Omit<CoverLetter, 'id' | 'createdAt' | 'updatedAt'>): Promise<CoverLetter> => {
            const created = await coverLetterRepository.save(data)
            const next = [created, ..._letters]
            emit(next)
            return created
        },
        []
    )

    const updateLetter = useCallback(
        async (id: string, updates: Partial<CoverLetter>): Promise<void> => {
            await coverLetterRepository.update(id, updates)
            const next = _letters.map(l =>
                l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
            )
            emit(next)
        },
        []
    )

    const deleteLetter = useCallback(async (id: string): Promise<void> => {
        await coverLetterRepository.delete(id)
        emit(_letters.filter(l => l.id !== id))
    }, [])

    return { letters, saveLetter, updateLetter, deleteLetter }
}
