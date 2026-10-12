# Boekhoudsoftware voor psychologen – functioneel ontwerp

Oct 12, 2026 · @Wies Joly

## Doel en uitgangspunten

De software moet een zelfstandig psycholoog in Nederland in staat stellen om met zo min mogelijk handwerk een sluitende boekhouding, correcte btw-behandeling en een aangifte-klare jaarrekening te hebben, zonder ooit medische gegevens in de boekhouding te zetten.

**Doelgroep**

- Vrijgevestigde psychologen: GZ-psycholoog, klinisch psycholoog, psychotherapeut (BIG), en psychologen zonder BIG-registratie (NIP/NVO, coaches, trainers).
- Rechtsvorm: vooral eenmanszaak en vof (inkomstenbelasting), daarnaast een deel met een praktijk-BV (vennootschapsbelasting + dga-salaris).
- Praktijkgrootte: solo tot kleine groepspraktijk (1–10 behandelaren), soms met een praktijkondersteuner of secretaresse.

**Uitgangspunten**

1. **Twee werelden, strikt gescheiden.** Het EPD (dossier, diagnose, behandelplan) blijft in het EPD. De boekhouding ziet alleen wat financieel nodig is: bedrag, datum, debiteur, prestatiecode, factuurnummer.
2. **Btw per dienst, niet per praktijk.** Dezelfde psycholoog kan vrijgestelde zorg én belaste diensten leveren. De software beslist per regel.
3. **Zorgprestatiemodel als bron.** Sinds 2022 declareert de ggz per consult (zorgprestatiemodel). Omzet ontstaat dus per sessie, niet meer per afgesloten traject.
4. **Kasstelsel voor de ondernemer, factuurstelsel onder de motorkap.** De psycholoog wil weten wat er binnenkomt; de Belastingdienst wil omzet op factuurdatum. De software toont beide.
5. **Gebouwd voor een niet-boekhouder.** Elke keuze in gewone taal, met een standaard die klopt voor 80% van de gebruikers.

## Inkomstenstromen

Een psycholoog heeft zelden één inkomstenbron; de software moet elke stroom apart herkennen omdat debiteur, btw en betaaltermijn per stroom verschillen.

| Inkomstenstroom | Wie betaalt | Btw (indicatief) | Typische betaaltermijn | Bijzonderheid |
| --- | --- | --- | --- | --- |
| Ggz-consulten (basis-/specialistische ggz) | Zorgverzekeraar | Vrijgesteld (BIG-beroep) | 2–6 weken | Declaratie via VECOZO; afwijzingen en correcties komen voor |
| Ggz zonder contract | Cliënt (die zelf terugvraagt bij verzekeraar) | Vrijgesteld | Direct tot 14 dagen | Restitutie-/niet-gecontracteerde zorg; cliënt krijgt factuur met prestatiecodes |
| Jeugd-ggz | Gemeente (Jeugdwet) | Vrijgesteld | 2–8 weken | Berichtenverkeer via iJw, per gemeente andere tarieven |
| Onverzekerde therapie (zelfbetaler) | Cliënt | Vrijgesteld als het zorg is door BIG-professional | Direct | Pin, Tikkie, iDEAL-betaallink |
| No-show / late afzegging | Cliënt | Afhankelijk van advies: geen zorg geleverd | 14 dagen | Mag niet bij verzekeraar gedeclareerd worden |
| Coaching, loopbaanbegeleiding | Cliënt of werkgever | 21% | 14–30 dagen | Geen gezondheidsdoel → belast |
| Trainingen, workshops, lezingen | Organisatie | 21% (of vrijgesteld als erkend onderwijs) | 30 dagen | Soms CRKBO-vrijstelling |
| Intervisie, supervisie, leertherapie | Collega/instelling | Situatieafhankelijk | 30 dagen | Supervisie voor opleiding vaak vrijgesteld als onderwijs |
| Deskundigenrapporten (keuring, letselschade, rechtbank) | Verzekeraar, advocaat, rechtbank | 21% | 30–60 dagen | Doel is niet behandelen → belast |
| EAP / werkgeverszorg | Werkgever of EAP-bureau | Meestal vrijgesteld als het behandeling is | 30 dagen | Raamcontract, verzamelfactuur |
| Onderverhuur behandelkamer | Collega | Vrijgesteld, of 21% bij optie belaste verhuur | Maandelijks | Terugkerende factuur |
| Subsidies, ROS-vergoedingen, praktijkondersteuning | Overheid/instantie | Buiten btw | Wisselend | Geen omzet in btw-zin |

