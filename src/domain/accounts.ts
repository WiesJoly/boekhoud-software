export type AccountGroup = 'fixed_assets' | 'current_assets' | 'liabilities' | 'equity' | 'revenue' | 'costs'

export interface Account {
  id: string
  name: string
  group: AccountGroup
}

const group = (g: AccountGroup, entries: [string, string][]): Account[] => entries.map(([id, name]) => ({ id, name, group: g }))

/** Pre-set chart of accounts for a psychology practice. Users only ever see the names. */
/** Pre-set chart of accounts for a Belgian psychology practice (natuurlijk persoon). Users only ever see the names. */
export const ACCOUNTS: Account[] = [
  ...group('fixed_assets', [
    ['inventaris', 'Inrichting en meubilair'],
    ['computers', 'Computers en ICT-materiaal'],
    ['testmateriaal', 'Testmateriaal'],
    ['verbouwing', 'Verbouwing praktijkruimte'],
    ['cumulatieve-afschrijvingen', 'Geboekte afschrijvingen'],
  ]),
  ...group('current_assets', [
    ['zakelijke-bank', 'Zichtrekening'],
    ['spaarrekening', 'Spaarrekening'],
    ['kas', 'Kas'],
    ['debiteuren-ziekenfondsen', 'Te ontvangen van ziekenfondsen'],
    ['debiteuren-netwerken', 'Te ontvangen van netwerken en overheid'],
    ['debiteuren-clienten', 'Te ontvangen van cliënten'],
    ['debiteuren-overig', 'Te ontvangen van organisaties'],
    ['nog-te-factureren', 'Nog te factureren sessies'],
    ['btw-te-vorderen', 'Terug te vorderen btw'],
  ]),
  ...group('liabilities', [
    ['leveranciers', 'Leveranciers'],
    ['btw-te-betalen', 'Te betalen btw'],
    ['te-betalen-kosten', 'Toe te rekenen kosten'],
    ['vooruitontvangen-bedragen', 'Vooruitontvangen bedragen'],
    ['terugvorderingen-ziekenfonds', 'Terugvorderingen ziekenfonds'],
  ]),
  ...group('equity', [
    ['eigen-vermogen', 'Eigen vermogen'],
    ['prive-stortingen', 'Privéstortingen'],
    ['prive-opnamen', 'Privéopnames'],
  ]),
  ...group('revenue', [
    ['omzet-riziv', 'Sessies terugbetaald via ziekenfonds'],
    ['omzet-netwerk', 'Sessies via netwerk of overheid'],
    ['omzet-zelfbetalers', 'Sessies privé (cliënt betaalt)'],
    ['omzet-annulering', 'Annuleringsvergoedingen'],
    ['omzet-coaching', 'Coaching'],
    ['omzet-training', 'Opleidingen en workshops'],
    ['omzet-verslagen', 'Deskundigenverslagen'],
    ['omzet-onderverhuur', 'Onderverhuur praktijkruimte'],
    ['omzet-subsidies', 'Subsidies en premies'],
    ['omzet-overig', 'Overige ontvangsten'],
  ]),
  ...group('costs', [
    ['kosten-huisvesting', 'Huur en praktijkruimte'],
    ['kosten-ict', 'ICT en software'],
    ['kosten-lidmaatschappen', 'Lidmaatschappen en beroepsbijdragen'],
    ['kosten-verzekeringen', 'Verzekeringen'],
    ['kosten-vorming', 'Vorming en bijscholing'],
    ['kosten-supervisie', 'Supervisie en intervisie'],
    ['kosten-testmateriaal', 'Testmateriaal'],
    ['kosten-wagen', 'Wagen'],
    ['kosten-vervoer', 'Verplaatsingen'],
    ['kosten-kantoor', 'Kantoor en klein materiaal'],
    ['kosten-marketing', 'Promotie'],
    ['kosten-boekhouder', 'Boekhouder en advies'],
    ['kosten-bank', 'Bankkosten'],
    ['kosten-onderaanneming', 'Onderaanneming en vervanging'],
    ['kosten-representatie', 'Representatie en restaurant'],
    ['kosten-afschrijvingen', 'Afschrijvingen'],
    ['kosten-niet-aftrekbare-btw', 'Niet-aftrekbare btw'],
  ]),
]

export const accountName = (id: string) => ACCOUNTS.find((a) => a.id === id)?.name ?? id
