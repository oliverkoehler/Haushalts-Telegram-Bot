'use strict';

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const store = require('./store');
const { parseDuration } = require('./parser');
const { renderLeaderboard } = require('./leaderboard');
const { COMMANDS, helpText, renderHistory, escapeHtml } = require('./messages');
const { formatDuration, monthKey } = require('./time');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN fehlt. Lege eine .env-Datei an (siehe .env.example).');
  process.exit(1);
}

// Wie lange Bestätigungen sichtbar bleiben, bevor sie gelöscht werden (in ms)
const CONFIRM_DELETE_MS = 6000;   // kurze Bestätigung nach /arbeit, /undo, /start
const HISTORY_DELETE_MS = 60000;  // /history etwas länger, zum Lesen

store.load();

const bot = new TelegramBot(TOKEN, { polling: true });
let BOT_USERNAME = null;

// ---------- kleine Helfer ----------

function describeError(err) {
  return err?.response?.body?.description || err?.message || String(err);
}

function displayName(user) {
  if (!user) return 'Unbekannt';
  if (user.first_name) return [user.first_name, user.last_name].filter(Boolean).join(' ');
  if (user.username) return '@' + user.username;
  return 'User ' + user.id;
}

async function deleteMessageSafe(chatId, messageId) {
  try {
    await bot.deleteMessage(chatId, messageId);
    return true;
  } catch (err) {
    // In Gruppen braucht der Bot das Admin-Recht „Nachrichten löschen".
    return false;
  }
}

function scheduleDelete(chatId, messageId, ms) {
  setTimeout(() => {
    deleteMessageSafe(chatId, messageId);
  }, ms).unref?.();
}

/** Sendet eine Bestätigung, die sich nach `ms` selbst löscht. */
async function tempReply(chatId, text, ms = CONFIRM_DELETE_MS) {
  const m = await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    disable_notification: true,
  });
  scheduleDelete(chatId, m.message_id, ms);
  return m;
}

/** Aktuelle Monatssumme eines Nutzers (für Bestätigungen). */
function userMonthTotal(chatId, userId) {
  const cur = store.getMonthlyTotals(chatId).find((m) => m.month === monthKey());
  if (!cur) return 0;
  const u = cur.totals.find((t) => t.userId === userId);
  return u ? u.minutes : 0;
}

// ---------- angepinnte Nachrichten ----------

/** Hilfe-Nachricht (Nachricht 1) erstellen oder aktualisieren. */
async function updateHelp(chatId) {
  const chat = store.getChat(chatId);
  const text = helpText();
  const opts = { parse_mode: 'HTML', disable_web_page_preview: true };

  if (chat.helpMessageId) {
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: chat.helpMessageId, ...opts });
      return;
    } catch (err) {
      const d = describeError(err);
      if (d.includes('message is not modified')) return;
      console.warn('Hilfe nicht editierbar, erstelle neu:', d);
    }
  }
  const m = await bot.sendMessage(chatId, text, opts);
  store.setHelpMessageId(chatId, m.message_id);
  try {
    await bot.pinChatMessage(chatId, m.message_id, { disable_notification: true });
  } catch (err) {
    console.warn('Konnte Hilfe nicht anpinnen (Bot evtl. kein Admin):', describeError(err));
  }
}

/** Ranglisten-Nachricht (Nachricht 2) erstellen oder aktualisieren. */
async function updateBoard(chatId) {
  const chat = store.getChat(chatId);
  const text = renderLeaderboard(store.getMonthlyTotals(chatId));
  const opts = { parse_mode: 'HTML', disable_web_page_preview: true };

  if (chat.leaderboardMessageId) {
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: chat.leaderboardMessageId, ...opts });
      return;
    } catch (err) {
      const d = describeError(err);
      if (d.includes('message is not modified')) return; // nichts geändert
      console.warn('Rangliste nicht editierbar, erstelle neu:', d);
    }
  }
  const m = await bot.sendMessage(chatId, text, opts);
  store.setLeaderboardMessageId(chatId, m.message_id);
  try {
    await bot.pinChatMessage(chatId, m.message_id, { disable_notification: true });
  } catch (err) {
    console.warn('Konnte Rangliste nicht anpinnen (Bot evtl. kein Admin):', describeError(err));
  }
}

// ---------- Befehls-Handler ----------

async function handleStart(chatId) {
  await updateHelp(chatId);
  await updateBoard(chatId);
  await tempReply(chatId, '✅ Eingerichtet! Hilfe und Rangliste sind oben angepinnt. 👆');
}