Btw-kolom is indicatief; de exacte behandeling hangt af van registratie en doel van de dienst en moet per praktijk worden bevestigd door een fiscalist.

**Wat de software per inkomstenregel vastlegt**

- Datum prestatie en factuurdatum (kunnen verschillen).
- Debiteur: verzekeraar, gemeente, cliënt (pseudoniem of cliëntnummer), organisatie.
- Prestatiecode en tarief (bijv. consultcode + duur + setting), bij voorkeur geïmporteerd uit het EPD.
- Behandelaar (voor groepspraktijken: omzet per behandelaar).
- Btw-code: vrijgesteld zorg / 21% / buiten btw.
- Status: geregistreerd → gedeclareerd → (deels) afgewezen → betaald.

## Facturatie en declaratie

Elk geleverd consult moet precies één betaalroute krijgen, en de software volgt het tot het geld op de bank staat.

&#91;embedded content: betaalroute per consult · 4 routes, 1 afwijzingslus\]

De afwijzingslus bij verzekeraars is waar in de praktijk de meeste omzet weglekt; die verdient een eigen takenlijst.

**Per route**

- **Verzekeraar (gecontracteerd):** declaraties komen uit het EPD, dat via VECOZO indient. De boekhouding importeert het declaratiebestand en het retourbericht, en boekt per consult: gedeclareerd, toegewezen, afgewezen, betaald.
- **Cliënt:** factuur met prestatiecode, tarief, datum en behandelaar (de cliënt heeft dit nodig om bij de eigen verzekeraar terug te vragen). Betaling via betaallink, pin of overboeking. Eigen risico is geen zaak van de psycholoog bij gecontracteerde zorg; de verzekeraar int dat zelf.
- **Gemeente:** facturatie volgens de afspraken per gemeente, met eigen tarieven en toewijzingen; de software controleert of er een geldige toewijzing is.
- **Organisatie:** gewone zakelijke factuur, met de juiste btw en eventueel inkoopordernummer.

**Factuureisen die de software afdwingt**

- Doorlopend factuurnummer per praktijk.
- KvK-nummer, AGB-code van praktijk en behandelaar, BIG-nummer waar relevant.
- Btw-nummer en btw-bedrag, of de vermelding dat de dienst is vrijgesteld.
- Tarieven volgens de maximumtarieven van de NZa voor zorg aan zelfbetalers en niet-gecontracteerde zorg; de software waarschuwt bij een hoger tarief.
- Creditfactuur in plaats van verwijderen, zodat de nummering sluit.

## Uitgaven en kostencategorieën

De uitgavenkant moet vooral snel zijn: bon fotograferen of factuur doorsturen, de software stelt de categorie voor en onthoudt die per leverancier.

