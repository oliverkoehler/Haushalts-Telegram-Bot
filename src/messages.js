'use strict';

const { formatDuration, formatTimestamp, germanMonthName } = require('./time');

// Vorsprung, den Platz 1 vor Platz 2 braucht, um allein zu gewinnen (10 %).
const WINNER_MARGIN = 1.1;

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Formatiert einen Faktor deutsch, z. B. 1.2 -> "1,2 (120 %)". */
function formatFactor(f) {
  const dec = String(f).replace('.', ',');
  const pct = Math.round(f * 100);
  return `${dec} (${pct} %)`;
}

/** Befehlsliste für das Telegram-Menü (setMyCommands). */
const COMMANDS = [
  { command: 'arbeit', description: 'Zeit eintragen, z. B. /arbeit 30 oder /arbeit 1h30' },
  { command: 'faktor', description: 'Eigenen Faktor setzen, z. B. /faktor 1.2' },
  { command: 'undo', description: 'Letzten eigenen Eintrag löschen' },
  { command: 'history', description: 'Letzte Änderungen anzeigen' },
  { command: 'sieger', description: 'Sieger des letzten Monats anzeigen' },
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
    '⚖️ <b>/faktor &lt;wert&gt;</b> — dein persönlicher Faktor (nur für dich)',
    '   z. B. <code>/faktor 1.2</code> = 120 % → 60 Min werden zu 72 Min',
    '↩️ <b>/undo</b> — deinen letzten Eintrag löschen',
    '🕒 <b>/history</b> — die letzten Änderungen ansehen',
    '👑 <b>/sieger</b> — Sieger des letzten Monats anzeigen',
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

/**
 * Kür-Text für den Sieger eines Monats.
 * Regel: Platz 1 gewinnt allein nur mit mindestens 10 % Vorsprung auf Platz 2;
 * andernfalls gewinnen alle, die innerhalb dieser 10 %-Spanne liegen, gemeinsam.
 * @param {string} monthKeyStr  "YYYY-MM"
 * @param {Array<{userName:string,minutes:number}>} totals  Minuten absteigend
 * @returns {string|null}  null, wenn es im Monat keine Einträge gab
 */
function renderWinner(monthKeyStr, totals) {
  if (!totals || totals.length === 0) return null;

  const monthName = germanMonthName(monthKeyStr);
  const top = totals[0].minutes;

  // Mit-Sieger: alle, die NICHT klar (>= 10 %) von Platz 1 geschlagen sind.
  // "klar geschlagen" heißt: top >= minutes * 1.1  ->  minutes * 1.1 <= top.
  const winners = totals.filter((t) => t.minutes * WINNER_MARGIN > top);
  const allEqual = winners.every((w) => w.minutes === top);

  const lines = [];
  lines.push(`🏆👑 <b>Haushalts-Sieger — ${monthName}</b>`);
  lines.push('');

  if (winners.length === 1) {
    lines.push(`🥇 <b>${escapeHtml(winners[0].userName)}</b> mit <b>${formatDuration(top)}</b>!`);
  } else if (allEqual) {
    const names = winners.map((w) => `<b>${escapeHtml(w.userName)}</b>`).join(' & ');
    lines.push(`🥇 Unentschieden: ${names} — je <b>${formatDuration(top)}</b>!`);
  } else {
    // Knappes Rennen: weniger als 10 % Abstand -> alle gewinnen, je mit eigener Zeit.
    const names = winners.map((w) => `<b>${escapeHtml(w.userName)}</b>`).join(' & ');
    lines.push(`🥇 Zu knapp für einen Alleinsieg — ${names} gewinnen beide! 🤝`);
    winners.forEach((w) => {
      lines.push(`   • ${escapeHtml(w.userName)}: ${formatDuration(w.minutes)}`);
    });
  }

  // Weitere Platzierungen (alle, die nicht zu den Siegern zählen)
  const rest = totals.slice(winners.length);
  rest.forEach((t, i) => {
    const place = winners.length + i + 1;
    lines.push(`${place}. ${escapeHtml(t.userName)} — ${formatDuration(t.minutes)}`);
  });

  lines.push('');
  lines.push('🎉 Glückwunsch — und auf in den neuen Monat!');
  return lines.join('\n');
}

module.exports = { COMMANDS, helpText, renderHistory, renderWinner, formatFactor, escapeHtml };
