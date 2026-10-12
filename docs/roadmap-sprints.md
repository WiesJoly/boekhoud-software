# Sprints: uitgestelde punten na de MVP

Deze punten kwamen uit de eindreview van de MVP (branch `feat/mvp`, oktober 2026). Ze zijn klein, maar elk kan een gebruiker een fout bedrag of dubbele gegevens geven. Ze staan in volgorde van risico: eerst geld dat verkeerd geboekt wordt, dan imports, dan weergave.

Elke sprint volgt dezelfde werkwijze: eerst een test die het probleem aantoont (rood), dan de fix (groen), daarna de volledige testsuite en een controle in de browser tegen de emulator.

---

## Sprint 1: Creditnota's en bedragen kloppen altijd

Doel: geen enkel bedrag verdwijnt of wordt dubbel geboekt rond creditnota's en bankbestanden.

### 1.1 Terugbetaling na creditnota op een betaalde factuur
- **Probleem:** wie een (deels) betaalde factuur crediteert, ziet het openstaande bedrag op € 0 vallen, maar nergens staat dat de cliënt geld terugkrijgt. Op de balans ontbreekt die schuld, en de terugbetaling op de bank kan alleen als "Overig" gekoppeld worden.
- **Waar:** `src/data/invoices.ts` (`createCredit`), `src/domain/invoices.ts` (`outstandingCents`), `src/domain/annualReport.ts`, `src/views/BankView.vue`.
- **Aanpak:** bij crediteren het al betaalde bedrag vastleggen als "terug te betalen" op de creditnota. Een uitgaande banktransactie kan aan die creditnota gekoppeld worden. Op de balans komt een schuld "Terug te betalen aan cliënten".
- **Klaar als:** een test toont dat een creditnota op een factuur van € 80, waarvan € 80 betaald is, een schuld van € 80 geeft, die na koppeling van de terugbetaling op € 0 komt.

### 1.2 Geen tweede creditnota voor dezelfde factuur
- **Probleem:** vanuit twee tabbladen kan dezelfde factuur twee keer gecrediteerd worden, omdat `createCredit` de status van de oorspronkelijke factuur niet opnieuw leest in de transactie.
- **Waar:** `src/data/invoices.ts`, `firestore.rules`.
- **Aanpak:** de oorspronkelijke factuur lezen in de transactie en weigeren als de status al `credited` is. Daarnaast een regel in `firestore.rules` die `status` niet meer laat wijzigen zodra die `credited` is.
- **Klaar als:** een domeintest (planner) en een regeltest tonen dat een tweede creditnota geweigerd wordt.

### 1.3 Lege bedragen in CODA geven een foutmelding
- **Probleem:** een leeg of met spaties opgevuld bedragveld in een CODA-record wordt € 0,00 in plaats van een foutregel.
- **Waar:** `src/domain/bankImport.ts` (`parseCoda`).
- **Aanpak:** het bedragveld valideren met `/^\d{15}$/` voor het omzetten.
- **Klaar als:** een test met een CODA-record met leeg bedrag geeft één foutregel, en de overige regels worden nog geïmporteerd.

---

## Sprint 2: Imports zijn robuust

Doel: geen dubbele of verschoven gegevens, welk bestand de gebruiker ook kiest.

### 2.1 CSV met komma als scheidingsteken
- **Probleem:** in een bestand dat de komma als scheidingsteken gebruikt, wordt een niet-geciteerd bedrag als `12,50` in twee kolommen gesplitst. Het bedrag wordt € 12,00 en de volgende kolommen schuiven op.
- **Waar:** `src/domain/bankImport.ts` (`parseGenericCsv`).
- **Aanpak:** controleren dat elke rij evenveel kolommen heeft als de kop. Is dat niet zo, dan wordt de rij een foutregel met de uitleg "Bedrag niet tussen aanhalingstekens; exporteer met puntkomma".
- **Klaar als:** een test met `Datum,Bedrag,Naam\n01/03/2026,12,50,X` geeft een foutregel en geen bedrag van € 12.

### 2.2 Dezelfde periode als CSV én als CODA
- **Probleem:** CSV en CODA geven een andere tekst voor tegenpartij en mededeling, dus een andere `importHash`. Dezelfde transactie verschijnt dan twee keer.
- **Waar:** `src/views/BankView.vue`, `src/domain/bankImport.ts`.
- **Aanpak:** een zachte duplicaatcontrole op datum + bedrag (+ OGM indien aanwezig) tegen bestaande transacties. Die regels worden in het importvoorbeeld getoond als "Mogelijk al geïmporteerd" en staan standaard uitgevinkt.
- **Klaar als:** een domeintest `findLikelyDuplicates(rows, existing)` geeft de juiste regels terug, en in de browser toont het importvoorbeeld de markering.

### 2.3 Sessie-id's en lege ziekenfondsnamen
- **Probleem:** `safeId` maakt van `a/b` en `a b` hetzelfde document-id, waardoor de ene sessie de andere overschrijft. Een lege kolom `ziekenfonds` maakt een debiteur zonder naam aan.
- **Waar:** `src/views/ConsultsView.vue`, `src/domain/declarationImport.ts`.
- **Aanpak:** het document-id afleiden met de bestaande deterministische hash (zoals bij bank-imports). Een lege ziekenfondsnaam wordt een foutregel in `parseDeclarationFile`.
- **Klaar als:** tests tonen dat twee verschillende sessie-id's twee documenten geven, en dat een lege ziekenfondsnaam een foutregel geeft.

---

## Sprint 3: Belasting-scherm toont altijd het juiste jaar

Doel: de raming op het Overzicht en op Belasting gebruikt altijd de juiste parameters en het juiste aantal dagen.

### 3.1 Jaarkeuze op Belasting beïnvloedt het Overzicht
- **Probleem:** een ander jaar kiezen op Belasting vervangt de globale `practice.fiscal`. Het Overzicht rekent de reservering van dit jaar daarna met de parameters van dat andere jaar.
- **Waar:** `src/stores/practice.ts` (`loadYear`), `src/views/TaxView.vue`, `src/views/OverviewView.vue`.
- **Aanpak:** de parameters per jaar cachen (`fiscalByYear`). Het Overzicht leest altijd het huidige jaar, Belasting het gekozen jaar.
- **Klaar als:** in de browser verandert het bedrag op het Overzicht niet na het kiezen van een ander jaar op Belasting, en een storetest bevestigt de cache per jaar.

### 3.2 Schrikkeljaren in de jaarraming
- **Probleem:** `TaxView.vue` projecteert met een vaste 365 dagen, terwijl `reservationToDate` met het echte aantal dagen rekent.
- **Waar:** `src/views/TaxView.vue`, `src/domain/taxEstimate.ts`.
- **Aanpak:** de projectie naar het domein verplaatsen (`projectYearProfit(profit, today)`), met `daysInYear`.
- **Klaar als:** een test voor 2028 (schrikkeljaar) rekent met 366 dagen.

---

## Buiten deze sprints

Deze punten waren al bewust buiten de MVP gehouden. Ze verdienen elk een eigen ontwerp:
- Peppol-verzending van e-facturen.
- MyCareNet/eHealth-koppeling.
- OCR van bonnen.
- PSD2-bankkoppeling.
- Groepspraktijken.
- Vennootschap (BV).
- Bijberoep.
