// src/hooks/useKanbanConfig.tsx
import React, { createContext, useContext, useState } from 'react'
import type { KanbanColumnConfig, KanbanColumnColor } from '@/types'
import {
    DEFAULT_COLUMN_IDS,
    DEFAULT_COLUMN_COLORS,
} from '@/types'
import { useI18n } from '@/i18n'

const STORAGE_KEY = 'jat_columns'

function loadFromStorage(): KanbanColumnConfig[] | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as KanbanColumnConfig[]
        return [...parsed].sort((a, b) => a.order - b.order)
    } catch {
        return null
    }
}

function persist(cols: KanbanColumnConfig[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols))
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface KanbanConfigContextType {
    columns: KanbanColumnConfig[]
    setColumns: (cols: KanbanColumnConfig[]) => void
    addColumn: (label: string, color: KanbanColumnColor) => void
}

const KanbanConfigContext = createContext<KanbanConfigContextType | null>(null)

export function KanbanConfigProvider({ children }: { children: React.ReactNode }) {
    const { t } = useI18n()

    const [columns, setColumnsState] = useState<KanbanColumnConfig[]>(() => {
        const saved = loadFromStorage()
        if (saved) return saved
        // First run: initialise from current i18n locale
        return DEFAULT_COLUMN_IDS.map((id, i) => ({
            id,
            label: (t.status as Record<string, string>)[id] ?? id,
            color: DEFAULT_COLUMN_COLORS[id],
            order: i,
        }))
    })

    function setColumns(cols: KanbanColumnConfig[]) {
        const normalised = cols.map((c, i) => ({ ...c, order: i }))
        persist(normalised)
        setColumnsState(normalised)
    }

    function addColumn(label: string, color: KanbanColumnColor) {
        const newCol: KanbanColumnConfig = {
            id: crypto.randomUUID(),
            label,
            color,
            order: columns.length,
        }
        setColumns([...columns, newCol])
    }

    return (
        <KanbanConfigContext.Provider value={{ columns, setColumns, addColumn }}>
            {children}
        </KanbanConfigContext.Provider>
    )
}

export function useKanbanConfig() {
    const ctx = useContext(KanbanConfigContext)
    if (!ctx) throw new Error('useKanbanConfig must be used within KanbanConfigProvider')
    return ctx
}