| Categorie | Voorbeelden | Fiscale aandachtspunt |
| --- | --- | --- |
| Huisvesting | Huur behandelkamer, servicekosten, schoonmaak, energie | Werkruimte thuis is alleen aftrekbaar onder strikte voorwaarden (zelfstandige ruimte) |
| Software en ICT | EPD-abonnement, VECOZO-certificaat, beveiligde mail, videobellen, ROM-tools, cloudopslag | Vaak buitenlandse leveranciers → btw verlegd |
| Beroepsregistratie en lidmaatschap | BIG (geen kosten), NIP, LVVP, NVGzP, NVP, kwaliteitsregister | Volledig zakelijk |
| Verzekeringen | Beroepsaansprakelijkheid, rechtsbijstand, inventaris, AOV | AOV is geen bedrijfskost maar een inkomensvoorziening (aftrekbaar in box 1) |
| Scholing en accreditatie | Herregistratie-uren, cursussen, congressen, vakliteratuur | Volledig aftrekbaar; reis- en verblijfkosten meenemen |
| Supervisie, intervisie, eigen therapie | Leertherapie voor opleiding | Zakelijk als het voor de beroepsuitoefening vereist is |
| Testmateriaal | Testpakketten, licenties per afname, scoringssoftware | Duurzame testkoffers als bedrijfsmiddel activeren |
| Inventaris | Bureau, stoelen, laptop, inrichting behandelkamer | Boven € 450 per stuk activeren en afschrijven; investeringsaftrek mogelijk |
| Vervoer | Zakelijke km privéauto, OV, fiets | Kilometervergoeding per km; auto van de zaak → bijtelling |
| Kantoor en communicatie | Telefoon, internet, porti, drukwerk | Gemengd gebruik → zakelijk deel |
| Marketing | Website, vermelding op zorgplatforms, visitekaartjes | Volledig zakelijk |
| Advies en administratie | Boekhouder, fiscalist, juridisch advies, kwaliteitsaudit | Volledig zakelijk |
| Bank en betaalverkeer | Zakelijke rekening, pinautomaat, betaallinks, incasso | Volledig zakelijk |
| Personeel en inhuur | Secretaresse, praktijkondersteuner, waarnemer, onderaannemer | Loonheffingen bij personeel; let op schijnzelfstandigheid bij inhuur |
| Representatie | Kerstattentie verwijzers, lunch met collega | Beperkt aftrekbaar; btw niet terug te vragen |

**Belangrijk bij uitgaven van een btw-vrijgestelde psycholoog:** wie alleen vrijgestelde zorg levert, kan de btw op inkoop niet terugvragen. De btw is dan gewoon onderdeel van de kosten. De software moet dus kosten inclusief btw boeken voor een volledig vrijgestelde praktijk, en alleen splitsen als er ook belaste omzet is (zie btw-sectie).

**Functies**

- Bonnenscanner met automatische herkenning van bedrag, datum en leverancier.
- Inkoopfacturen ontvangen op een eigen e-mailadres (bijv. facturen@praktijk...).
- Regels: “alles van leverancier X is categorie Y”.
- Activeringssuggestie bij aankopen boven de drempel, met automatisch afschrijvingsschema.
- Kilometerregistratie met adresboek van vaste locaties.
- Herinnering voor jaarlijkse kosten (verzekeringen, lidmaatschappen) zodat niets ontbreekt.

## Btw: vrijgestelde zorg en belaste diensten

Btw is het onderdeel waar psychologen het vaakst fout gaan, omdat ze denken dat “zorg is vrijgesteld” voor alles geldt wat ze doen.

**De twee toetsen die de software per dienst stelt**

1. **Wie levert?** Een beroep geregeld in de Wet BIG (zoals GZ-psycholoog, klinisch psycholoog, psychotherapeut) of een daaraan gelijkgestelde kwaliteitseis. Zonder zo'n registratie is de vrijstelling niet vanzelfsprekend.
2. **Waarom?** Het doel moet de bescherming, het behoud of herstel van de gezondheid zijn. Een rapport voor een verzekeraar, coaching of een training voor een bedrijf heeft dat doel niet, en is dus belast.

**Drie praktijkprofielen**

- **Volledig vrijgesteld:** alleen zorg. Geen btw-aangifte nodig zolang er geen belaste omzet is; eventueel ontheffing van administratieve verplichtingen. Inkoop-btw is kosten.
- **Gemengd:** zorg plus coaching, trainingen of rapporten. Wél btw-aangifte, alleen over het belaste deel. Inkoop-btw is deels aftrekbaar: direct toerekenbaar aan belaste omzet volledig, gemengde kosten naar verhouding (pro rata).
- **Volledig belast:** psycholoog zonder BIG-registratie die coaching levert. Gewoon 21% en volledige aftrek.

**Wat de software doet**

- Bij elk product of elke prestatiecode staat een btw-code; de gebruiker hoeft niet per factuur te kiezen.
- Waarschuwing bij een nieuwe dienst zonder btw-code, en bij een vrijgestelde factuur aan een organisatie (vaak een teken van een belaste dienst).
- Automatische berekening van de pro-rata-verhouding en een herzieningsboeking aan het eind van het jaar.
- Kleineondernemersregeling (KOR): signaleren wanneer belaste omzet onder de drempel blijft, zodat de gebruiker kan kiezen. Let op: de KOR-drempel kijkt naar de totale omzet, en vrijgestelde zorg telt daar in principe niet mee; dit moet de software correct uitrekenen en uitleggen.
- Btw verlegd bij buitenlandse diensten (zoals Zoom, Google, Microsoft) automatisch herkennen.
- Kwartaalaangifte voorbereiden, met controle op afwijkingen ten opzichte van vorige kwartalen.

