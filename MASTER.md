# Dagboek — Master Document

> **Eén bron van waarheid voor het hele platform.** Dit document vangt de visie, de
> principes, alle ideeën, de architectuur en de bouwvolgorde. Het dient tegelijk als
> **master prompt**: geef dit aan Claude om het platform verder uit te bouwen.
>
> Laatst bijgewerkt: 2026-06-19 · App-map: `~/dagboek` · Status: v1 gebouwd.

---

## 0. Voor Claude — hoe je dit document gebruikt

Dit is de werkbrief. Lees dit vóór je iets bouwt.

**Gouden regel: bouw minimaal, één feature per keer.** De gebruiker (Rens) is een
overdenker, gevoelig voor angst en zelfkritiek, en stalt op uitvoering. Hij begint
graag grote projecten en verliest dan interesse. **Scope creep is dé faalmodus.**
Jouw taak is óók om de rem te zijn.

Concreet:
- Lever de kleinste werkende versie, niets meer. Verifieer dat het echt draait.
- Houd de UI rustig, ruim, niet-oordelend; alles in het Nederlands.
- Als de gebruiker veel ideeën tegelijk dumpt: **niet alles bouwen.** Vang ze in
  §7 (ideeën-catalogus), en stel daarna precies één concrete volgende stap voor.
- Werk de roadmap (§8) en changelog (§11) bij na elke afgeronde stap.

---

## 1. Wie is de gebruiker

- Overdenker; gevoelig voor angst en zelfkritiek. Tool moet rustig, simpel en
  niet-oordelend zijn — geen drukte, schuldgevoel of overload.
- Weinig wrijvingstolerantie: de dagelijkse handeling moet in **≤30 seconden**, ook
  op een rotdag.
- Heeft al een werkende dagelijkse gewoonte: **pillen pakken** (consistent, met
  Fitbit-reminder + pillenbakjes). Nieuwe mini-acties worden hieraan vastgehangen
  (habit-stacking). De Fitbit-reminder is de trigger; de app hoeft niet zelf te
  herinneren — hij opent de app bij het pillenmoment.
- Gelooft: **"data is macht."** Meer data over zijn dagen → beter sturen welke
  pillars level 1 verdienen, en of een habit überhaupt zin heeft voor hém.
- Wil Claude als **mentale coach** die uit zijn data leert.

## 2. Filosofie / kernprincipes

- **Inchecken zelf is de winst**, niet wat hij logt.
- Habit-stacking, minimum viable action, omgeving boven wilskracht, actie vóór
  motivatie, langzaam en sequentieel uitbreiden.
- **Dagboek = de databron.** Niet de lange vragenlijst als dagelijkse plicht, maar
  één micro-vraag per dag → genoeg data zonder wrijving.
- **Streak is weerstand, geen motivator.** Een streak die je kunt kwijtraken voelt
  voor een overdenker als mentale druk. Vervang door veerkracht: totaal-teller
  ("al X keer ingecheckt"), zachte 7/30-dagen-balk, gisteren alsnog invullen mag,
  geen harde reset, geen rood.
- **De rem.** Eén ding tegelijk. Gamify mag, maar met ingebouwde limiet die hem
  expres klein houdt. Hij wil graag veel; dat gaat mis als het te veel tegelijk is.
- **Alles data-driven.** Beslissingen (welke pillar level 1 wordt, of een habit zin
  heeft, wanneer je een habit mág toevoegen, hoe habits ranken) volgen uit de
  verzamelde data — niet uit een opwelling. Daarom moet data eerst stromen.

## 3. Het model: pillars & levels

- **Level 1 = de permanente kern.** Verdwijnt nooit. Nu: *pillen pakken* +
  *micro-dagboekvraag*.
- Nieuwe habits stapelen er heel langzaam bij via de **Wachtrij**.
- **Harde poort (data-driven rem):** je kunt pas een nieuwe habit toevoegen als je
  een drempel aan check-ins hebt gehaald. Gebruik een **onverliesbare** maatstaf, niet
  een fragiele reeks: standaard **14 keer ingecheckt** (of 14 van de laatste 21 dagen),
  instelbaar. Eén gemiste dag zet je dus niet terug op nul — anders wordt de rem
  dezelfde mentale weerstand die we bij de streak juist weghalen.
