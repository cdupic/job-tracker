// src/hooks/useSettings.ts
import { useState, useCallback } from 'react'
import type { AppSettings } from '@/types'

const SETTINGS_KEY = 'jat_settings'
const DEFAULTS: AppSettings = { followUpDays: 7 }

function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) }
  } catch {
    return DEFAULTS
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(readSettings)

  const setSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { settings, setSettings }
}
