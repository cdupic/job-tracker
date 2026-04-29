// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysBetween(dateStr: string): number {
  // Parse la date comme si c'était en heure locale
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  // Obtient la date actuelle en heure locale
  const now = new Date()

  // Réinitialise les heures pour avoir une comparaison au jour près
  date.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)

  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`
}