Deze sectie beschrijft het principe; bedragen, drempels en randgevallen (zoals psychologen met alleen een NIP-registratie) moeten met een fiscalist worden vastgesteld voordat ze in de software worden ingebouwd.

## Rekeningschema

Een kort, vooringesteld schema van ongeveer 40 rekeningen dekt een psychologenpraktijk; de gebruiker ziet de nummers nooit, alleen de namen.

| Groep | Rekeningen (voorbeeld) |
| --- | --- |
| 0 Vaste activa | Inventaris, computers, testmateriaal, verbouwing, cumulatieve afschrijvingen |
| 1 Liquide middelen en vorderingen | Zakelijke bank, spaarrekening, kas, debiteuren verzekeraars, debiteuren gemeenten, debiteuren cliënten, debiteuren overig, nog te declareren, btw te vorderen |
| 1 Schulden | Crediteuren, btw af te dragen, nog te betalen kosten, vooruitontvangen bedragen, terugvorderingen verzekeraar |
| 2 Eigen vermogen | Ondernemingsvermogen, privéstortingen, privéopnamen (eenmanszaak) of aandelenkapitaal en rekening-courant dga (BV) |
| 8 Omzet | Zorg verzekeraar, zorg cliënt, Jeugdwet, zelfbetalers, no-show, coaching (21%), training, rapportage (21%), onderverhuur, subsidies |
| 4 Kosten | Huisvesting, ICT en software, lidmaatschappen, verzekeringen, scholing, supervisie, testmateriaal, vervoer, kantoor, marketing, advies, bank, personeel, inhuur waarnemers, representatie, afschrijvingen, niet-aftrekbare btw |

Twee rekeningen verdienen extra aandacht:

- **Nog te declareren:** consulten die geleverd zijn maar nog niet gedeclareerd. Aan het eind van het jaar is dit omzet, ook als het geld pas in januari komt.
- **Terugvorderingen verzekeraar:** correcties na materiële controle. Die kunnen jaren later komen en horen als aparte post zichtbaar te zijn.

## Bank, debiteurenbeheer en controle

Het grootste financiële risico van een psycholoog is niet een hoge uitgave, maar geld dat nooit binnenkomt: afgewezen declaraties, vergeten no-shows en cliënten die niet betalen.

**Bankkoppeling**

- Automatische import via PSD2-koppeling met de zakelijke rekening.
- Verzamelbetalingen van verzekeraars (één bedrag voor tientallen consulten) automatisch uitsplitsen op basis van het retourbericht van VECOZO.
- Betalingen van cliënten matchen op factuurnummer of betaalkenmerk, niet op naam.
- Privé-uitgaven via de zakelijke rekening markeren als privéopname met één tik.

**Debiteurenbeheer**

- Overzicht per type debiteur: verzekeraar, gemeente, cliënt, organisatie.
- Afwijzingen van verzekeraars met reden (bijv. verzekering beëindigd, verwijzing ontbreekt, maximum bereikt) en een vaste actie per reden.
- Herinneringen aan cliënten automatisch na 14 en 28 dagen, in een zachte toon die past bij een therapeutische relatie; de psycholoog kan per cliënt herinneringen uitzetten.
- Signaal bij oplopend openstaand bedrag per cliënt, zodat het in therapie bespreekbaar is voordat het een incasso wordt.
- Wettelijke incassokosten pas na een bewuste keuze van de psycholoog, nooit automatisch.

**Controle**

- Maandelijkse check: zijn alle consulten uit het EPD gedeclareerd of gefactureerd?
- Afwijkingen tussen declaratie en betaling (tariefverschil, deelbetaling) markeren.
- Bewaarplicht: fiscale stukken 7 jaar; de software archiveert automatisch en waarschuwt voor verwijderen.

