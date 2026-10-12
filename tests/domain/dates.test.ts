import { expect, test } from 'vitest'
import { localIsoDate } from '../../src/domain/dates'

test('uses the local calendar day, not UTC (00:30 on 1 January in Brussels is still 1 January)', () => {
  process.env.TZ = 'Europe/Brussels'
  expect(localIsoDate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
  expect(localIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
})
