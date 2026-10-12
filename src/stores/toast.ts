import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  kind: 'error' | 'success'
  message: string
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let next = 1

  function push(kind: Toast['kind'], message: string) {
    const id = next++
    toasts.value.push({ id, kind, message })
    setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000)
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    dismiss,
    error: (message: string) => push('error', message),
    success: (message: string) => push('success', message),
  }
})

/** Runs an action, reporting failure as a toast. Returns false when it failed. */
export async function attempt(action: () => Promise<unknown>, failure: string, success?: string): Promise<boolean> {
  const toast = useToastStore()
  try {
    await action()
    if (success) toast.success(success)
    return true
  } catch (e) {
    console.error(e)
    toast.error(`${failure}: ${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}
