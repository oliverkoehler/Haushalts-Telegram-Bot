'use strict';

// Deutsche Monatsnamen
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/**
 * Liefert den Monatsschlüssel "YYYY-MM" für ein Datum.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Liefert den Monatsschlüssel des Vormonats, z. B. am 2026-05-xx -> "2026-04".
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
function previousMonthKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return monthKey(d);
}

/**
 * Wandelt "YYYY-MM" in z. B. "Mai 2026" um.
 * @param {string} key
 * @returns {string}
 */
function germanMonthName(key) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTHS_DE[month - 1]} ${year}`;
}

/**
 * Formatiert Minuten in eine lesbare Dauer: "2 Std 30 Min".
 * @param {number} minutes
 * @returns {string}
 */
function formatDuration(minutes) {
  const rounded = Math.round(minutes * 100) / 100; // max. 2 Nachkommastellen
  const h = Math.floor(rounded / 60);
  // Restminuten erneut runden, sonst kommt der Fließkomma-Fehler zurück
  // (z. B. 89,6 - 60 = 29,599999…).
  const m = Math.round((rounded - h * 60) * 100) / 100;

  const parts = [];
  if (h > 0) parts.push(`${h} Std`);
  if (m > 0 || h === 0) {
    // Nachkommastellen nur anzeigen, wenn vorhanden; deutsches Komma.
    const mStr = Number.isInteger(m) ? String(m) : String(m).replace('.', ',');
    parts.push(`${mStr} Min`);
  }
  return parts.join(' ');
}

/**
 * Formatiert einen ISO-Zeitstempel als "DD.MM. HH:MM" (lokale Serverzeit).
 * @param {string} iso
 * @returns {string}
 */
function formatTimestamp(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = { monthKey, previousMonthKey, germanMonthName, formatDuration, formatTimestamp };
