# 🧹 Haushalts-Bot

Ein Telegram-Bot, mit dem ihr im Gruppenchat eure Haushaltsminuten tracken könnt.
Bedienung über **echte Befehle**. Im Chat bleiben dauerhaft nur zwei angepinnte
Nachrichten: **(1) die Hilfe** und **(2) die Rangliste** (aktualisiert sich
automatisch). Befehle werden kurz bestätigt und dann gelöscht, damit der Chat sauber bleibt.

## Befehle

| Befehl | Wirkung |
|---|---|
| `/arbeit <zeit>` | Zeit eintragen — `30`, `2h`, `1h30`, `1:30`, `1,5h`, `1 Stunde 30 Minuten` (Zahl ohne Einheit = Minuten) |
| `/undo` | deinen letzten eigenen Eintrag löschen |
| `/history` | die letzten Änderungen ansehen (verschwindet nach 1 Min.) |
| `/rangliste` | Rangliste neu anzeigen & anpinnen |
| `/hilfe` | Hilfe anzeigen |
| `/start` | Bot einrichten: Hilfe + Rangliste anpinnen |

Die Befehle erscheinen auch im Telegram-Befehlsmenü (über `setMyCommands` registriert).

## 1. Bot in Telegram anlegen

1. In Telegram **@BotFather** öffnen, `/newbot` senden, Namen/Benutzernamen vergeben.
2. Du bekommst einen **Token** wie `123456:ABC-DEF…`.
3. *(Diesmal nicht nötig:)* Die Bot-Privacy kann **an** bleiben, da wir nur Befehle
   (`/…`) verwenden — die sieht der Bot in Gruppen ohnehin.

## 2. Projekt einrichten

```bash
npm install
cp .env.example .env
# .env öffnen und TELEGRAM_BOT_TOKEN eintragen
```

## 3. Starten

```bash
npm start
```

Erwartete Ausgabe: `✅ Haushalts-Bot läuft. Warte auf Befehle…`

## 4. In der Gruppe verwenden

1. Telegram-Gruppe mit deiner Frau erstellen, Bot hinzufügen.
2. Bot zum **Administrator** machen mit diesen Rechten:
   - **Nachrichten anpinnen** — für die beiden Dauer-Nachrichten.
   - **Nachrichten löschen** — damit eingegebene Befehle automatisch verschwinden.
3. Einmal `/start` senden → Hilfe und Rangliste werden erstellt und angepinnt.
4. Loslegen: `/arbeit 30`

> Hinweis: In einem **Einzelchat** (nicht Gruppe) kann der Bot fremde Nachrichten
> nicht löschen — dort bleiben eingegebene Befehle stehen. Für euer Szenario (Gruppe
> mit Admin-Rechten) funktioniert das Aufräumen vollständig.

## Dauerbetrieb (optional)

```bash
npm install -g pm2
pm2 start src/bot.js --name haushalts-bot
pm2 save
```

## Wie es funktioniert

- Daten liegen lokal in `data.json` (Einträge **und** ein History-Log). Keine Datenbank nötig.
- Die Rangliste wird nach jedem `/arbeit` bzw. `/undo` **editiert** (kein neuer Spam).
- Mehrere Zeitangaben in einem Befehl werden summiert: `/arbeit 1 Stunde 30 Minuten` = 90 Min.
- Das History-Log behält auch gelöschte Einträge als Ereignis („… entfernt").

## Befehlsnamen anpassen

Möchtest du statt `/arbeit` z. B. `/done` oder `/haushalt`? Das steht zentral in
`src/messages.js` (Liste `COMMANDS`) und im `switch` in `src/bot.js`. Einfach dort umbenennen.
