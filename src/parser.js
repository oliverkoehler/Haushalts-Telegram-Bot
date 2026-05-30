'use strict';

function round2(x) {
  return Math.round(x * 100) / 100;
}

/**
 * Liest aus dem Argument eines Befehls (/arbeit ...) eine Minutenzahl.
 * Unterstützte Formen:
 *   "30"               -> 30   (nackte Zahl = Minuten)
 *   "30 min" / "30m"   -> 30
 *   "2h" / "2 std"     -> 120
 *   "1,5h"             -> 90
 *   "1h30" / "1:30"    -> 90   (kompakt Std:Min)
 *   "1 Stunde 30 Min"  -> 90   (mehrere Angaben werden summiert)
 * Gibt null zurück, wenn nichts Gültiges erkannt wurde.
 *
 * @param {string} arg
 * @returns {number|null}
 */
function parseDuration(arg) {
  if (!arg || typeof arg !== 'string') return null;
  const s = arg.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;

  // Kompaktform "1:30" oder "1h30" (Stunden:Minuten)
  let m = s.match(/^(\d+)[:h](\d{1,2})$/);
  if (m) {
    const total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return total > 0 ? total : null;
  }

  // Nackte Zahl -> Minuten
  if (/^\d+(?:[.,]\d+)?$/.test(s)) {
    const v = parseFloat(s.replace(',', '.'));
    return v > 0 ? round2(v) : null;
  }

  // Eine oder mehrere "Zahl + Einheit"-Angaben, die summiert werden
  const PAIR = /(\d+(?:[.,]\d+)?)\s*(stunden|stunde|std|hours|hour|hrs|hr|minuten|minute|min|m|h)/g;
  let total = 0;
  let found = false;
  let mm;
  while ((mm = PAIR.exec(s)) !== null) {
    const v = parseFloat(mm[1].replace(',', '.'));
    if (Number.isNaN(v)) continue;
    const isHour = /^(stunden|stunde|std|hours|hour|hrs|hr|h)$/.test(mm[2]);
    total += v * (isHour ? 60 : 1);
    found = true;
  }

  if (found && total > 0) return round2(total);
  return null;
}

/**
 * Liest aus dem Argument von /faktor einen Faktor.
 * Unterstützte Formen:
 *   "1.2" / "1,2"   -> 1.2
 *   "120%"          -> 1.2
 *   "150 %"         -> 1.5
 *   "2"             -> 2
 * Gibt null zurück, wenn nichts Gültiges erkannt wurde.
 * Die Wertebereichs-Prüfung passiert im Aufrufer (für passende Meldungen).
 *
 * @param {string} arg
 * @returns {number|null}
 */
function parseFactor(arg) {
  if (!arg || typeof arg !== 'string') return null;
  let s = arg.trim().toLowerCase().replace(',', '.');
  if (!s) return null;

  let percent = false;
  if (s.endsWith('%')) {
    percent = true;
    s = s.slice(0, -1).trim();
  }
  if (!/^\d+(?:\.\d+)?$/.test(s)) return null;

  let v = parseFloat(s);
  if (Number.isNaN(v)) return null;
  if (percent) v = v / 100;

  return round2(v);
}

module.exports = { parseDuration, parseFactor };