- **Welke pillar level 1 verdient, wordt gestuurd door data** — welke thema's het
  vaakst tegenzitten en correleren met slechte dagen. De coach maakt dat zichtbaar.

## 4. Datamodel — "Sheet-als-brein"

De app schrijft alles naar één Google Sheet met aparte tabs. Iedereen heeft z'n
eigen tab → **geen interferentie**. De app houdt een lokale kopie (localStorage)
zodat hij offline blijft werken.

### Tabs in de Sheet
| Tab | Inhoud | Wie schrijft |
|---|---|---|
| `Dagboek` | datum, kernvraag-antwoord, label, daggevoel (cijfer + woord), notitie | App / Rens |
| `Check-ins` | datum, habit_id, gedaan (voor streak/consistentie) | App / Rens |
| `Habits` | id, naam, status (wachtrij/actief), ranking-Rens, ranking-Claude, stack-trigger, 2-min-versie, "waarom zin voor mij" | App / Rens (ranking-Claude: Claude) |
| `Kennisbank_VanMij` | datum, gedachte/idee, tag | App / Rens |
| `Bronnen` | datum, titel, transcript, "wat wil ik hiermee" | App / Rens |
| `Reminders` | ankertekst, type (vast/roterend), actief | App / Rens |
| `Coach` | datum, feedback, voorgestelde micro-aanpassing | **Alleen Claude** |
| `Config` | instellingen (bv. promptAfterDays) | App |

### Dataflow
```
   [ Telefoon: web-app (PWA) ]
        │  schrijft           ▲ leest (incl. Coach-tab)
        ▼                     │
   [ Google Sheet — de data-brein, met tabs ]
        ▲                     │
        │  leest alle tabs    ▼ schrijft ALLEEN Coach-tab
   [ Claude Code (jouw computer) via skill ]
```
**Schrijf-scheiding (cruciaal):** Rens/app schrijven nooit in `Coach`; Claude
schrijft nooit in de dagboek-/data-tabs. Zo blijft jouw stem zuiver gescheiden van
Claude's analyse — belangrijk voor betrouwbare coaching.

### Privacy
- Gevoelige regels kunnen als **"lokaal-only"** worden gemarkeerd → gaan niet naar
  Sheet/Claude.
- Bewust: dagboekdata verlaat het apparaat (naar Sheet + Claude). Dat is de prijs
  van "data is macht"; Rens accepteert dit.

## 5. Architectuur & tech

- **Frontend:** vanilla HTML/CSS/JS, geen build-step, PWA (manifest + service
  worker), data in localStorage, gehost op **GitHub Pages** (gratis).
- **Databackend:** Google Sheet via een **Apps Script web-app endpoint** (gratis,
  geen server te onderhouden). App POST't rijen, GET't de Coach-tab.
- **Claude-loop:**
  - *Async (aanrader, eerst):* Claude Code-skill leest de Sheet, schrijft de
    `Coach`-tab. Begin met een **wekelijkse batch** (diepe terugblik + 1 voorstel).
  - *Live (later, optioneel):* app belt de Claude API direct, met de sleutel achter
    een gratis **Cloudflare Worker**-proxy (nooit een API-sleutel in een publieke
    site zetten).
- **MVP van de loop — nu al mogelijk, zonder backend:** een **export-knop** die de
  data als JSON kopieert/downloadt → Rens plakt die bij Claude → Claude geeft
  feedback. Zelfde lus (data eruit → Claude leest → feedback), nul plumbing. De
  Sheet-automatisering is de gepolijste versie hiervan, later.

### Conventies
- UI volledig Nederlands; rustig salie-palet via CSS-variabelen; veel witruimte;
  één duidelijke actie per scherm.
- **Relatieve paden** (`./…`) overal — werkt zowel op root- als project-subpad van
  GitHub Pages.