## Rapportages en belastingaangifte

De psycholoog wil drie dingen weten: hoeveel verdien ik, hoeveel moet ik reserveren voor belasting, en loopt mijn praktijk goed.

**Dashboard (dagelijks)**

- Omzet deze maand en dit jaar, uitgesplitst naar zorg en overige diensten.
- Openstaand bij verzekeraars, gemeenten en cliënten.
- Nog te declareren consulten.
- Geschatte belastingreservering: inkomstenbelasting + Zvw-bijdrage, gebaseerd op winst tot nu toe.
- Banksaldo minus reservering = wat je echt kunt uitgeven.

**Praktijkcijfers (maandelijks)**

- Gemiddelde opbrengst per consult en per gewerkt uur.
- Aantal consulten per week, vergeleken met vorig jaar.
- No-show-percentage en gemiste omzet.
- Omzet per verzekeraar, inclusief omzetplafonds en hoe dicht je daarbij zit. Veel gecontracteerde praktijken hebben per verzekeraar een plafond; overschrijding betekent onbetaald werk.
- Bij groepspraktijken: omzet en kosten per behandelaar.

**Jaarafsluiting**

- Winst-en-verliesrekening en balans.
- Overzicht voor de aangifte inkomstenbelasting: winst, investeringsaftrek, privégebruik, en een checklist van ondernemersaftrekken.
- Urencriterium (1.225 uur per jaar) bijhouden voor zelfstandigenaftrek; agenda-uren uit het EPD aangevuld met administratie, scholing en intervisie.
- MKB-winstvrijstelling en zelfstandigenaftrek met bedragen die jaarlijks via een update worden bijgewerkt (die bedragen veranderen elk jaar).
- Export naar boekhouder of fiscalist (XAF-auditfile, Excel, PDF).

**Voor een BV**

- Gebruikelijkloonregeling signaleren voor het dga-salaris.
- Rekening-courant dga bewaken.
- Voorbereiding vennootschapsbelasting en dividend.

## Privacy, AVG en beroepsgeheim

In een psychologenpraktijk is zelfs het feit dat iemand cliënt is een bijzonder persoonsgegeven; de boekhouding moet daarom met zo min mogelijk herleidbare gegevens werken.

- **Dataminimalisatie:** in de boekhouding een cliëntnummer in plaats van een naam waar mogelijk. Namen alleen op de factuur zelf, niet in grootboekomschrijvingen of rapportages.
- **Geen diagnose-informatie.** Prestatiecodes kunnen iets prijsgeven over de zorgvraag. Toon ze alleen waar nodig (factuur, declaratie) en niet in dashboards of exports naar de boekhouder.
- **Bankomschrijvingen:** de software genereert neutrale betaalkenmerken (“Praktijk X – factuur 2026-0142”), zodat op het bankafschrift van de cliënt niets over therapie staat.
- **Toegang per rol:** de boekhouder ziet alleen geaggregeerde omzet en kosten; de secretaresse ziet debiteuren, geen dossiers; de behandelaar ziet zijn eigen cliënten.
- **Hosting en beveiliging:** opslag in de EU, versleuteling, tweestapsverificatie, verwerkersovereenkomst beschikbaar. NEN 7510 is de norm die zorgverleners verwachten bij software met cliëntgegevens.
- **Bewaartermijnen botsen:** het medisch dossier kent een lange bewaartermijn (20 jaar), de fiscale administratie 7 jaar. De boekhouding bewaart alleen financiële gegevens en volgt de fiscale termijn.
- **Facturen naar cliënten** via een beveiligde link of portaal, niet als bijlage in gewone e-mail.

## Schermen en gebruikersflow

Zeven schermen zijn genoeg; de psycholoog moet in tien minuten per week klaar zijn.

