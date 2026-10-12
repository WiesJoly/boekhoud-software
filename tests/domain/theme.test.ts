import { describe, expect, test } from 'vitest'
import { DEFAULT_PREFERENCE, parsePreference, resolveMode, THEMES } from '../../src/theme'

describe('theme preference', () => {
  test('offers the five palettes', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['green', 'blue', 'teal', 'lavender', 'kitten'])
  })
  test('reads a stored preference', () => {
    expect(parsePreference('{"theme":"kitten","mode":"dark"}')).toEqual({ theme: 'kitten', mode: 'dark' })
  })
  test('falls back to defaults for missing, broken or unknown values', () => {
    expect(parsePreference(null)).toEqual(DEFAULT_PREFERENCE)
    expect(parsePreference('not json')).toEqual(DEFAULT_PREFERENCE)
    expect(parsePreference('{"theme":"neon","mode":"sepia"}')).toEqual(DEFAULT_PREFERENCE)
    expect(parsePreference('{"theme":"blue"}')).toEqual({ theme: 'blue', mode: 'system' })
  })
  test('system mode follows the device', () => {
    expect(resolveMode('system', true)).toBe('dark')
    expect(resolveMode('system', false)).toBe('light')
    expect(resolveMode('light', true)).toBe('light')
    expect(resolveMode('dark', false)).toBe('dark')
  })
})
