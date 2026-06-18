# Dagboek 🌱

Een rustige, persoonlijke habit- & check-in tool. Geen backend, geen kosten, alles
lokaal in je browser (localStorage). Mobile-first — bedoeld voor je telefoon.

## Filosofie (waarom hij zo simpel is)
- **Inchecken is de winst**, niet wat je logt.
- **Level 1 = pillenmoment afvinken** (één tik). Dit verdwijnt nooit.
- Nieuwe gewoontes stapel je er héél langzaam en vrijblijvend bij via de **Wachtrij**.
- De hele dagelijkse handeling kan in 30 seconden, ook op een rotdag.
- Streak = milde verliesaversie, maar de toon blijft vriendelijk. Gebroken streak = rustig opnieuw, geen verwijt.

## De drie tabs
1. **Vandaag** — kernactie + grote "Gedaan"-knop, optionele regel tekst, streak.
2. **Voortgang** — kalender (de ketting), huidige en langste streak. Gemiste dagen neutraal.
3. **Wachtrij** — ideeën parkeren. Na X dagen op rij (standaard 14) biedt de app vrijblijvend aan er één bij te stapelen.

> De volledige dagboek-vragenlijst + mentale reminders staan bewaard in
> [`notities-dagboek.md`](notities-dagboek.md) en staan geparkeerd in de Wachtrij.

## Lokaal bekijken
Open `index.html` in een browser, of start een simpel servertje:
```bash
cd ~/dagboek
python3 -m http.server 8024
# open http://localhost:8024
```

## Op je iPhone zetten (voelt als app)
1. Open de site in **Safari**.
2. Tik op het deel-icoon → **Zet op beginscherm**.
3. Open hem voortaan vanaf je beginscherm — full-screen, offline, eigen icoon.

## Online zetten via GitHub Pages (gratis)
1. Maak een nieuwe (publieke) repo op GitHub, bijv. `dagboek`.
2. Push deze map ernaartoe.
3. GitHub → **Settings → Pages** → Source: `Deploy from a branch` → branch `main`, map `/ (root)` → Save.
4. Na ~1 minuut staat hij op `https://<jouw-gebruikersnaam>.github.io/dagboek/`.

Met de GitHub CLI in één keer:
```bash
cd ~/dagboek
git init && git add -A && git commit -m "Dagboek v1"
gh repo create dagboek --public --source=. --push
# daarna Pages aanzetten via Settings → Pages (zie hierboven)
```

## Belangrijk over je data
Je gegevens staan **lokaal op je apparaat** (localStorage). Ze worden niet
verstuurd. Als je de app van je beginscherm zet, of de browserdata wist, ben je
ze kwijt. (Een export-knop kan in een latere versie.)

## Icoon opnieuw genereren
```bash
python3 make_icons.py
```
