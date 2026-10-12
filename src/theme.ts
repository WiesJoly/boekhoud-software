import { ref } from 'vue'

export type ThemeId = 'green' | 'blue' | 'teal' | 'lavender' | 'kitten'
export type Mode = 'light' | 'dark' | 'system'

export interface ThemePreference {
  theme: ThemeId
  mode: Mode
}

/** Swatches are only used for the picker in Instellingen; the real colours live in style.css. */
export const THEMES: { id: ThemeId; label: string; swatches: string[] }[] = [
  { id: 'green', label: 'Groen', swatches: ['#3e6a5d', '#d6e4de', '#f6f8f7'] },
  { id: 'blue', label: 'Blauw', swatches: ['#2f5f9e', '#dbe6f4', '#f5f7fb'] },
  { id: 'teal', label: 'Appelblauwzeegroen', swatches: ['#1f7a80', '#cdeceb', '#f2f9f8'] },
  { id: 'lavender', label: 'Pastelpaars', swatches: ['#7b5ea7', '#e9e1f5', '#f8f6fc'] },
  { id: 'kitten', label: 'Poesje', swatches: ['#b84d78', '#fbe3ec', '#fff7fa'] },
]

export const DEFAULT_PREFERENCE: ThemePreference = { theme: 'green', mode: 'system' }

const STORAGE_KEY = 'praktijkboekhouding.weergave'
const MODES: Mode[] = ['light', 'dark', 'system']

export function parsePreference(raw: string | null): ThemePreference {
  try {
    const value = raw ? JSON.parse(raw) : {}
    return {
      theme: THEMES.some((t) => t.id === value.theme) ? value.theme : DEFAULT_PREFERENCE.theme,
      mode: MODES.includes(value.mode) ? value.mode : DEFAULT_PREFERENCE.mode,
    }
  } catch {
    return { ...DEFAULT_PREFERENCE }
  }
}

export function resolveMode(mode: Mode, prefersDark: boolean): 'light' | 'dark' {
  return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/** Current preference; reactive so the picker updates. */
export const preference = ref<ThemePreference>(parsePreference(readStored()))

const darkQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : undefined

export function applyTheme(pref: ThemePreference = preference.value) {
  const root = document.documentElement
  root.dataset.theme = pref.theme
  root.dataset.mode = resolveMode(pref.mode, darkQuery?.matches ?? false)
  root.style.colorScheme = root.dataset.mode
}

export function setPreference(next: Partial<ThemePreference>) {
  preference.value = { ...preference.value, ...next }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference.value))
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this visit only.
  }
  applyTheme()
}

/** Apply before mounting to avoid a flash of the wrong theme, and follow the OS when mode is "system". */
export function initTheme() {
  applyTheme()
  darkQuery?.addEventListener('change', () => applyTheme())
}
