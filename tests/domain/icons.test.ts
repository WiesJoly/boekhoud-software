import { expect, test } from 'vitest'
import { ICONS, type IconName } from '../../src/icons'

test('every icon the app uses has drawing data', () => {
  const used: IconName[] = ['overview', 'sessions', 'invoices', 'expenses', 'bank', 'tax', 'settings', 'logout', 'plus', 'upload', 'print', 'download']
  for (const name of used) expect(ICONS[name]?.length, name).toBeGreaterThan(0)
})