- localStorage-sleutel: `dagboek_v1`. Alles exporteerbaar/reversibel.

## 6. Tabs in de app (UI)

- **Nu:** Vandaag · Voortgang · Wachtrij.
- **Later:** Coach · Kennisbank · Reminders/Ankers · Overzichten.
  (Voeg tabs pas toe als de bijbehorende fase klaar is — niet eerder.)

## 7. Ideeën-catalogus (alles; niets gaat verloren)

### A. Dagboek & data
- Eén micro-vraag per dag, bv. *"Wat zat je vandaag het meest tegen?"* + tik-label
  (Gevoel / Gedachte / Probleem). 10 sec. Volledige 14-vragenlijst optioneel
  uitklapbaar (zie `notities-dagboek.md`).
- Daggevoel = cijfer 1–10 + één woord.
- Auto-tagging bij invoer zodat data schoon in de juiste tab landt.

### B. Streak → veerkracht
- "Al X keer ingecheckt" (onverliesbaar) i.p.v. dagen-op-rij.
- Zachte 7/30-dagen consistentie-balk.
- Gisteren (of dagen terug) alsnog invullen — terugscrollen.
- Geen harde reset, geen rood, geen verwijt.

### C. Coach & inzichten
- Mentale Coach-tab die je eigen data terugspiegelt, niet oordeelt.
- Wekelijkse coach-batch i.p.v. live ruis.
- Correlatie-inzichten: data bepaalt welke pillar level 1 verdient.
- Feedback aan het eind van de dag (avond-moment of in de dagboekvraag verwerkt).

### D. Kennisbank & bronnen
- Strikte scheiding **"Van mij"** (eigen gedachtes/ideeën) vs **"Bronnen"**
  (transcripts/extern).
