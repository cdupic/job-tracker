// src/hooks/useToast.ts
import { useState, useCallback } from 'react'

interface ToastData {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

let listeners: Array<(toasts: ToastData[]) => void> = []
let toastState: ToastData[] = []

function emit() {
  listeners.forEach((l) => l([...toastState]))
}

export function toast(data: Omit<ToastData, 'id'>) {
  const id = crypto.randomUUID()
  toastState = [...toastState, { ...data, id }]
  emit()
  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== id)
    emit()
  }, 4000)
}

export function useToastState() {
  const [toasts, setToasts] = useState<ToastData[]>(toastState)

  const subscribe = useCallback(() => {
    const handler = (next: ToastData[]) => setToasts(next)
    listeners.push(handler)
    return () => {
      listeners = listeners.filter((l) => l !== handler)
    }
  }, [])

  // Self-subscribing pattern
  useState(() => {
    const unsub = subscribe()
    return unsub
  })

  return toasts
}

export function dismissToast(id: string) {
  toastState = toastState.filter((t) => t.id !== id)
  emit()
}
