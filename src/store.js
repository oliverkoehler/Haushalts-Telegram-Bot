'use strict';

const fs = require('fs');
const path = require('path');
const { monthKey } = require('./time');

const DATA_FILE = path.join(__dirname, '..', 'data.json');
const TMP_FILE = DATA_FILE + '.tmp';
const HISTORY_CAP = 200; // wie viele History-Einträge je Chat maximal aufgehoben werden

/**
 * Datenstruktur:
 * {
 *   chats: {
 *     "<chatId>": {
 *       helpMessageId: number | null,
 *       leaderboardMessageId: number | null,
 *       entries:  [ { id, userId, userName, minutes, ts, month } ],
 *       history:  [ { ts, type: 'add'|'undo', userName, minutes } ]
 *     }
 *   }
 * }
 */
let data = { chats: {} };

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(raw);
    if (!data.chats) data.chats = {};
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Konnte data.json nicht lesen, starte leer:', err.message);
    }
    data = { chats: {} };
  }
}

function save() {
  // Atomar schreiben: erst temporär, dann umbenennen.
  fs.writeFileSync(TMP_FILE, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(TMP_FILE, DATA_FILE);
}

function getChat(chatId) {
  const key = String(chatId);
  if (!data.chats[key]) {
    data.chats[key] = {
      helpMessageId: null,
      leaderboardMessageId: null,
      entries: [],
      history: [],
    };
  }
  const chat = data.chats[key];
  // Migration für ältere Datenstände
  if (!chat.entries) chat.entries = [];
  if (!chat.history) chat.history = [];
  if (chat.helpMessageId === undefined) chat.helpMessageId = null;
  if (chat.leaderboardMessageId === undefined) chat.leaderboardMessageId = null;
  return chat;
}

function pushHistory(chat, type, userName, minutes) {
  chat.history.push({ ts: new Date().toISOString(), type, userName, minutes });
  if (chat.history.length > HISTORY_CAP) {
    chat.history = chat.history.slice(-HISTORY_CAP);
  }
}

/**
 * Fügt einen Eintrag hinzu und protokolliert ihn in der History.
 * @returns {object} der erstellte Eintrag
 */
function addEntry(chatId, user, minutes) {
  const chat = getChat(chatId);
  const entry = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    userId: user.id,
    userName: user.name,
    minutes,
    ts: new Date().toISOString(),
    month: monthKey(),
  };
  chat.entries.push(entry);
  pushHistory(chat, 'add', user.name, minutes);
  save();
  return entry;
}

/**
 * Löscht den zeitlich letzten Eintrag eines Nutzers und protokolliert ihn.
 * @returns {object|null} der gelöschte Eintrag oder null
 */
function removeLastEntry(chatId, userId) {
  const chat = getChat(chatId);
  let lastIndex = -1;
  for (let i = chat.entries.length - 1; i >= 0; i--) {
    if (chat.entries[i].userId === userId) {
      lastIndex = i;
      break;
    }
  }
  if (lastIndex === -1) return null;
  const [removed] = chat.entries.splice(lastIndex, 1);
  pushHistory(chat, 'undo', removed.userName, removed.minutes);
  save();
  return removed;
}

function setHelpMessageId(chatId, messageId) {
  getChat(chatId).helpMessageId = messageId;
  save();
}

function setLeaderboardMessageId(chatId, messageId) {
  getChat(chatId).leaderboardMessageId = messageId;
  save();
}

/**
 * Aufsummierte Minuten gruppiert nach Monat und Nutzer.
 * Neuester Monat zuerst, innerhalb des Monats Minuten absteigend.
 */
function getMonthlyTotals(chatId) {
  const chat = getChat(chatId);
  const byMonth = {};

  for (const e of chat.entries) {
    if (!byMonth[e.month]) byMonth[e.month] = {};
    const m = byMonth[e.month];
    if (!m[e.userId]) m[e.userId] = { userId: e.userId, userName: e.userName, minutes: 0 };
    m[e.userId].userName = e.userName; // jeweils aktuellsten Namen verwenden
    m[e.userId].minutes += e.minutes;
  }

  return Object.keys(byMonth)
    .sort()
    .reverse()
    .map((month) => ({
      month,
      totals: Object.values(byMonth[month]).sort((a, b) => b.minutes - a.minutes),
    }));
}

/**
 * Liefert die letzten History-Einträge (neueste zuerst).
 * @param {string|number} chatId
 * @param {number} [limit=12]
 */
function getHistory(chatId, limit = 12) {
  const chat = getChat(chatId);
  return chat.history.slice(-limit).reverse();
}

module.exports = {
  load,
  getChat,
  addEntry,
  removeLastEntry,
  setHelpMessageId,
  setLeaderboardMessageId,
  getMonthlyTotals,
  getHistory,
};
