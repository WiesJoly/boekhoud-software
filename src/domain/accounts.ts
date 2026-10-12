export type AccountGroup = 'fixed_assets' | 'current_assets' | 'liabilities' | 'equity' | 'revenue' | 'costs'

export interface Account {
  id: string
  name: string
  group: AccountGroup
}

const group = (g: AccountGroup, entries: [string, string][]): Account[] => entries.map(([id, name]) => ({ id, name, group: g }))

/** Pre-set chart of accounts for a psychology practice. Users only ever see the names. */
export const ACCOUNTS: Account[] = [
  ...group('fixed_assets', [
    ['inventaris', 'Inventaris'],
    ['computers', 'Computers'],
    ['testmateriaal', 'Testmateriaal'],
    ['verbouwing', 'Verbouwing'],
    ['cumulatieve-afschrijvingen', 'Cumulatieve afschrijvingen'],
  ]),
  ...group('current_assets', [
    ['zakelijke-bank', 'Zakelijke bankrekening'],
    ['spaarrekening', 'Spaarrekening'],
    ['kas', 'Kas'],
    ['debiteuren-verzekeraars', 'Debiteuren verzekeraars'],
    ['debiteuren-gemeenten', 'Debiteuren gemeenten'],
    ['debiteuren-clienten', 'Debiteuren cliënten'],
    ['debiteuren-overig', 'Debiteuren overig'],
    ['nog-te-declareren', 'Nog te declareren'],
    ['btw-te-vorderen', 'Btw te vorderen'],
  ]),
  ...group('liabilities', [
    ['crediteuren', 'Crediteuren'],
    ['btw-af-te-dragen', 'Btw af te dragen'],
    ['nog-te-betalen-kosten', 'Nog te betalen kosten'],
    ['vooruitontvangen-bedragen', 'Vooruitontvangen bedragen'],
    ['terugvorderingen-verzekeraar', 'Terugvorderingen verzekeraar'],
  ]),
  ...group('equity', [
    ['ondernemingsvermogen', 'Ondernemingsvermogen'],
    ['prive-stortingen', 'Privéstortingen'],
    ['prive-opnamen', 'Privéopnamen'],
  ]),
  ...group('revenue', [
    ['omzet-zorg-verzekeraar', 'Omzet zorg via verzekeraar'],
    ['omzet-zorg-client', 'Omzet zorg via cliënt'],
    ['omzet-jeugdwet', 'Omzet Jeugdwet'],
    ['omzet-zelfbetalers', 'Omzet zelfbetalers'],
    ['omzet-no-show', 'Omzet no-show'],
    ['omzet-coaching', 'Omzet coaching'],
    ['omzet-training', 'Omzet trainingen'],
    ['omzet-rapportage', 'Omzet rapportages'],
    ['omzet-onderverhuur', 'Omzet onderverhuur'],
    ['omzet-subsidies', 'Subsidies'],
    ['omzet-overig', 'Overige omzet'],
  ]),
  ...group('costs', [
    ['kosten-huisvesting', 'Huisvesting'],
    ['kosten-ict', 'ICT en software'],
    ['kosten-lidmaatschappen', 'Lidmaatschappen'],
    ['kosten-verzekeringen', 'Verzekeringen'],
    ['kosten-scholing', 'Scholing'],
    ['kosten-supervisie', 'Supervisie en intervisie'],
    ['kosten-testmateriaal', 'Testmateriaal'],
    ['kosten-vervoer', 'Vervoer'],
    ['kosten-kantoor', 'Kantoor en kleine inventaris'],
    ['kosten-marketing', 'Marketing'],
    ['kosten-advies', 'Advies en administratie'],
    ['kosten-bank', 'Bank en betaalverkeer'],
    ['kosten-personeel', 'Personeel'],
    ['kosten-inhuur', 'Inhuur waarnemers'],
    ['kosten-representatie', 'Representatie'],
    ['kosten-afschrijvingen', 'Afschrijvingen'],
    ['kosten-niet-aftrekbare-btw', 'Niet-aftrekbare btw'],
  ]),
]

export const accountName = (id: string) => ACCOUNTS.find((a) => a.id === id)?.name ?? id
