/** Parse a user- or bank-supplied amount (Dutch or English notation) into integer cents. */
export function parseAmount(input: string): number | null {
  let s = input.replace(/[€\s ]/g, '')
  if (!s) return null
  let sign = 1
  if (s[0] === '-' || s[0] === '+') {
    if (s[0] === '-') sign = -1
    s = s.slice(1)
  }
  if (!/^[\d.,]+$/.test(s)) return null

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let intPart: string
  let fracPart = ''

  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.'
    const thousands = dec === ',' ? '.' : ','
    const [i, f, extra] = s.split(dec)
    if (extra !== undefined) return null
    if (!isGrouped(i, thousands)) return null
    intPart = i.split(thousands).join('')
    fracPart = f
  } else if (lastComma >= 0) {
    const parts = s.split(',')
    if (parts.length !== 2) return null
    ;[intPart, fracPart] = parts
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      intPart = s.split('.').join('')
    } else {
      const parts = s.split('.')
      if (parts.length !== 2) return null
      ;[intPart, fracPart] = parts
    }
  } else {
    intPart = s
  }

  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart) || fracPart.length > 2) return null
  const cents = Number(intPart) * 100 + Number(fracPart.padEnd(2, '0') || 0)
  return sign * cents
}

function isGrouped(intPart: string, sep: string): boolean {
  if (!intPart.includes(sep)) return /^\d+$/.test(intPart)
  return new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(intPart)
}

const formatter = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Format cents as "€ 1.234,56" / "-€ 12,50". */
export function formatCents(cents: number): string {
  const body = `€ ${formatter.format(Math.abs(cents) / 100)}`
  return cents < 0 ? `-${body}` : body
}
