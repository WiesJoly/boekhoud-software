import { describe, expect, test } from 'vitest'
import { formatCents, parseAmount } from '../../src/domain/money'

describe('parseAmount', () => {
  test.each([
    ['1.234,56', 123456],
    ['-12,50', -1250],
    ['+12,50', 1250],
    ['12.5', 1250],
    ['12', 1200],
    ['1,234.56', 123456],
    ['€ 1.234', 123400],
    ['1.234.567,8', 123456780],
  ])('%s → %i cents', (input, cents) => {
    expect(parseAmount(input)).toBe(cents)
  })

  test.each(['abc', '', '1,2,3', '12,345,67x'])('rejects %j', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})

describe('formatCents', () => {
  test('formats Dutch currency', () => {
    expect(formatCents(123456)).toBe('€ 1.234,56')
    expect(formatCents(-1250)).toBe('-€ 12,50')
    expect(formatCents(0)).toBe('€ 0,00')
  })
})