| Scherm | Wat de gebruiker ziet | Belangrijkste actie |
| --- | --- | --- |
| Overzicht | Beschikbaar saldo na belastingreservering, omzet, openstaand, taken | Taken afvinken (“3 afwijzingen bekijken”) |
| Consulten en declaraties | Lijst geleverde consulten met status per regel | Afwijzing oplossen, opnieuw indienen |
| Facturen | Facturen aan cliënten en organisaties, herinneringsstatus | Nieuwe factuur, betaallink sturen |
| Uitgaven | Bonnen en inkoopfacturen, voorgestelde categorie | Bon fotograferen, categorie bevestigen |
| Bank | Transacties met voorgestelde koppeling | Koppeling bevestigen of privé markeren |
| Belasting | Btw-kwartaal, verwachte inkomstenbelasting, urencriterium | Aangifte voorbereiden, cijfers exporteren |
| Instellingen | Praktijkgegevens, tarieven, diensten met btw-code, koppelingen | Nieuwe dienst toevoegen |

**Wekelijkse routine**

1. Overzicht openen en taken bekijken.
2. Banktransacties bevestigen (meestal al automatisch gekoppeld).
3. Bonnen van de week fotograferen.
4. Afwijzingen en openstaande cliëntfacturen nalopen.

**Per kwartaal:** btw-aangifte controleren (alleen bij belaste omzet) en belastingreservering bijstellen. **Per jaar:** jaarafsluiting, export naar boekhouder en vaste kosten van volgend jaar inschatten.

## Mijn gedachten: valkuilen, kansen en een eerste versie

Mijn belangrijkste conclusie: bouw geen boekhoudpakket dat óók psychologen bedient, maar een laag die het EPD en de bank verbindt en de psycholoog-specifieke problemen oplost. Algemene boekhoudsoftware kan de rest al.

**Waar ik de grootste waarde zie**

1. **Van consult naar betaling in één lijn.** De echte pijn zit in de keten agenda → declaratie → afwijzing → betaling. Generieke pakketten zien alleen het laatste stuk.
2. **Btw-zekerheid per dienst.** Een gemengde praktijk die coaching of rapporten ten onrechte vrijgesteld factureert, loopt een naheffing over jaren op. Een slimme waarschuwing is hier veel waard.
3. **Belastingreservering.** Starters in de ggz schrikken vaak van hun eerste aanslag. Een realtime “dit is van jou, dit is van de Belastingdienst” voorkomt dat.
4. **Omzetplafonds per verzekeraar.** Een psycholoog die weet dat het plafond bij verzekeraar X in september bereikt is, kan zijn wachtlijst anders inrichten.

**Valkuilen**

- **Zelf declareren bouwen is zwaar.** VECOZO-koppeling, standaarden en prestatiecodes veranderen jaarlijks. Mijn advies: niet zelf declareren, maar koppelen met EPD's die dat al doen en hun declaratie- en retourinformatie importeren.
- **Fiscale regels als harde code.** Bedragen en drempels veranderen elk jaar. Bouw ze als tabel met ingangsdatum, nooit als vaste waarde in de code.
- **De software als belastingadviseur presenteren.** Beter: duidelijk signaleren en uitleggen, en de beslissing (zeker bij btw) laten bevestigen door gebruiker of adviseur.
- **Te veel scope.** Personeel, BV-structuren en Jeugdwet zijn elk een product op zich.

**Open vragen voor jou**

- Is dit voor eigen gebruik, voor een klant, of wil je het als product verkopen?
- Alleen Nederland, of ook België? In België werkt het anders (erkenning door FOD Volksgezondheid, terugbetaling via de netwerken voor eerstelijnspsychologische zorg en het RIZIV, btw-vrijstelling via een ander artikel).
- Welke EPD's gebruikt de doelgroep? Koppeling daarmee bepaalt de bruikbaarheid meer dan elke andere functie.
- Solo-praktijken of groepspraktijken als eerste doelgroep?

**Voorstel eerste versie (MVP)**

- [ ] Eenmanszaak, solo-praktijk, Nederland
- [ ] Bankkoppeling met automatische matching
- [ ] Facturen aan cliënten en organisaties, met btw-code per dienst
- [ ] Import van declaraties en retourinformatie uit één veelgebruikt EPD
- [ ] Bonnenscanner en vooringestelde kostencategorieën
- [ ] Dashboard met belastingreservering en openstaande posten
- [ ] Jaaroverzicht en export voor de boekhouder

Daarna: btw-aangifte voor gemengde praktijken, urencriterium, groepspraktijken, en als laatste BV en personeel.
