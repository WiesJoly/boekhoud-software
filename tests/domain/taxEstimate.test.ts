import { describe, expect, test } from 'vitest'
import { FISCAL_DEFAULTS_2026, type FiscalParameters } from '../../src/domain/fiscal'
import { dayOfYear, estimateTax, reservationToDate } from '../../src/domain/taxEstimate'

const params: FiscalParameters = {
  ...FISCAL_DEFAULTS_2026,
  incomeTaxBrackets: [{ upToCents: 4000000, rate: 0.4 }, { upToCents: null, rate: 0.5 }],
  zvwRate: 0.0485,
  zvwMaxIncomeCents: 7940900,
  zelfstandigenaftrekCents: 120000,
  startersaftrekCents: 0,
  mkbWinstvrijstellingRate: 0.127,
  urencriteriumHours: 1225,
}

describe('estimateTax', () => {
  test('with zelfstandigenaftrek when hours criterion met', () => {
    expect(estimateTax({ profitCents: 6000000, hours: 1300, isStarter: false, params })).toEqual({
      taxableProfitCents: 5133240, incomeTaxCents: 2166620, zvwCents: 248962, totalCents: 2415582, zelfstandigenaftrekApplied: true,
    })
  })
  test('without zelfstandigenaftrek below 1225 hours', () => {
    expect(estimateTax({ profitCents: 6000000, hours: 1000, isStarter: false, params })).toMatchObject({
      taxableProfitCents: 5238000, incomeTaxCents: 2219000, zvwCents: 254043, zelfstandigenaftrekApplied: false,
    })
  })
  test('small profit never goes negative', () => {
    expect(estimateTax({ profitCents: 50000, hours: 1300, isStarter: false, params })).toMatchObject({ taxableProfitCents: 0, totalCents: 0 })
  })
  test('loss gives zero tax', () => {
    expect(estimateTax({ profitCents: -100000, hours: 0, isStarter: false, params }).totalCents).toBe(0)
  })
  test('startersaftrek on top of zelfstandigenaftrek', () => {
    const r = estimateTax({ profitCents: 6000000, hours: 1300, isStarter: true, params: { ...params, startersaftrekCents: 200000 } })
    expect(r.taxableProfitCents).toBe(Math.round((6000000 - 320000) * 0.873))
  })
  test('Zvw capped at maximum income', () => {
    const r = estimateTax({ profitCents: 20000000, hours: 1300, isStarter: false, params })
    expect(r.zvwCents).toBe(Math.round(7940900 * 0.0485))
  })
})

describe('reservationToDate', () => {
  test('annualises profit and hours and takes the elapsed share', () => {
    expect(dayOfYear('2026-07-02')).toBe(183)
    const projected = estimateTax({ profitCents: (3000000 * 365) / 183, hours: (650 * 365) / 183, isStarter: false, params })
    expect(reservationToDate(3000000, '2026-07-02', 650, false, params)).toBe(Math.round((projected.totalCents * 183) / 365))
  })
})

test('2026 defaults are marked unverified', () => {
  expect(FISCAL_DEFAULTS_2026.verified).toBe(false)
  expect(FISCAL_DEFAULTS_2026.capitalizeThresholdCents).toBe(45000)
  expect(FISCAL_DEFAULTS_2026.urencriteriumHours).toBe(1225)
})
