// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysBetween(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const now = new Date()
  date.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string, locale = 'fr-FR'): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`
}

// Garantit qu'une URL a un schéma — évite les liens relatifs (localhost+url)
export function ensureUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return 'https://' + url
}
