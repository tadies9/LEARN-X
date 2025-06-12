import { useState, useEffect } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (options: ToastOptions) => {
    const id = `toast-${toastCount++}`
    const newToast: Toast = {
      id,
      ...options,
    }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toast,
    toasts,
    dismiss,
  }
}