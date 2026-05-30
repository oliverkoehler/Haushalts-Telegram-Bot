'use strict';

const { monthKey, germanMonthName, formatDuration } = require('./time');

const MEDALS = ['🥇', '🥈', '🥉'];

// Anzahl vergangener Monate, die maximal angezeigt werden (Telegram-Limit beachten)
const MAX_PAST_MONTHS = 12;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function rank(i) {
  return MEDALS[i] || `${i + 1}.`;
}

/**
 * Erzeugt den HTML-Text der Rangliste.
 * @param {Array} monthlyTotals  Ergebnis von store.getMonthlyTotals()
 * @returns {string}
 */
function renderLeaderboard(monthlyTotals) {
  const currentKey = monthKey();
  const lines = [];

  lines.push('🏆 <b>Haushalts-Rangliste</b>');
  lines.push('');

  // Aktueller Monat
  const current = monthlyTotals.find((m) => m.month === currentKey);
  lines.push(`📅 <b>${germanMonthName(currentKey)}</b> <i>(aktueller Monat)</i>`);
  if (current && current.totals.length > 0) {
    current.totals.forEach((t, i) => {
      lines.push(`${rank(i)} ${escapeHtml(t.userName)} — ${formatDuration(t.minutes)}`);
    });
    const sum = current.totals.reduce((a, t) => a + t.minutes, 0);
    lines.push('');
    lines.push(`<i>Gesamt diesen Monat: ${formatDuration(sum)}</i>`);
  } else {
    lines.push('<i>Noch keine Einträge — los geht\'s mit /arbeit 🧹</i>');
  }

  // Vergangene Monate
  const past = monthlyTotals
    .filter((m) => m.month !== currentKey)
    .slice(0, MAX_PAST_MONTHS);

  if (past.length > 0) {
    lines.push('');
    lines.push('━━━━━━━━━━━━━━');
    lines.push('📜 <b>Vergangene Monate</b>');
    for (const m of past) {
      lines.push('');
      lines.push(`<b>${germanMonthName(m.month)}</b>`);
      m.totals.forEach((t, i) => {
        lines.push(`${rank(i)} ${escapeHtml(t.userName)} — ${formatDuration(t.minutes)}`);
      });
    }
  }

  lines.push('');
  lines.push('<i>Eintragen mit /arbeit • /hilfe für alle Befehle</i>');

  return lines.join('\n');
}

module.exports = { renderLeaderboard };
