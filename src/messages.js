'use strict';

const { formatDuration, formatTimestamp } = require('./time');

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Befehlsliste für das Telegram-Menü (setMyCommands). */
const COMMANDS = [
  { command: 'arbeit', description: 'Zeit eintragen, z. B. /arbeit 30 oder /arbeit 1h30' },
  { command: 'undo', description: 'Letzten eigenen Eintrag löschen' },
  { command: 'history', description: 'Letzte Änderungen anzeigen' },
  { command: 'rangliste', description: 'Rangliste neu anzeigen/anpinnen' },
  { command: 'hilfe', description: 'Hilfe anzeigen' },
];

/** Text der angepinnten Hilfe-Nachricht (Nachricht 1). */
function helpText() {
  return [
    '🤖 <b>Haushalts-Bot — Befehle</b>',
    '',
    '🧹 <b>/arbeit &lt;zeit&gt;</b> — Zeit eintragen',
    '   z. B. <code>/arbeit 30</code> · <code>/arbeit 2h</code> · <code>/arbeit 1h30</code> · <code>/arbeit 1,5h</code>',
    '   (Zahl ohne Einheit = Minuten)',
    '↩️ <b>/undo</b> — deinen letzten Eintrag löschen',
    '🕒 <b>/history</b> — die letzten Änderungen ansehen',
    '🏆 <b>/rangliste</b> — Rangliste neu anzeigen & anpinnen',
    'ℹ️ <b>/hilfe</b> — diese Hilfe',
    '',
    '<i>Die Rangliste unten aktualisiert sich automatisch.</i>',
    '<i>Befehle werden kurz bestätigt und dann gelöscht, damit der Chat sauber bleibt.</i>',
  ].join('\n');
}

/** Text der /history-Antwort. */
function renderHistory(history) {
  if (!history || history.length === 0) {
    return 'ℹ️ Noch keine Aktivitäten.';
  }
  const lines = ['🕒 <b>Letzte Änderungen</b>', ''];
  for (const h of history) {
    const t = `<code>${formatTimestamp(h.ts)}</code>`;
    const name = escapeHtml(h.userName);
    if (h.type === 'undo') {
      lines.push(`${t}  ↩️ ${name}: ${formatDuration(h.minutes)} entfernt`);
    } else {
      lines.push(`${t}  ➕ ${name}: ${formatDuration(h.minutes)}`);
    }
  }
  return lines.join('\n');
}

module.exports = { COMMANDS, helpText, renderHistory, escapeHtml };
