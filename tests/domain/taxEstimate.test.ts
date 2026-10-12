import { describe, expect, test } from 'vitest'
import { FISCAL_DEFAULTS_2026, type FiscalParameters } from '../../src/domain/fiscal'
import { dayOfYear, estimateTax, reservationToDate, socialContributions } from '../../src/domain/taxEstimate'

const params: FiscalParameters = {
  ...FISCAL_DEFAULTS_2026,
  incomeTaxBrackets: [{ upToCents: 1000000, rate: 0.25 }, { upToCents: null, rate: 0.5 }],
  taxFreeAmountCents: 500000,
  municipalTaxRate: 0.07,
  socialContribution: { tiers: [{ upToCents: 5000000, rate: 0.2 }, { upToCents: null, rate: 0 }], minimumYearCents: 300000, managementFeeRate: 0 },
}

describe('socialContributions', () => {
  test('deductible contributions: c = 20% × (profit − c)', () => {
    expect(socialContributions(6000000, params)).toBe(1000000)
  })
  test('minimum applies to small and negative profits', () => {
    expect(socialContributions(1000000, params)).toBe(300000)
    expect(socialContributions(-50000, params)).toBe(300000)
  })
  test('management fee on top', () => {
    const withFee = { ...params, socialContribution: { ...params.socialContribution, managementFeeRate: 0.04 } }
    expect(socialContributions(1000000, withFee)).toBe(312000)
  })
  test('upper tier at 0%', () => {
    // income above the 50.000 limit is not charged: c = 0.2 × 5.000.000
    expect(socialContributions(20000000, params)).toBe(1000000)
  })
})

describe('estimateTax', () => {
  test('personenbelasting with belastingvrije som and gemeentebelasting', () => {
    expect(estimateTax({ profitCents: 6000000, params })).toEqual({
      socialContributionsCents: 1000000, taxableIncomeCents: 5000000, incomeTaxCents: 2125000, municipalTaxCents: 148750, totalCents: 3273750,
    })
  })
  test('low profit', () => {
    expect(estimateTax({ profitCents: 1000000, params })).toEqual({
      socialContributionsCents: 300000, taxableIncomeCents: 700000, incomeTaxCents: 50000, municipalTaxCents: 3500, totalCents: 353500,
    })
  })
  test('no profit: only the minimum contribution', () => {
    expect(estimateTax({ profitCents: 0, params })).toMatchObject({ incomeTaxCents: 0, municipalTaxCents: 0, totalCents: 300000 })
  })
})

describe('reservationToDate', () => {
  test('annualises profit and takes the elapsed share', () => {
    expect(dayOfYear('2026-07-02')).toBe(183)
    const projected = estimateTax({ profitCents: (3000000 * 365) / 183, params })
    expect(reservationToDate(3000000, '2026-07-02', params)).toBe(Math.round((projected.totalCents * 183) / 365))
  })
})

test('2026 defaults are Belgian and unverified', () => {
  expect(FISCAL_DEFAULTS_2026.verified).toBe(false)
  expect(FISCAL_DEFAULTS_2026.incomeTaxBrackets.map((b) => b.rate)).toEqual([0.25, 0.4, 0.45, 0.5])
  expect(FISCAL_DEFAULTS_2026.taxFreeAmountCents).toBe(1118000)
  expect(FISCAL_DEFAULTS_2026.smallBusinessThresholdCents).toBe(2500000)
  expect(FISCAL_DEFAULTS_2026.socialContribution.minimumYearCents).toBe(356168)
})