async function handleArbeit(chatId, user, argStr) {
  const minutes = parseDuration(argStr);
  if (minutes === null) {
    await tempReply(
      chatId,
      'ℹ️ So trägst du Zeit ein: <code>/arbeit 30</code>, <code>/arbeit 2h</code>, <code>/arbeit 1h30</code> oder <code>/arbeit 1,5h</code>.'
    );
    return;
  }
  store.addEntry(chatId, user, minutes);
  const total = userMonthTotal(chatId, user.id);
  await tempReply(
    chatId,
    `✅ <b>${escapeHtml(user.name)}</b>: <b>${formatDuration(minutes)}</b> eingetragen — ` +
      `diesen Monat: <b>${formatDuration(total)}</b> 💪`
  );
  await updateBoard(chatId);
}

async function handleUndo(chatId, user) {
  const removed = store.removeLastEntry(chatId, user.id);
  if (!removed) {
    await tempReply(chatId, `ℹ️ <b>${escapeHtml(user.name)}</b>, du hast keinen Eintrag zum Löschen.`);
    return;
  }
  const total = userMonthTotal(chatId, user.id);
  await tempReply(
    chatId,
    `↩️ <b>${escapeHtml(user.name)}</b>: letzter Eintrag (<b>${formatDuration(removed.minutes)}</b>) gelöscht — ` +
      `diesen Monat: <b>${formatDuration(total)}</b>`
  );
  await updateBoard(chatId);
}

async function handleHistory(chatId) {
  const text = renderHistory(store.getHistory(chatId, 12));
  await tempReply(chatId, text + '\n\n<i>(verschwindet in 1 Min.)</i>', HISTORY_DELETE_MS);
}

// ---------- Nachrichten-Eingang ----------

bot.on('message', async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Dienst-Nachricht „… hat eine Nachricht angepinnt" wegräumen (sauberer Chat).
    if (msg.pinned_message) {
      await deleteMessageSafe(chatId, msg.message_id);
      return;
    }

    const text = (msg.text || '').trim();
    if (!text) return;

    // Nur auf Befehle reagieren (richtige Commands).
    if (!text.startsWith('/')) return;

    // Befehl + evtl. @BotName + Argumente trennen.
    const firstToken = text.split(/\s+/)[0]; // z. B. "/arbeit@MeinBot"
    const [rawCmd, target] = firstToken.slice(1).split('@');
    const command = rawCmd.toLowerCase();
    const argStr = text.slice(firstToken.length).trim();

    // Befehl, der an einen anderen Bot adressiert ist, ignorieren.
    if (target && BOT_USERNAME && target.toLowerCase() !== BOT_USERNAME.toLowerCase()) {
      return;
    }

    const user = { id: msg.from.id, name: displayName(msg.from) };

    // Den Befehl des Nutzers entfernen, damit der Chat sauber bleibt.
    await deleteMessageSafe(chatId, msg.message_id);

    switch (command) {
      case 'start':
        await handleStart(chatId);
        break;
      case 'hilfe':
      case 'help':
        await updateHelp(chatId);
        await tempReply(chatId, 'ℹ️ Die Hilfe ist oben angepinnt. 👆');
        break;
      case 'arbeit':
      case 'log':
        await handleArbeit(chatId, user, argStr);
        break;
      case 'undo':
        await handleUndo(chatId, user);
        break;
      case 'history':
        await handleHistory(chatId);
        break;
      case 'rangliste':
      case 'board':
        await updateBoard(chatId);
        await tempReply(chatId, '🏆 Rangliste aktualisiert. 👆');
        break;
      default:
        await tempReply(chatId, 'ℹ️ Unbekannter Befehl. Tippe /hilfe für die Übersicht.');
    }
  } catch (err) {
    console.error('Fehler beim Verarbeiten der Nachricht:', describeError(err));
  }
});

// ---------- Start ----------

bot.on('polling_error', (err) => {
  console.error('Polling-Fehler:', describeError(err));
});

(async () => {
  try {
    const me = await bot.getMe();
    BOT_USERNAME = me.username;
  } catch (err) {
    console.warn('getMe fehlgeschlagen:', describeError(err));
  }
  try {
    await bot.setMyCommands(COMMANDS);
  } catch (err) {
    console.warn('setMyCommands fehlgeschlagen:', describeError(err));
  }
  console.log('✅ Haushalts-Bot läuft. Warte auf Befehle…');
})();
