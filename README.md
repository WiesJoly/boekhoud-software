# Praktijkboekhouding voor psychologen (België)

Boekhouding voor zelfstandige psychologen in België: sessies en terugbetalingen, facturen met gestructureerde mededeling, uitgaven, bankkoppeling (CODA/MT940/CSV), btw per dienst (art. 44, gemengd, kleine onderneming), een raming van personenbelasting en sociale bijdragen, en jaarcijfers voor de boekhouder. Er komen geen medische gegevens in de boekhouding.

Vue 3 + TypeScript + Vite, Tailwind CSS 4, Firebase (Auth, Firestore, Storage).

> De fiscale bedragen (belastingschalen, belastingvrije som, sociale bijdragen, drempels) zijn indicatief en staan als data in Firestore (`fiscalParameters/{jaar}`). Laat ze nakijken door een boekhouder.

## Lokaal starten

Vereisten: Node 22+, Java 21+ (voor de Firebase-emulators; `brew install openjdk@21`).

```sh
npm install
cp .env.example .env        # VITE_USE_EMULATORS=true
npm run emulators           # Auth, Firestore, Storage + UI op http://localhost:4000
npm run seed                # schrijft fiscalParameters/2026 naar de emulator
npm run dev                 # app op http://localhost:5173
```

## Testen

```sh
npm test                    # domeinlogica (Vitest)
npm run test:rules          # Firestore- en Storage-regels tegen de emulator
npm run build               # typecheck + productiebuild
```

Testbestanden voor imports staan in `tests/fixtures/` (CODA, MT940, Belfius-CSV, sessies-CSV).

## Een echt Firebase-project koppelen

1. Maak een project in de Firebase-console (regio `europe-west1` voor opslag in de EU) en zet Authentication (e-mail/wachtwoord), Firestore en Storage aan.
2. Vul `.env` met de webconfiguratie en zet `VITE_USE_EMULATORS=false`.
3. `npx firebase use <project-id>` en `npx firebase deploy --only firestore:rules,storage,hosting` (na `npm run build`).
4. Seed de fiscale parameters met een service-account: `GOOGLE_APPLICATION_CREDENTIALS=… GCLOUD_PROJECT=<id> npx tsx scripts/seed-fiscal.ts`.

## Structuur

- `src/domain/` — alle boekhoudregels, zonder Vue of Firebase; volledig getest.
- `src/data/` — Firestore-repositories (alles onder `practices/{uid}`).
- `src/stores/` — Pinia-stores; `src/views/` — één scherm per menu-item.
- `firestore.rules`, `storage.rules` — elke gebruiker ziet alleen de eigen praktijk; facturen kunnen niet verwijderd worden.

## Importformaten

- **Bank**: CODA (alle Belgische banken), MT940, of CSV met kolommen zoals `Datum`, `Bedrag`, `Naam tegenpartij`, `Mededeling` (Belfius, KBC, BNP Paribas Fortis, ING).
- **Sessies**: `sessie_id;datum;ziekenfonds;pseudocode;bedrag;status;reden;betaald` met status `geregistreerd`, `ingediend`, `geweigerd` of `betaald`.

## Bewust (nog) niet

Peppol-verzending (de app waarschuwt wanneer een factuur via Peppol moet), MyCareNet/eHealth-koppeling, OCR van bonnen, PSD2-bankkoppeling, groepspraktijken, vennootschappen, bijberoep.
