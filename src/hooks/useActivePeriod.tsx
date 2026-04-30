// src/hooks/useActivePeriod.tsx
import React, { createContext, useContext, useState } from 'react'

interface ActivePeriodContextType {
    activePeriodId: string | null // null = "toutes les périodes"
    setActivePeriodId: (id: string | null) => void
}

const ActivePeriodContext = createContext<ActivePeriodContextType | null>(null)

export function ActivePeriodProvider({ children }: { children: React.ReactNode }) {
    const [activePeriodId, setActivePeriodId] = useState<string | null>(null)

    return (
        <ActivePeriodContext.Provider value={{ activePeriodId, setActivePeriodId }}>
            {children}
        </ActivePeriodContext.Provider>
    )
}

export function useActivePeriod() {
    const ctx = useContext(ActivePeriodContext)
    if (!ctx) throw new Error('useActivePeriod must be used within ActivePeriodProvider')
    return ctx
}
