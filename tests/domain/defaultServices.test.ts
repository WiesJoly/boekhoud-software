import { expect, test } from 'vitest'
import { ACCOUNTS } from '../../src/domain/accounts'
import { DEFAULT_SERVICES } from '../../src/domain/defaultServices'

test('every default service has a VAT code and an existing revenue account', () => {
  expect(DEFAULT_SERVICES.length).toBeGreaterThanOrEqual(6)
  for (const s of DEFAULT_SERVICES) {
    expect(s.vatCode).not.toBeNull()
    expect(ACCOUNTS.find((a) => a.id === s.revenueAccount)?.group).toBe('revenue')
  }
})

test('coaching, training and reports are taxed; care is exempt; cancellation is outside VAT', () => {
  const byName = (n: string) => DEFAULT_SERVICES.find((s) => s.name.startsWith(n))!
  expect(byName('Coaching').vatCode).toBe('standard21')
  expect(byName('Training').vatCode).toBe('standard21')
  expect(byName('Deskundigenverslag').vatCode).toBe('standard21')
  expect(byName('Sessie eerstelijnspsychologische zorg')).toMatchObject({ vatCode: 'exempt', isCare: true, revenueAccount: 'omzet-riziv' })
  expect(byName('Psychotherapie').vatCode).toBe('exempt')
  expect(byName('Annuleringsvergoeding').vatCode).toBe('outside')
})