- Transcript-dropzone: plak → auto-tag "bron" + jij voegt één regel toe ("wat wil
  ik hiermee"). Claude vat samen in 3 bullets + 1 habit-suggestie.
- Mega kennis- en gedachtebank: hoe meer (schone, gescheiden) data, hoe beter.

### E. Habits
- Habit-dropper met **dubbele ranking**: ranking-Rens (hoe belangrijk voelt dit) +
  ranking-Claude (impact × hoe makkelijk te stacken).
- Idee-platform: per kandidaat een mini-checklist om de habit **onvermijdelijk** te
  maken (waar stack ik 'm op? 2-minuten-versie? welke wrijving haal ik weg?).
- "Waarom heeft deze habit zin voor mij"-veld per habit.

### F. Reminders / ankers
- Aparte tab als rustige leeslijst (vaste ankers + roterende focuspunten), elke dag
  één uitgelicht. Geen notificatie-spam (eventueel beperkte herinnering later).

### G. Overzichten
- Week-, maand-, jaaroverzicht als zachte terugblik (wat noemde je vaak, gemiddeld
  daggevoel) — geen scorebord.

### H. Gamify mét rem
- **Harde poort:** nieuwe habit pas toevoegbaar na de check-in-drempel (zie §3:
  14 keer ingecheckt / 14 van laatste 21 dagen, onverliesbaar). Eén challenge
  tegelijk. Systeem houdt je expres klein.
- Levels/seizoenen: nieuwe habit pas erbij als de vorige ook een tijd draait.

### I. Architectuur / data-loop
- Sheet als single source of truth + lokale cache.
- Coach-tab die alleen Claude vult.
- Eén-knops export + JSON-back-up (localStorage kan gewist worden).
- Privacy-laag: lokaal-only markering.

## 8. Bouw-roadmap (gefaseerd — één voor één)

Volgorde zo gekozen dat er zo snel mogelijk **data gaat stromen**.

- [x] **v1** — Vandaag/Voortgang/Wachtrij, streak, localStorage, PWA, icoon.
- [x] **Phase A** — micro-dagboekvraag + label op *Vandaag*; streak → veerkracht
  (totaal-teller + 7-dagen-ritme + laatste 30 dagen + gisteren/terug invullen);
  harde poort op de wachtrij (14 check-ins, onverliesbaar).
- [ ] **Phase B** — export / "stuur naar Claude"-knop + JSON-back-up (realiseert de
  data→coach-loop zonder backend).
- [ ] **Phase C** — deploy naar GitHub Pages → op de telefoon, data verzamelen.
- [ ] **Phase D** — terugscrollen / dagen-terug invullen + weekoverzicht.
- [ ] **Phase E** — Sheet-sync via Apps Script (data-als-brein).
- [ ] **Phase F** — Coach-tab gevoed door Claude (eerst wekelijkse batch).
- [ ] **Phase G** — Kennisbank + transcript-dropzone (scheiding van mij/bronnen).
- [ ] **Phase H** — Habit-dropper + dubbele ranking + idee-platform.
- [ ] **Phase I** — Reminders/ankers-tab.
- [ ] **Phase J** — maand-/jaaroverzichten + gamify-met-rem.

Elke fase = klein en op zichzelf bruikbaar. Niet vooruitlopen.

## 9. Ontwerpbeslissingen (beantwoord 2026-06-19)

1. **Kernvraag:** elke dag dezelfde vaste vraag. (Start: *"Wat zat je vandaag het
   meest tegen?"*)
2. **Labels:** ja, met snelle tik-categorieën. Start met Gevoel / Gedachte / Probleem
   (uitbreidbaar). Doel: data doorzoekbaar maken.
3. **Streak:** vervangen door veerkracht — "al X keer ingecheckt" + 7/30-dagen-balk +
   gisteren/terug invullen. Harde poort voor nieuwe habit = **onverliesbare** drempel
   (14 keer ingecheckt), niet een reeks.
4. **Tijd:** ~2 min op een goede dag mag, met een korte versie voor rotdagen.
5. **Kennisbank:** beide — transcripts plakken én losse gedachtes snel intikken, in
   aparte tabs.
6. **Privacy/AI:** AI mag. Tekst mag naar Claude voor slimmere analyse.
7. **Habit-ranking:** verschilt per onderdeel, maar data-driven: weeg "waar heeft hij
   het meeste last van" zwaar + "weinig effort om te doen". De 2 weken check-in-periode
   is bewust denktijd voor de beste habit tegen zijn grootste problemen.
8. **Reminders:** actief herinneren mag — onderzoek slimme koppeling met Fitbit.
9. **Eind-van-de-dag:** voor het slapen of bij het wakker worden; nachten ook tracken.
   Realiteit: na drinken vult hij niet in / is "van de kaart" → backfill en niet
   bestraffen is essentieel.
10. **Tempo/rem:** **rem hard aanzetten, ook als hij ertegen duwt** — daar zit de
    groei. Hij heeft vaker 100 ideeën tegelijk gedaan zonder succes. Eén feature per
    keer; Claude bewaakt dit actief.

## 10. Bestanden in dit project

- `index.html`, `styles.css`, `app.js` — de app.
- `manifest.webmanifest`, `sw.js`, `icon-*.png`, `apple-touch-icon.png` — PWA.
- `notities-dagboek.md` — volledige 14-vragenlijst + mentale reminders (bewaard).
- `MASTER.md` — dit document.
- `make_icons.py` — icoon-generator.
- `README.md` — gebruik & deploy.

## 11. Changelog

- **2026-06-19** — v1 gebouwd en lokaal geverifieerd: 3 tabs, streak, localStorage,
  PWA (manifest + service worker + salie-spruit-icoon), Nederlandse UI. Dagboek-
  vragenlijst bewust geparkeerd in de Wachtrij. Master-document aangemaakt.
- **2026-06-19** — Phase A gebouwd en geverifieerd: vaste dagboekvraag + tik-labels,
  veerkracht i.p.v. streak (totaal + 7-dagen-ritme + laatste 30 dagen + backfill via
  knop en tikbare kalender), harde poort (14 check-ins). Service worker omgezet naar
  network-first zodat updates op de telefoon doorkomen.
