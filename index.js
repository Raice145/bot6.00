const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "db.json");
const BANNER_FILE = path.join(__dirname, "banner.jpg");

const pendingDuels = new Map();
const pendingHeists = new Map();

const DEFAULT_COOLDOWNS = {
  work: 20,
  crime: 45,
  slut: 60,
  beg: 30,
  daily: 86400,
  weekly: 604800,
  rob: 60,
  bankrob: 300,
  heist: 180,
  treasure: 90,
  search: 45,
  fish: 60
};

const JAIL_BAIL_COST = 10000;

const PHRASES = {
  work: [
    "cerraste un negocio con un cliente que pagó sin regatear",
    "editaste una tanda de videos y te soltaron buena funda",
    "programaste una web y el cliente quedó enamorado",
    "reparaste una laptop gamer que estaba en coma",
    "hiciste delivery con turbo activado y te fue mejor de lo esperado",
    "trabajaste en freelance como un animal",
    "vendiste una idea simple por un precio ridículamente bueno",
    "te fajaste en el turno y saliste con la cartera sonriendo",
    "resolviste un problema que nadie más podía resolver",
    "fuiste al trabajo medio muerto y aun así facturaste",
    "hiciste un diseño express y te lo pagaron premium",
    "organizaste un evento y te dejaron buena propina",
    "moderaste un caos digital y te recompensaron por aguantar",
    "te salió una vuelta de negocios más limpia que el agua",
    "hiciste soporte técnico y salvaste el día"
  ],
  crimeWin: [
    "la vuelta salió fina y nadie sospechó nada",
    "hiciste una jugada callejera y te fue raro de bien",
    "entraste rápido, saliste más rápido y nadie te vio",
    "te salió el plan improvisado como si estuviera escrito",
    "la calle hoy te sonrió feísimo",
    "hiciste una movida silenciosa y salió perfecta",
    "la policía estaba mirando para otro lado",
    "te metiste en lío y saliste con dinero igual",
    "esta vez el karma estaba de vacaciones",
    "el golpe salió limpio, limpio"
  ],
  crimeLose: [
    "te vieron hasta por las cámaras que ni servían",
    "se te cayó el plan a mitad de la jugada",
    "la policía virtual te cayó como rayo",
    "te confiaron demasiado y te salió mal",
    "el universo dijo 'hoy no, papi'",
    "te vendiste tú mismo sin darte cuenta",
    "salió todo al revés y encima te tocó pagar",
    "te toparon de frente y no hubo escape",
    "la vuelta se pudrió completo",
    "quedaste feo y con menos dinero"
  ],
  slutWin: [
    "la noche te trató con cariño económico",
    "te salió una vuelta coqueta y dejó dinero",
    "hoy el carisma te facturó fuerte",
    "te moviste con flow y eso dejó ganancia",
    "la vibra estuvo a tu favor esta noche",
    "te fue mejor de lo que tú mismo esperabas",
    "saliste con labia y regresaste con billetes",
    "la calle te premió por el atrevimiento",
    "hoy tu presencia cotizó alta",
    "la suerte andaba enamorada de ti"
  ],
  slutLose: [
    "la noche se viró fea y saliste perdiendo",
    "te salió cara la aventura",
    "quedaste pagando el precio del relajo",
    "el cuento se cayó y te costó dinero",
    "hoy no era tu día para esa vuelta",
    "te emocionaste demasiado y salió mal",
    "la jugada terminó en gasto",
    "la noche te dejó una lección costosa",
    "se fue el flow y también el dinero",
    "saliste con menos de lo que entraste"
  ],
  beg: [
    "un desconocido buena gente te soltó algo",
    "una señora millonaria te dio un empujoncito",
    "un streamer aburrido te regaló algo de cash",
    "un tipo con demasiada buena vibra te ayudó",
    "alguien se apiadó de tu tragedia económica",
    "te miraron con pena y te cayó dinero",
    "te encontraste a un donador casual",
    "un pana con alma noble te resolvió",
    "te dieron algo por insistente",
    "la compasión humana todavía existe"
  ],
  bankrobWin: [
    "saliste del banco con los nervios rotos pero con la funda intacta",
    "el plan fue tan absurdo que funcionó",
    "nadie entiende cómo lo lograste, pero lo lograste",
    "la alarma falló y tú no perdiste el tiempo",
    "el banco hoy decidió patrocinarte involuntariamente",
    "todo salió demasiado bien para ser legal"
  ],
  bankrobLose: [
    "la policía te rodeó antes de llegar a la esquina",
    "te vendió el nerviosismo y terminaste esposado",
    "el banco tenía más seguridad de la que imaginabas",
    "te atraparon con las manos y la cara puestas",
    "la fuga salió horrible y terminaste preso",
    "la jugada terminó en celda premium"
  ],
  robWin: [
    "te moviste ligero y le sacaste cash sin hacer ruido",
    "la víctima ni entendió qué pasó",
    "fue un robo fino, rápido y sin espectáculo",
    "te llevaste parte del efectivo con flow criminal",
    "la jugada fue limpia y te salió redonda",
    "hoy tus manos estaban inspiradas"
  ],
  robLose: [
    "te descubrieron en pleno intento",
    "la víctima te vio venir desde lejos",
    "hoy robando estabas transparentísimo",
    "te salió mal y terminaste pagando la gracia",
    "fallaste feísimo el movimiento",
    "la calle te devolvió una multa"
  ],
  searchWin: [
    "revisaste por todos lados y encontraste algo útil",
    "buscaste donde nadie mira y salió dinerito",
    "hurgaste entre cosas viejas y te cayó una sorpresa",
    "la búsqueda improvisada dio resultado",
    "hasta en el desorden había billete",
    "miraste bien y el destino cooperó"
  ],
  searchLose: [
    "revisaste todo para nada",
    "no había ni polvo de valor",
    "buscaste como loco y no salió nada",
    "perdiste el tiempo profesionalmente",
    "no encontraste ni un triste centavo",
    "la suerte estaba apagada"
  ],
  fishWin: [
    "sacaste una pesca inesperadamente valiosa",
    "el agua hoy quiso premiarte",
    "pescaste algo mejor de lo normal",
    "tiraste la línea y el río respondió",
    "esa caña vino con bendición",
    "pescaste como veterano"
  ],
  fishLose: [
    "se te fue todo por torpe",
    "la carnada no convenció ni a una sardina",
    "hoy el agua se burló de ti",
    "no picó nada",
    "tiraste la línea para perder tiempo",
    "pescaste aire premium"
  ],
  treasureWin: [
    "encontraste un cofre donde nadie había mirado",
    "el mapa no mentía esta vez",
    "escarbaste y salió premio",
    "el tesoro sí existía, increíblemente",
    "te topaste con un escondite rentable",
    "el bot del destino te soltó una bendición"
  ],
  treasureLose: [
    "caíste en una trampa buscando oro",
    "gastaste energía y saliste peor",
    "el tesoro era puro cuento",
    "solo encontraste problemas",
    "te comiste una estafa arqueológica",
    "buscar tesoros hoy era mala idea"
  ],
  memes: [
    "💀 cuando haces !bankrob y a los 5 minutos ya estás preso",
    "😴 el bot cuando ve 47 comandos seguidos en un minuto",
    "🤑 tú después del !daily creyéndote empresario internacional",
    "🚓 la policía virtual viendo tu historial completo de !crime",
    "🎰 tú apostando todo y diciendo 'ahora sí toca'",
    "📉 tu economía después de decir 'una última apuesta'",
    "🧠 mentalidad millonaria, saldo emocional",
    "💸 todo iba bien hasta que escribiste !slots",
    "🏦 el banco feliz de cobrarte la salida de la cárcel",
    "🥲 diciendo 'solo voy a probar' y terminas debiendo"
  ],
  eightBall: [
    "Sí, clarito.",
    "No cuadra para nada.",
    "Tal vez, pero no hoy.",
    "Todo apunta a que sí.",
    "Mejor ni cuentes con eso.",
    "Se viene duro.",
    "Eso huele a éxito.",
    "No me gusta cómo se ve.",
    "Pregunta otra vez luego.",
    "Sí, pero con cuidado.",
    "No, y mejor ni insistas.",
    "Pinta bonito.",
    "Está 50/50, asere.",
    "La vibra dice que sí.",
    "La vibra dice que no.",
    "Te conviene esperar.",
    "Ahora mismo no.",
    "Más adelante puede ser.",
    "Eso viene con sorpresa.",
    "No suena inteligente.",
    "Suena arriesgado, pero puede salir.",
    "Yo no apostaría por eso.",
    "El destino te está guiñando el ojo.",
    "El universo hoy no coopera.",
    "La respuesta corta es sí.",
    "La respuesta larga también es sí.",
    "No, ni con magia.",
    "Sí, pero no te duermas.",
    "No exactamente.",
    "Eso va a depender de ti.",
    "Se ve mejor de lo que parece.",
    "Peor sería no intentarlo.",
    "No hay buena señal en eso.",
    "Huele a victoria.",
    "Huele a desastre.",
    "Eso viene raro, pero bueno."
  ],
  jailAdmin: [
    "🚓 El patrullaje digital actuó y te mandaron pa' la celda.",
    "⛓️ Un admin te señaló y terminaste preso sin apelación.",
    "🚔 La ley del grupo cayó sobre ti.",
    "🔒 Te tocó celda por orden administrativa.",
    "👮 Un admin activó modo policía contigo."
  ],
  jailFree: [
    "🔓 Quedaste libre otra vez.",
    "🕊️ Te soltaron y vuelves a la calle.",
    "✅ La celda quedó atrás por ahora.",
    "🚪 Se abrió la puerta y saliste.",
    "😮‍💨 Un admin te perdonó la condena."
  ]
};

function loadDBFile() {
  if (!fs.existsSync(DB_FILE)) {
    const data = {
      owner: "13054925558",
      prefix: "!",
      botName: "Raice",
      currency: "USD",
      cooldowns: { ...DEFAULT_COOLDOWNS },
      users: {},
      groups: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return data;
  }

  const raw = fs.readFileSync(DB_FILE, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed.owner) parsed.owner = "13054925558";
  if (!parsed.prefix) parsed.prefix = "!";
  if (!parsed.botName) parsed.botName = "Raice";
  if (!parsed.currency) parsed.currency = "USD";
  if (!parsed.cooldowns) parsed.cooldowns = { ...DEFAULT_COOLDOWNS };
  if (!parsed.users) parsed.users = {};
  if (!parsed.groups) parsed.groups = {};

  for (const [key, value] of Object.entries(DEFAULT_COOLDOWNS)) {
    if (parsed.cooldowns[key] == null) parsed.cooldowns[key] = value;
  }

  return parsed;
}

let db = loadDBFile();

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getTextFromMessage(message) {
  if (!message) return "";
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  return "";
}

function normalizeJid(jid) {
  return jidNormalizedUser(jid || "");
}

function getUserIdFromJid(jid) {
  return normalizeJid(jid).split("@")[0];
}

function toMentionJid(userId) {
  return `${String(userId).replace(/\D/g, "")}@s.whatsapp.net`;
}

function uniqMentions(userIds = []) {
  return [...new Set(userIds.filter(Boolean).map(toMentionJid))];
}

function now() {
  return Date.now();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function money(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
}

function fmtUSD(n) {
  return `$${money(n)} ${db.currency}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseNumberSafe(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function formatMs(ms) {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function xpForLevel(level) {
  return level * level * 250;
}

function calculateLevel(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

function xpProgress(user) {
  const level = calculateLevel(user.xp);
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const progress = user.xp - current;
  const needed = next - current;
  return { level, progress, needed };
}

function progressBar(value, max, size = 10) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const filled = Math.round(ratio * size);
  return `${"█".repeat(filled)}${"░".repeat(size - filled)}`;
}

function addXp(user, amount) {
  user.xp += amount;
}

function ensureUser(userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      wallet: 5000,
      bank: 0,
      xp: 0,
      jailed: false,
      cooldowns: {},
      inventory: {},
      blackjack: null,
      stats: {
        work: 0,
        crimeWin: 0,
        crimeLose: 0,
        slutWin: 0,
        slutLose: 0,
        beg: 0,
        daily: 0,
        weekly: 0,
        robWin: 0,
        robLose: 0,
        bankrobWin: 0,
        bankrobLose: 0,
        rouletteWin: 0,
        rouletteLose: 0,
        cfWin: 0,
        cfLose: 0,
        bjWin: 0,
        bjLose: 0,
        slotsWin: 0,
        slotsLose: 0,
        diceWin: 0,
        diceLose: 0,
        duelWin: 0,
        duelLose: 0,
        heistWin: 0,
        heistLose: 0,
        treasureWin: 0,
        treasureLose: 0,
        rpsWin: 0,
        rpsLose: 0,
        searchWin: 0,
        searchLose: 0,
        fishWin: 0,
        fishLose: 0
      }
    };
  }

  const u = db.users[userId];
  if (typeof u.wallet !== "number") u.wallet = 5000;
  if (typeof u.bank !== "number") u.bank = 0;
  if (typeof u.xp !== "number") u.xp = 0;
  if (typeof u.jailed !== "boolean") u.jailed = false;
  if (!u.cooldowns) u.cooldowns = {};
  if (!u.inventory) u.inventory = {};
  if (!u.stats) u.stats = {};
  if (u.blackjack === undefined) u.blackjack = null;

  const defaults = {
    work: 0, crimeWin: 0, crimeLose: 0, slutWin: 0, slutLose: 0, beg: 0,
    daily: 0, weekly: 0, robWin: 0, robLose: 0, bankrobWin: 0, bankrobLose: 0,
    rouletteWin: 0, rouletteLose: 0, cfWin: 0, cfLose: 0, bjWin: 0, bjLose: 0,
    slotsWin: 0, slotsLose: 0, diceWin: 0, diceLose: 0, duelWin: 0, duelLose: 0,
    heistWin: 0, heistLose: 0, treasureWin: 0, treasureLose: 0,
    rpsWin: 0, rpsLose: 0, searchWin: 0, searchLose: 0, fishWin: 0, fishLose: 0
  };

  for (const [k, v] of Object.entries(defaults)) {
    if (u.stats[k] == null) u.stats[k] = v;
  }

  return u;
}

function ensureGroup(groupId) {
  if (!db.groups[groupId]) {
    db.groups[groupId] = {
      items: {
        cafe: {
          price: 10000,
          rewardMin: 700,
          rewardMax: 1200,
          emoji: "☕",
          description: "Café de lujo. Cuesta una locura y apenas devuelve algo."
        },
        laptop: {
          price: 30000,
          rewardMin: 1800,
          rewardMax: 3200,
          emoji: "💻",
          description: "Laptop premium carísima con retorno discretísimo."
        },
        maletin: {
          price: 18000,
          rewardMin: 1200,
          rewardMax: 2200,
          emoji: "💼",
          description: "Maletín elegante que da menos de lo que aparenta."
        },
        cadena: {
          price: 15000,
          rewardMin: 900,
          rewardMax: 1800,
          emoji: "📿",
          description: "Cadena con flow, pero no con tanto profit."
        },
        energia: {
          price: 12000,
          rewardMin: 800,
          rewardMax: 1400,
          emoji: "⚡",
          description: "Energía cara con retorno tímido."
        },
        caja_misteriosa: {
          price: 25000,
          rewardMin: 1000,
          rewardMax: 4000,
          emoji: "🎁",
          description: "Caja misteriosa de precio criminal y premio impredecible."
        },
        oro: {
          price: 40000,
          rewardMin: 1800,
          rewardMax: 4500,
          emoji: "🪙",
          description: "Oro carísimo. Rentabilidad baja, ego alto."
        },
        trofeo: {
          price: 50000,
          rewardMin: 2500,
          rewardMax: 5000,
          emoji: "🏆",
          description: "Un trofeo absurdo de caro para presumir más que ganar."
        }
      }
    };
  }

  if (!db.groups[groupId].items) db.groups[groupId].items = {};
  return db.groups[groupId];
}

function checkCooldown(user, key) {
  const seconds = Number(db.cooldowns[key] || 0);
  const last = user.cooldowns[key] || 0;
  const diff = now() - last;
  const required = seconds * 1000;

  if (diff < required) {
    return { ok: false, remaining: required - diff, total: seconds };
  }

  user.cooldowns[key] = now();
  return { ok: true, remaining: 0, total: seconds };
}

function getRemainingCooldown(user, key) {
  const seconds = Number(db.cooldowns[key] || 0);
  const last = user.cooldowns[key] || 0;
  const diff = now() - last;
  const required = seconds * 1000;
  return Math.max(0, required - diff);
}

function getInventoryCount(user, itemName) {
  return Number(user.inventory[itemName] || 0);
}

function addInventoryItem(user, itemName, qty = 1) {
  user.inventory[itemName] = getInventoryCount(user, itemName) + qty;
}

function removeInventoryItem(user, itemName, qty = 1) {
  const current = getInventoryCount(user, itemName);
  if (current < qty) return false;
  user.inventory[itemName] = current - qty;
  if (user.inventory[itemName] <= 0) delete user.inventory[itemName];
  return true;
}

function parseMentionedNumber(text) {
  const matches = [...text.matchAll(/@?(\d{7,16})/g)];
  if (!matches.length) return null;
  return matches[0][1];
}

function extractMentionedUserIds(msg) {
  const mentioned =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.message?.imageMessage?.contextInfo?.mentionedJid ||
    msg.message?.videoMessage?.contextInfo?.mentionedJid ||
    [];
  return mentioned.map(jid => getUserIdFromJid(jid));
}

function getQuotedParticipant(msg) {
  const ctx =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo;

  const participant = ctx?.participant;
  if (!participant) return null;
  return getUserIdFromJid(participant);
}

function resolveTargetUserId(msg, senderId, text) {
  const mentioned = extractMentionedUserIds(msg);
  if (mentioned.length > 0) return mentioned[0];

  const quoted = getQuotedParticipant(msg);
  if (quoted) return quoted;

  const raw = parseMentionedNumber(text);
  if (raw) return raw;

  return senderId;
}

function isOwner(senderJid) {
  return getUserIdFromJid(senderJid) === db.owner;
}

async function isGroupAdmin(sock, remoteJid, senderJid) {
  try {
    const meta = await sock.groupMetadata(remoteJid);
    const participant = meta.participants.find(
      p => normalizeJid(p.id) === normalizeJid(senderJid)
    );
    return !!participant?.admin;
  } catch {
    return false;
  }
}

function sanitizeDisplayName(name, fallbackId) {
  const clean = String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 30);
  return clean || fallbackId;
}

async function getDisplayName(sock, userId, remoteJid, msg) {
  const jid = toMentionJid(userId);

  if (
    msg &&
    userId === getUserIdFromJid(msg.key.participant || msg.key.remoteJid) &&
    msg.pushName
  ) {
    return sanitizeDisplayName(msg.pushName, userId);
  }

  try {
    const name = await sock.getName(jid);
    if (name && typeof name === "string" && name.trim() && name !== jid) {
      return sanitizeDisplayName(name, userId);
    }
  } catch {}

  if (remoteJid?.endsWith("@g.us")) {
    try {
      const meta = await sock.groupMetadata(remoteJid);
      const participant = meta.participants.find(
        p => normalizeJid(p.id) === normalizeJid(jid)
      );

      const maybeName =
        participant?.name ||
        participant?.notify ||
        participant?.verifiedName ||
        participant?.pushName;

      if (maybeName && String(maybeName).trim()) {
        return sanitizeDisplayName(maybeName, userId);
      }
    } catch {}
  }

  return userId;
}

async function mentionLabel(sock, userId, remoteJid, msg) {
  return await getDisplayName(sock, userId, remoteJid, msg);
}

async function sendText(sock, jid, text, quoted, mentions = []) {
  await sock.sendMessage(jid, { text, mentions }, { quoted });
}

async function sendBanner(sock, jid, caption, quoted, mentions = []) {
  if (fs.existsSync(BANNER_FILE)) {
    return sock.sendMessage(
      jid,
      {
        image: fs.readFileSync(BANNER_FILE),
        caption,
        mentions
      },
      { quoted }
    );
  }

  return sendText(sock, jid, caption, quoted, mentions);
}

async function casinoAnimation(sock, jid, quoted, title, frames) {
  await sendText(sock, jid, `🎰 *${title}*\n${frames[0]}`, quoted);
  await sleep(350);
  if (frames[1]) await sendText(sock, jid, frames[1], quoted);
  await sleep(350);
  if (frames[2]) await sendText(sock, jid, frames[2], quoted);
}

function cardValue(rank) {
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return Number(rank);
}

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function handTotal(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === "A") aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

function renderHand(hand) {
  return hand.map(c => `${c.rank}${c.suit}`).join(" ");
}

function rouletteColor(n) {
  if (n === 0) return "verde";
  const red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  return red.has(n) ? "rojo" : "negro";
}

function parseRouletteBet(choice) {
  const c = String(choice || "").toLowerCase();
  if (["rojo", "negro", "par", "impar"].includes(c)) return c;
  return null;
}

function cleanItemName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\wáéíóúüñ]/gi, "");
}

function resolveAmountArg(userAmount, raw) {
  if (!raw) return NaN;
  const value = String(raw).toLowerCase();

  if (value === "all") {
    return userAmount;
  }

  return parseNumberSafe(raw);
}

function canonicalCooldownName(name) {
  const n = String(name || "").toLowerCase();
  const map = {
    work: "work",
    w: "work",
    crime: "crime",
    slut: "slut",
    beg: "beg",
    daily: "daily",
    weekly: "weekly",
    rob: "rob",
    bankrob: "bankrob",
    heist: "heist",
    treasure: "treasure",
    search: "search",
    fish: "fish"
  };
  return map[n] || null;
}

function cooldownList(user) {
  const keys = ["work", "crime", "slut", "beg", "daily", "weekly", "rob", "bankrob", "heist", "treasure", "search", "fish"];
  return keys
    .map(k => `• ${db.prefix}${k}: ${formatMs(getRemainingCooldown(user, k))} / base ${db.cooldowns[k]}s`)
    .join("\n");
}

function getAllCommands() {
  return [
    "!menu", "!info", "!hola", "!bal", "!profile", "!work", "!w", "!crime", "!slut", "!beg",
    "!daily", "!weekly", "!deposit", "!dep", "!d", "!withdraw", "!retirar", "!pay", "!rob",
    "!bankrob", "!bail", "!top", "!shop", "!buy", "!inventory", "!use", "!iteminfo",
    "!createitem", "!edititem", "!deleteitem", "!setdesc", "!setemoji", "!roulette", "!cf", "!bj",
    "!hit", "!stand", "!slots", "!dice", "!duel", "!accept", "!decline", "!heist",
    "!setcooldown", "!cooldowns", "!addmoney", "!removemoney", "!8ball", "!rps", "!roll",
    "!treasure", "!meme", "!search", "!fish", "!carcel", "!uncarcel", "!rate", "!pick"
  ];
}

function randomRate() {
  return randomInt(0, 100);
}

function weightedSearchResult() {
  const success = Math.random() < 0.68;
  if (success) return { ok: true, amount: randomInt(400, 1800) };
  return { ok: false, amount: 0 };
}

function weightedFishResult() {
  const success = Math.random() < 0.62;
  if (success) return { ok: true, amount: randomInt(600, 2200) };
  return { ok: false, amount: Math.min(randomInt(150, 500), 500) };
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(db.owner);
        console.log(`\n🔑 Código de vinculación de ${db.botName}: ${code}\n`);
      } catch (err) {
        console.log("No se pudo generar código de vinculación:", err.message);
      }
    }, 2500);
  }

  let isRestarting = false;

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    const statusCode =
      lastDisconnect?.error?.output?.statusCode ||
      lastDisconnect?.error?.data?.statusCode;

    if (connection === "open") {
      console.log(`✅ ${db.botName} conectado correctamente.`);
      isRestarting = false;
      return;
    }

    if (connection === "close") {
      console.log("Conexión cerrada:", statusCode);

      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        console.log("❌ Sesión cerrada. Borra auth y vuelve a vincular.");
        return;
      }

      if (statusCode === 440) {
        console.log("⚠️ Detectado error 440. Evitando bucle de reconexión.");
        return;
      }

      if (!isRestarting) {
        isRestarting = true;
        console.log("🔄 Reintentando conexión en 5 segundos...");
        setTimeout(() => {
          startBot();
        }, 5000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg?.message) return;
      if (msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid;
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderId = getUserIdFromJid(senderJid);
      const isGroup = remoteJid.endsWith("@g.us");

      const rawText = getTextFromMessage(msg.message).trim();
      if (!rawText) return;

      const textLower = rawText.toLowerCase().trim();

      if (textLower === "!hola") {
        return sendText(sock, remoteJid, pick([
          "😴 callate asere estoy durmiendo",
          "😴 shhh, estoy en modo descanso criminal",
          "💤 ahora mismo estoy durmiendo, no friegues",
          "😴 el bot está soñando con dinero ahora mismo"
        ]), msg);
      }

      if (!rawText.startsWith(db.prefix)) return;

      const args = rawText.slice(db.prefix.length).trim().split(/\s+/);
      const command = (args.shift() || "").toLowerCase();

      const owner = isOwner(senderJid);

      // ==============================
// 👑 SETNAME (OWNER)
// ==============================
if (command === "setname") {
  if (!owner) {
    return sendText(sock, remoteJid, "❌ Solo el owner puede usar este comando.", msg);
  }

  const newName = args.join(" ").trim();

  if (!newName) {
    return sendText(sock, remoteJid, "❌ Uso: !setname NuevoNombre", msg);
  }

  db.botName = newName;
  saveDB();

  return sendText(
    sock,
    remoteJid,
    `🤖 Nombre del bot cambiado a: *${newName}*`,
    msg
  );
}
      const admin = isGroup ? await isGroupAdmin(sock, remoteJid, senderJid) : false;

      const user = ensureUser(senderId);
      const group = isGroup ? ensureGroup(remoteJid) : null;

      const jailFreeCommands = ["menu", "help", "info", "bail"];
      if (user.jailed && !jailFreeCommands.includes(command)) {
        return sendText(
          sock,
          remoteJid,
          `🚔 *SIGUES EN LA CÁRCEL*\nNo puedes usar comandos hasta pagar tu salida.\n🏦 Usa *!bail* y se descontarán *${fmtUSD(JAIL_BAIL_COST)}* de tu banco.`,
          msg
        );
      }

      if (!["hit", "stand", "accept", "decline"].includes(command)) {
        addXp(user, randomInt(8, 18));
      }

      saveDB();

      if (command === "menu" || command === "help") {
        const ownerLabel = await mentionLabel(sock, db.owner, remoteJid, msg);

        const menuText = [
          `╭━━━〔 🤖 ${db.botName} • DEFINITIVE MODE 〕━━━╮`,
          `┃ 👑 Owner: ${ownerLabel}`,
          `┃ 💵 Moneda: ${db.currency}`,
          `┃ 🔧 Prefijo: ${db.prefix}`,
          `┃ ⚙️ Comandos: ${getAllCommands().length}`,
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
          ``,
          `💸 *Economía*`,
          `• !bal / !profile`,
          `• !work / !w`,
          `• !crime / !slut / !beg`,
          `• !search / !fish / !treasure`,
          `• !daily / !weekly`,
          `• !deposit / !dep / !d`,
          `• !withdraw / !retirar`,
          `• !pay @user 5,000`,
          `• !rob @user`,
          `• !bankrob / !bail`,
          `• !top`,
          ``,
          `🛒 *Shop*`,
          `• !shop / !buy / !use`,
          `• !inventory / !iteminfo`,
          ``,
          `🎰 *Casino*`,
          `• !roulette 5,000 rojo`,
          `• !cf 5,000 cara`,
          `• !bj 5,000`,
          `• !hit / !stand`,
          `• !slots 5,000`,
          `• !dice 5,000`,
          ``,
          `⚔️ *Multiplayer*`,
          `• !duel @user 5,000`,
          `• !heist @user`,
          `• !accept / !decline`,
          ``,
          `🎉 *Diversión*`,
          `• !8ball pregunta`,
          `• !rps piedra`,
          `• !roll`,
          `• !meme`,
          `• !rate algo`,
          `• !pick opcion1 | opcion2 | opcion3`,
          ``,
          `👮 *Admins*`,
          `• !carcel @user`,
          `• !uncarcel @user`,
          `• !addmoney @user 10,000`,
          `• !removemoney @user 5,000`,
          `• !setcooldown work 25`,
          `• !createitem nombre precio min max`,
          `• !edititem nombre precio min max`,
          `• !deleteitem nombre`,
          `• !setdesc item descripcion`,
          `• !setemoji item 🔥`,
          ``,
          `📊 *Sistema*`,
          `• !cooldowns`
        ].join("\n");

        return sendBanner(sock, remoteJid, menuText, msg, uniqMentions([db.owner]));
      }

      if (command === "info") {
        const ownerLabel = await mentionLabel(sock, db.owner, remoteJid, msg);

        const infoText = [
          `╭━━━〔 ✨ ${db.botName} FINAL 〕━━━╮`,
          `┃ 🤖 Nombre: ${db.botName}`,
          `┃ 👑 Owner: ${ownerLabel}`,
          `┃ 💵 Moneda: ${db.currency}`,
          `┃ 🎮 Estado: Modo salvaje`,
          `┃ ⚙️ Comandos: ${getAllCommands().length}`,
          `╰━━━━━━━━━━━━━━━━━━╯`,
          ``,
          `🔥 *Incluye*`,
          `• Economía rebalanceada`,
          `• Casino animado`,
          `• Minijuegos`,
          `• Multiplayer`,
          `• Jail system`,
          `• Shop cruelmente cara`,
          `• XP y niveles`,
          `• Textos más vivos`
        ].join("\n");

        return sendBanner(sock, remoteJid, infoText, msg, uniqMentions([db.owner]));
      }

      if (command === "cooldowns") {
        return sendText(
          sock,
          remoteJid,
          `⏳ *COOLDOWNS ACTIVOS*\n\n${cooldownList(user)}`,
          msg
        );
      }

      if (command === "setcooldown") {
        if (!(owner || admin)) {
          return sendText(sock, remoteJid, "❌ Solo admins u owner pueden cambiar cooldowns.", msg);
        }

        const cmdName = canonicalCooldownName(args[0]);
        const seconds = parseNumberSafe(args[1]);

        if (!cmdName || !Number.isFinite(seconds) || seconds < 0) {
          return sendText(sock, remoteJid, `Uso: *!setcooldown <work|crime|slut|beg|daily|weekly|rob|bankrob|heist|treasure|search|fish> <segundos>*`, msg);
        }

        db.cooldowns[cmdName] = seconds;
        saveDB();

        return sendText(sock, remoteJid, `🛠️ Cooldown de *!${cmdName}* cambiado a *${seconds}s*`, msg);
      }

      if (command === "bail") {
        if (!user.jailed) {
          return sendText(sock, remoteJid, "✅ Tú no estás preso ahora mismo.", msg);
        }

        if (user.bank < JAIL_BAIL_COST) {
          return sendText(sock, remoteJid, `❌ Necesitas *${fmtUSD(JAIL_BAIL_COST)}* en el banco para salir.`, msg);
        }

        user.bank -= JAIL_BAIL_COST;
        user.jailed = false;
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `🔓 Pagaste tu salida.\n🏦 Se descontaron *${fmtUSD(JAIL_BAIL_COST)}* del banco y ya estás libre.`,
          msg
        );
      }

      if (command === "carcel") {
        if (!(owner || admin)) {
          return sendText(sock, remoteJid, "❌ Solo admins u owner pueden mandar a alguien a la cárcel.", msg);
        }

        const targetId = resolveTargetUserId(msg, senderId, rawText);
        if (!targetId || targetId === senderId) {
          return sendText(sock, remoteJid, "❌ Debes responder o mencionar a otro usuario.", msg);
        }

        const targetUser = ensureUser(targetId);
        targetUser.jailed = true;
        saveDB();

        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);
        return sendText(
          sock,
          remoteJid,
          `${pick(PHRASES.jailAdmin)}\n👤 Usuario: ${targetLabel}\n💰 Para salir deberá pagar *${fmtUSD(JAIL_BAIL_COST)}* usando *!bail*.`,
          msg,
          uniqMentions([targetId])
        );
      }

      if (command === "uncarcel") {
        if (!(owner || admin)) {
          return sendText(sock, remoteJid, "❌ Solo admins u owner pueden sacar gente de la cárcel.", msg);
        }

        const targetId = resolveTargetUserId(msg, senderId, rawText);
        if (!targetId || targetId === senderId) {
          return sendText(sock, remoteJid, "❌ Debes responder o mencionar a otro usuario.", msg);
        }

        const targetUser = ensureUser(targetId);
        targetUser.jailed = false;
        saveDB();

        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);
        return sendText(
          sock,
          remoteJid,
          `${pick(PHRASES.jailFree)}\n👤 Usuario: ${targetLabel}`,
          msg,
          uniqMentions([targetId])
        );
      }

      if (command === "bal" || command === "balance") {
        const targetId = resolveTargetUserId(msg, senderId, rawText);
        const targetUser = ensureUser(targetId);
        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);

        const text = [
          `╭━━━〔 💳 BALANCE 〕━━━╮`,
          `┃ 👤 Usuario: ${targetLabel}`,
          `┃ 💵 Wallet: ${fmtUSD(targetUser.wallet)}`,
          `┃ 🏦 Bank: ${fmtUSD(targetUser.bank)}`,
          `┃ 💰 Total: ${fmtUSD(targetUser.wallet + targetUser.bank)}`,
          `╰━━━━━━━━━━━━━━━━━━╯`
        ].join("\n");

        return sendText(sock, remoteJid, text, msg, uniqMentions([targetId]));
      }

      if (command === "profile" || command === "perfil") {
        const targetId = resolveTargetUserId(msg, senderId, rawText);
        const targetUser = ensureUser(targetId);
        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);
        const total = targetUser.wallet + targetUser.bank;
        const { level, progress, needed } = xpProgress(targetUser);

        const text = [
          `╭━━━〔 👤 PERFIL 〕━━━╮`,
          `┃ Usuario: ${targetLabel}`,
          `┃ 💵 Wallet: ${fmtUSD(targetUser.wallet)}`,
          `┃ 🏦 Bank: ${fmtUSD(targetUser.bank)}`,
          `┃ 💰 Total: ${fmtUSD(total)}`,
          `┃ ⭐ Nivel: ${level}`,
          `┃ ✨ XP: ${money(targetUser.xp)}`,
          `┃ 📊 ${progressBar(progress, needed)} ${money(progress)}/${money(needed)}`,
          `┃ 🚔 Cárcel: ${targetUser.jailed ? "Sí" : "No"}`,
          `┃`,
          `┃ 💼 Work: ${targetUser.stats.work}`,
          `┃ 😈 Crime: ${targetUser.stats.crimeWin}/${targetUser.stats.crimeLose}`,
          `┃ 🔥 Slut: ${targetUser.stats.slutWin}/${targetUser.stats.slutLose}`,
          `┃ 🕵️ Rob: ${targetUser.stats.robWin}/${targetUser.stats.robLose}`,
          `┃ 🏦 Bankrob: ${targetUser.stats.bankrobWin}/${targetUser.stats.bankrobLose}`,
          `┃ 🎰 Ruleta: ${targetUser.stats.rouletteWin}/${targetUser.stats.rouletteLose}`,
          `┃ 🪙 Coinflip: ${targetUser.stats.cfWin}/${targetUser.stats.cfLose}`,
          `┃ 🃏 Blackjack: ${targetUser.stats.bjWin}/${targetUser.stats.bjLose}`,
          `┃ 🎰 Slots: ${targetUser.stats.slotsWin}/${targetUser.stats.slotsLose}`,
          `┃ 🎲 Dice: ${targetUser.stats.diceWin}/${targetUser.stats.diceLose}`,
          `┃ ✂️ RPS: ${targetUser.stats.rpsWin}/${targetUser.stats.rpsLose}`,
          `┃ ⚔️ Duelos: ${targetUser.stats.duelWin}/${targetUser.stats.duelLose}`,
          `┃ 💣 Heist: ${targetUser.stats.heistWin}/${targetUser.stats.heistLose}`,
          `┃ 🗺️ Treasure: ${targetUser.stats.treasureWin}/${targetUser.stats.treasureLose}`,
          `┃ 🔎 Search: ${targetUser.stats.searchWin}/${targetUser.stats.searchLose}`,
          `┃ 🎣 Fish: ${targetUser.stats.fishWin}/${targetUser.stats.fishLose}`,
          `╰━━━━━━━━━━━━━━━━━━╯`
        ].join("\n");

        return sendText(sock, remoteJid, text, msg, uniqMentions([targetId]));
      }

      if (command === "work" || command === "w") {
        const cd = checkCooldown(user, "work");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `⏳ Espera ${formatMs(cd.remaining)} para usar *!work*.`, msg);
        }

        const amount = randomInt(1200, 3200);
        user.wallet += amount;
        user.stats.work += 1;
        addXp(user, randomInt(20, 35));
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `💼 ${pick(PHRASES.work)}\n💵 Te cayeron *${fmtUSD(amount)}*`,
          msg
        );
      }

      if (command === "crime") {
        const cd = checkCooldown(user, "crime");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `🚓 Espera ${formatMs(cd.remaining)} para usar *!crime*.`, msg);
        }

        const success = Math.random() < 0.58;

        if (success) {
          const gain = randomInt(2000, 6000);
          user.wallet += gain;
          user.stats.crimeWin += 1;
          addXp(user, randomInt(28, 45));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `😈 ${pick(PHRASES.crimeWin)}\n💸 Te llevaste *${fmtUSD(gain)}*`,
            msg
          );
        } else {
          const loss = Math.min(user.wallet, randomInt(1200, 3000));
          user.wallet -= loss;
          user.stats.crimeLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🚔 ${pick(PHRASES.crimeLose)}\n💥 Perdiste *${fmtUSD(loss)}*`,
            msg
          );
        }
      }

      if (command === "slut") {
        const cd = checkCooldown(user, "slut");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `⏳ Espera ${formatMs(cd.remaining)} para usar *!slut*.`, msg);
        }

        const success = Math.random() < 0.7;

        if (success) {
          const gain = randomInt(1500, 4000);
          user.wallet += gain;
          user.stats.slutWin += 1;
          addXp(user, randomInt(22, 36));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🔥 ${pick(PHRASES.slutWin)}\n💵 Ganaste *${fmtUSD(gain)}*`,
            msg
          );
        } else {
          const loss = Math.min(user.wallet, randomInt(700, 1800));
          user.wallet -= loss;
          user.stats.slutLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `💔 ${pick(PHRASES.slutLose)}\n❌ Perdiste *${fmtUSD(loss)}*`,
            msg
          );
        }
      }

      if (command === "beg") {
        const cd = checkCooldown(user, "beg");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `🥲 Espera ${formatMs(cd.remaining)} para mendigar otra vez.`, msg);
        }

        const amount = randomInt(250, 850);
        user.wallet += amount;
        user.stats.beg += 1;
        addXp(user, randomInt(8, 15));
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `🥲 ${pick(PHRASES.beg)}\n💵 Recibiste *${fmtUSD(amount)}*`,
          msg
        );
      }

      if (command === "search") {
        const cd = checkCooldown(user, "search");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `🔎 Espera ${formatMs(cd.remaining)} para buscar otra vez.`, msg);
        }

        const res = weightedSearchResult();
        if (res.ok) {
          user.wallet += res.amount;
          user.stats.searchWin += 1;
          addXp(user, randomInt(10, 18));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🔎 ${pick(PHRASES.searchWin)}\n💵 Encontraste *${fmtUSD(res.amount)}*`,
            msg
          );
        } else {
          user.stats.searchLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `📭 ${pick(PHRASES.searchLose)}`,
            msg
          );
        }
      }

      if (command === "fish") {
        const cd = checkCooldown(user, "fish");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `🎣 Espera ${formatMs(cd.remaining)} para pescar otra vez.`, msg);
        }

        const res = weightedFishResult();
        if (res.ok) {
          user.wallet += res.amount;
          user.stats.fishWin += 1;
          addXp(user, randomInt(12, 18));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🎣 ${pick(PHRASES.fishWin)}\n💵 Vendiste la pesca por *${fmtUSD(res.amount)}*`,
            msg
          );
        } else {
          const loss = Math.min(user.wallet, res.amount);
          user.wallet -= loss;
          user.stats.fishLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🌊 ${pick(PHRASES.fishLose)}\n💥 Entre carnada y mala suerte perdiste *${fmtUSD(loss)}*`,
            msg
          );
        }
      }

      if (command === "daily") {
        const cd = checkCooldown(user, "daily");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `🎁 Tu daily vuelve en *${formatMs(cd.remaining)}*`, msg);
        }

        const amount = randomInt(3500, 7000);
        user.wallet += amount;
        user.stats.daily += 1;
        addXp(user, randomInt(20, 30));
        saveDB();

        return sendText(sock, remoteJid, `🎁 Daily reclamada con éxito.\n💵 Te tocaron *${fmtUSD(amount)}*`, msg);
      }

      if (command === "weekly") {
        const cd = checkCooldown(user, "weekly");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `📦 Tu weekly vuelve en *${formatMs(cd.remaining)}*`, msg);
        }

        const amount = randomInt(15000, 30000);
        user.wallet += amount;
        user.stats.weekly += 1;
        addXp(user, randomInt(35, 50));
        saveDB();

        return sendText(sock, remoteJid, `📦 Weekly reclamada como rey.\n💵 Recibiste *${fmtUSD(amount)}*`, msg);
      }

      if (command === "deposit" || command === "dep" || command === "d") {
        const amount = resolveAmountArg(user.wallet, args[0]);
        if (!Number.isFinite(amount) || amount <= 0) {
          return sendText(sock, remoteJid, `Uso: *!deposit <cantidad|all>* o *!dep all*`, msg);
        }
        if (user.wallet < amount) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero en wallet.", msg);
        }

        user.wallet -= amount;
        user.bank += amount;
        addXp(user, 5);
        saveDB();

        return sendText(sock, remoteJid, `🏦 Depositaste *${fmtUSD(amount)}* en el banco.`, msg);
      }

      if (command === "withdraw" || command === "retirar") {
        const amount = resolveAmountArg(user.bank, args[0]);
        if (!Number.isFinite(amount) || amount <= 0) {
          return sendText(sock, remoteJid, `Uso: *!withdraw <cantidad|all>* o *!retirar all*`, msg);
        }
        if (user.bank < amount) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero en el banco.", msg);
        }

        user.bank -= amount;
        user.wallet += amount;
        addXp(user, 5);
        saveDB();

        return sendText(sock, remoteJid, `💵 Retiraste *${fmtUSD(amount)}* del banco.`, msg);
      }

      if (command === "pay") {
        const targetId = resolveTargetUserId(msg, senderId, rawText);
        const amount = parseNumberSafe(args[args.length - 1]);

        if (targetId === senderId) {
          return sendText(sock, remoteJid, "❌ No puedes pagarte a ti mismo.", msg);
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          return sendText(sock, remoteJid, `Uso: *!pay @usuario <cantidad>*`, msg);
        }
        if (user.wallet < amount) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero en wallet.", msg);
        }

        const targetUser = ensureUser(targetId);
        const senderLabel = await mentionLabel(sock, senderId, remoteJid, msg);
        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);

        user.wallet -= amount;
        targetUser.wallet += amount;
        addXp(user, 10);
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `💸 Transferencia completada\n👤 De: ${senderLabel}\n👤 Para: ${targetLabel}\n💵 Monto: *${fmtUSD(amount)}*`,
          msg,
          uniqMentions([senderId, targetId])
        );
      }

      if (command === "rob") {
        if (!isGroup) {
          return sendText(sock, remoteJid, "🕵️ Este comando funciona en grupos.", msg);
        }

        const cd = checkCooldown(user, "rob");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `⏳ Espera ${formatMs(cd.remaining)} para volver a robar.`, msg);
        }

        const targetId = resolveTargetUserId(msg, senderId, rawText);
        if (targetId === senderId) {
          return sendText(sock, remoteJid, "❌ No puedes robarte a ti mismo.", msg);
        }

        const targetUser = ensureUser(targetId);
        if (targetUser.wallet < 1000) {
          return sendText(sock, remoteJid, "💸 Ese usuario casi no tiene efectivo.", msg);
        }

        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);
        const success = Math.random() < 0.42;

        if (success) {
          const steal = Math.min(targetUser.wallet, randomInt(800, 4000));
          targetUser.wallet -= steal;
          user.wallet += steal;
          user.stats.robWin += 1;
          addXp(user, randomInt(18, 30));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🕵️ ${pick(PHRASES.robWin)}\n👤 Víctima: ${targetLabel}\n💸 Te llevaste *${fmtUSD(steal)}*`,
            msg,
            uniqMentions([targetId])
          );
        } else {
          const fine = Math.min(user.wallet, randomInt(700, 2500));
          user.wallet -= fine;
          user.stats.robLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🚨 ${pick(PHRASES.robLose)}\n👤 Objetivo: ${targetLabel}\n💥 Perdiste *${fmtUSD(fine)}*`,
            msg,
            uniqMentions([targetId])
          );
        }
      }

      if (command === "bankrob") {
        const cd = checkCooldown(user, "bankrob");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `🏦 Espera ${formatMs(cd.remaining)} para intentar otro bankrob.`, msg);
        }

        if (user.bank < JAIL_BAIL_COST) {
          return sendText(sock, remoteJid, `❌ Necesitas mínimo *${fmtUSD(JAIL_BAIL_COST)}* en el banco para cubrir la salida si te atrapan.`, msg);
        }

        await casinoAnimation(sock, remoteJid, msg, "BANKROB", [
          "🏦 Entrando al banco...",
          "🚨 Desactivando alarmas...",
          "💣 Corriendo con la funda..."
        ]);

        const success = Math.random() < 0.28;

        if (success) {
          const gain = randomInt(10000, 30000);
          user.wallet += gain;
          user.stats.bankrobWin += 1;
          addXp(user, randomInt(30, 50));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🏦💥 ${pick(PHRASES.bankrobWin)}\n💵 Ganaste *${fmtUSD(gain)}*`,
            msg
          );
        } else {
          user.jailed = true;
          user.stats.bankrobLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🚓 ${pick(PHRASES.bankrobLose)}\n🔒 Quedaste en la cárcel.\n💰 Para salir tendrás que pagar *${fmtUSD(JAIL_BAIL_COST)}* usando *!bail*.`,
            msg
          );
        }
      }

      if (command === "addmoney") {
        if (!(owner || admin)) {
          return sendText(sock, remoteJid, "❌ Solo admins u owner pueden usar este comando.", msg);
        }

        let targetId = resolveTargetUserId(msg, senderId, rawText);
        let amount = NaN;

        if (args.length === 1) {
          targetId = senderId;
          amount = parseNumberSafe(args[0]);
        } else {
          amount = parseNumberSafe(args[args.length - 1]);
        }

        if (!Number.isFinite(amount) || amount <= 0) {
          return sendText(sock, remoteJid, `Uso: *!addmoney @usuario <cantidad>* o *!addmoney <cantidad>*`, msg);
        }

        const targetUser = ensureUser(targetId);
        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);
        targetUser.wallet += amount;
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `✅ Dinero agregado\n👤 Usuario: ${targetLabel}\n💵 Añadido: *${fmtUSD(amount)}*`,
          msg,
          uniqMentions([targetId])
        );
      }

      if (command === "removemoney") {
        if (!(owner || admin)) {
          return sendText(sock, remoteJid, "❌ Solo admins u owner pueden usar este comando.", msg);
        }

        const targetId = resolveTargetUserId(msg, senderId, rawText);
        const amount = parseNumberSafe(args[args.length - 1]);

        if (!Number.isFinite(amount) || amount <= 0) {
          return sendText(sock, remoteJid, `Uso: *!removemoney @usuario <cantidad>*`, msg);
        }

        const targetUser = ensureUser(targetId);
        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);
        targetUser.wallet = Math.max(0, targetUser.wallet - amount);
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `🧾 Dinero removido\n👤 Usuario: ${targetLabel}\n💥 Quitado: *${fmtUSD(amount)}*`,
          msg,
          uniqMentions([targetId])
        );
      }

      if (command === "top") {
        const ranking = Object.entries(db.users)
          .map(([id, data]) => ({
            id,
            total: Number(data.wallet || 0) + Number(data.bank || 0)
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        if (ranking.length === 0) {
          return sendText(sock, remoteJid, "📉 Aún no hay usuarios en el ranking.", msg);
        }

        const medals = ["🥇", "🥈", "🥉"];
        const lines = [];
        for (let i = 0; i < ranking.length; i++) {
          const icon = medals[i] || "🏅";
          const label = await mentionLabel(sock, ranking[i].id, remoteJid, msg);
          lines.push(`${icon} ${i + 1}. ${label} — *${fmtUSD(ranking[i].total)}*`);
        }

        return sendText(
          sock,
          remoteJid,
          [`🏆 *RANKING DE MILLONARIOS*`, "", ...lines].join("\n"),
          msg,
          uniqMentions(ranking.map(r => r.id))
        );
      }

      if (command === "shop") {
        if (!isGroup) {
          return sendText(sock, remoteJid, "🛒 La tienda funciona mejor dentro de grupos.", msg);
        }

        const items = Object.entries(group.items);
        if (items.length === 0) {
          return sendText(sock, remoteJid, "🛒 No hay items en esta tienda.", msg);
        }

        const lines = items.map(([name, item]) => {
          return `${item.emoji || "📦"} *${name}*\n   💵 Precio: ${fmtUSD(item.price)}\n   🎁 Uso: ${fmtUSD(item.rewardMin)} - ${fmtUSD(item.rewardMax)}`;
        });

        return sendText(
          sock,
          remoteJid,
          [`🛒 *TIENDA DE ${db.botName.toUpperCase()}*`, "", ...lines, "", `Usa: *!buy <item>*`].join("\n"),
          msg
        );
      }

      if (command === "buy") {
        if (!isGroup) return sendText(sock, remoteJid, "❌ Compra items dentro de un grupo.", msg);

        const itemName = cleanItemName(args[0]);
        if (!itemName) return sendText(sock, remoteJid, `Uso: *!buy <item>*`, msg);

        const item = group.items[itemName];
        if (!item) return sendText(sock, remoteJid, "❌ Ese item no existe.", msg);
        if (user.wallet < item.price) return sendText(sock, remoteJid, "❌ No tienes suficiente dinero.", msg);

        user.wallet -= item.price;
        addInventoryItem(user, itemName, 1);
        addXp(user, 12);
        saveDB();

        return sendText(sock, remoteJid, `✅ Compraste *${item.emoji || "📦"} ${itemName}*\n💵 Costó: *${fmtUSD(item.price)}*`, msg);
      }

      if (command === "inventory" || command === "inv") {
        const entries = Object.entries(user.inventory);
        if (entries.length === 0) return sendText(sock, remoteJid, "🎒 Tu inventario está vacío.", msg);

        const lines = entries.map(([name, qty]) => {
          const item = isGroup ? group.items[name] : null;
          const emoji = item?.emoji || "📦";
          return `${emoji} *${name}* x${qty}`;
        });

        return sendText(sock, remoteJid, [`🎒 *INVENTARIO*`, "", ...lines].join("\n"), msg);
      }

      if (command === "iteminfo") {
        if (!isGroup) return sendText(sock, remoteJid, "ℹ️ Este comando funciona en grupos.", msg);

        const itemName = cleanItemName(args[0]);
        if (!itemName) return sendText(sock, remoteJid, `Uso: *!iteminfo <item>*`, msg);

        const item = group.items[itemName];
        if (!item) return sendText(sock, remoteJid, "❌ Ese item no existe.", msg);

        return sendText(
          sock,
          remoteJid,
          [
            `📦 *INFO DEL ITEM*`,
            `🔹 Nombre: ${itemName}`,
            `🔹 Emoji: ${item.emoji || "📦"}`,
            `🔹 Precio: ${fmtUSD(item.price)}`,
            `🔹 Ganancia: ${fmtUSD(item.rewardMin)} - ${fmtUSD(item.rewardMax)}`,
            `🔹 Descripción: ${item.description || "Sin descripción"}`
          ].join("\n"),
          msg
        );
      }

      if (command === "use") {
        if (!isGroup) return sendText(sock, remoteJid, "❌ Usa items dentro del grupo.", msg);

        const itemName = cleanItemName(args[0]);
        if (!itemName) return sendText(sock, remoteJid, `Uso: *!use <item>*`, msg);

        const item = group.items[itemName];
        if (!item) return sendText(sock, remoteJid, "❌ Ese item no existe.", msg);
        if (getInventoryCount(user, itemName) <= 0) {
          return sendText(sock, remoteJid, "❌ No tienes ese item en tu inventario.", msg);
        }

        removeInventoryItem(user, itemName, 1);
        const reward = randomInt(item.rewardMin, item.rewardMax);
        user.wallet += reward;
        addXp(user, randomInt(10, 18));
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `${item.emoji || "✨"} Usaste *${itemName}*\n💸 Te devolvió apenas *${fmtUSD(reward)}*`,
          msg
        );
      }

      if (command === "createitem") {
        if (!isGroup) return sendText(sock, remoteJid, "❌ Solo para grupos.", msg);
        if (!(owner || admin)) return sendText(sock, remoteJid, "❌ Solo admins u owner.", msg);

        const [rawName, rawPrice, rawMin, rawMax] = args;
        const itemName = cleanItemName(rawName);
        const price = parseNumberSafe(rawPrice);
        const rewardMin = parseNumberSafe(rawMin);
        const rewardMax = parseNumberSafe(rawMax);

        if (!itemName || !Number.isFinite(price) || !Number.isFinite(rewardMin) || !Number.isFinite(rewardMax)) {
          return sendText(sock, remoteJid, `Uso: *!createitem <nombre> <precio> <min> <max>*`, msg);
        }
        if (price <= 0 || rewardMin < 0 || rewardMax < rewardMin) {
          return sendText(sock, remoteJid, "❌ Valores inválidos.", msg);
        }

        group.items[itemName] = {
          price,
          rewardMin,
          rewardMax,
          emoji: "🧩",
          description: "Item creado por admin."
        };
        saveDB();

        return sendText(sock, remoteJid, `✅ Item creado: *${itemName}*`, msg);
      }

      if (command === "edititem") {
        if (!isGroup) return sendText(sock, remoteJid, "❌ Solo para grupos.", msg);
        if (!(owner || admin)) return sendText(sock, remoteJid, "❌ Solo admins u owner.", msg);

        const [rawName, rawPrice, rawMin, rawMax] = args;
        const itemName = cleanItemName(rawName);
        const price = parseNumberSafe(rawPrice);
        const rewardMin = parseNumberSafe(rawMin);
        const rewardMax = parseNumberSafe(rawMax);

        if (!group.items[itemName]) return sendText(sock, remoteJid, "❌ Ese item no existe.", msg);
        if (!Number.isFinite(price) || !Number.isFinite(rewardMin) || !Number.isFinite(rewardMax)) {
          return sendText(sock, remoteJid, `Uso: *!edititem <nombre> <precio> <min> <max>*`, msg);
        }
        if (price <= 0 || rewardMin < 0 || rewardMax < rewardMin) {
          return sendText(sock, remoteJid, "❌ Valores inválidos.", msg);
        }

        group.items[itemName].price = price;
        group.items[itemName].rewardMin = rewardMin;
        group.items[itemName].rewardMax = rewardMax;
        saveDB();

        return sendText(sock, remoteJid, `🛠️ Item *${itemName}* editado.`, msg);
      }

      if (command === "deleteitem") {
        if (!isGroup) return sendText(sock, remoteJid, "❌ Solo para grupos.", msg);
        if (!(owner || admin)) return sendText(sock, remoteJid, "❌ Solo admins u owner.", msg);

        const itemName = cleanItemName(args[0]);
        if (!itemName) return sendText(sock, remoteJid, `Uso: *!deleteitem <nombre>*`, msg);
        if (!group.items[itemName]) return sendText(sock, remoteJid, "❌ Ese item no existe.", msg);

        delete group.items[itemName];
        saveDB();

        return sendText(sock, remoteJid, `🗑️ Item *${itemName}* eliminado.`, msg);
      }

      if (command === "setdesc") {
        if (!isGroup) return sendText(sock, remoteJid, "❌ Solo para grupos.", msg);
        if (!(owner || admin)) return sendText(sock, remoteJid, "❌ Solo admins u owner.", msg);

        const itemName = cleanItemName(args[0]);
        const description = args.slice(1).join(" ").trim();

        if (!itemName || !description) {
          return sendText(sock, remoteJid, `Uso: *!setdesc <item> <descripcion>*`, msg);
        }
        if (!group.items[itemName]) return sendText(sock, remoteJid, "❌ Ese item no existe.", msg);

        group.items[itemName].description = description;
        saveDB();

        return sendText(sock, remoteJid, `📝 Descripción actualizada para *${itemName}*`, msg);
      }

      if (command === "setemoji") {
        if (!isGroup) return sendText(sock, remoteJid, "❌ Solo para grupos.", msg);
        if (!(owner || admin)) return sendText(sock, remoteJid, "❌ Solo admins u owner.", msg);

        const itemName = cleanItemName(args[0]);
        const emoji = args[1];

        if (!itemName || !emoji) {
          return sendText(sock, remoteJid, `Uso: *!setemoji <item> <emoji>*`, msg);
        }
        if (!group.items[itemName]) {
          return sendText(sock, remoteJid, "❌ Ese item no existe.", msg);
        }

        group.items[itemName].emoji = emoji;
        saveDB();

        return sendText(sock, remoteJid, `🎨 Emoji de *${itemName}* cambiado a ${emoji}`, msg);
      }

      if (command === "roulette" || command === "ruleta") {
        const amount = parseNumberSafe(args[0]);
        const choice = parseRouletteBet(args[1]);

        if (!Number.isFinite(amount) || amount <= 0 || !choice) {
          return sendText(sock, remoteJid, `Uso: *!roulette <cantidad> <rojo|negro|par|impar>*`, msg);
        }
        if (user.wallet < amount) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero para apostar.", msg);
        }

        await casinoAnimation(sock, remoteJid, msg, "RULETA", [
          "🎡 Girando...",
          "🎡 Más rápido...",
          "🎡 Cae la bola..."
        ]);

        const number = randomInt(0, 36);
        const color = rouletteColor(number);
        const parity = number === 0 ? "ninguno" : number % 2 === 0 ? "par" : "impar";
        let win = false;

        if (choice === color) win = true;
        if (choice === parity) win = true;

        user.wallet -= amount;

        if (win) {
          const reward = amount * 2;
          user.wallet += reward;
          user.stats.rouletteWin += 1;
          addXp(user, randomInt(12, 20));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🎰 *RULETA*\n🎯 Salió: *${number} (${color})*\n✅ Apuesta: *${choice}*\n💸 Ganaste neto *${fmtUSD(reward - amount)}*`,
            msg
          );
        } else {
          user.stats.rouletteLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🎰 *RULETA*\n🎯 Salió: *${number} (${color})*\n❌ Apuesta: *${choice}*\n💥 Perdiste *${fmtUSD(amount)}*`,
            msg
          );
        }
      }

      if (command === "cf") {
        const amount = parseNumberSafe(args[0]);
        const side = String(args[1] || "").toLowerCase();

        if (!Number.isFinite(amount) || amount <= 0 || !["cara", "cruz"].includes(side)) {
          return sendText(sock, remoteJid, `Uso: *!cf <cantidad> <cara|cruz>*`, msg);
        }
        if (user.wallet < amount) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero para apostar.", msg);
        }

        await casinoAnimation(sock, remoteJid, msg, "CARA O CRUZ", [
          "🪙 Lanzando...",
          "🪙 Girando...",
          "🪙 Cae la moneda..."
        ]);

        const result = Math.random() < 0.5 ? "cara" : "cruz";
        user.wallet -= amount;

        if (side === result) {
          const reward = amount * 2;
          user.wallet += reward;
          user.stats.cfWin += 1;
          addXp(user, randomInt(10, 18));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🪙 *CARA O CRUZ*\n🎯 Elegiste: *${side}*\n🪙 Cayó: *${result}*\n✅ Ganaste neto *${fmtUSD(reward - amount)}*`,
            msg
          );
        } else {
          user.stats.cfLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🪙 *CARA O CRUZ*\n🎯 Elegiste: *${side}*\n🪙 Cayó: *${result}*\n❌ Perdiste *${fmtUSD(amount)}*`,
            msg
          );
        }
      }

      if (command === "slots") {
        const bet = parseNumberSafe(args[0]);
        if (!Number.isFinite(bet) || bet <= 0) {
          return sendText(sock, remoteJid, `Uso: *!slots <cantidad>*`, msg);
        }
        if (user.wallet < bet) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero.", msg);
        }

        await casinoAnimation(sock, remoteJid, msg, "SLOTS", [
          "🍒 │ 💎 │ 🔥",
          "7️⃣ │ 🍋 │ 💎",
          "💎 │ 7️⃣ │ 🍒"
        ]);

        const symbols = ["🍒", "🍋", "💎", "🔥", "7️⃣"];
        const roll = [pick(symbols), pick(symbols), pick(symbols)];
        user.wallet -= bet;

        if (roll[0] === roll[1] && roll[1] === roll[2]) {
          const mult = roll[0] === "7️⃣" ? 5 : 3;
          const reward = bet * mult;
          user.wallet += reward;
          user.stats.slotsWin += 1;
          addXp(user, randomInt(16, 24));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🎰 *SLOTS*\n${roll.join(" │ ")}\n🔥 Te salió jackpot\n💵 Ganaste neto *${fmtUSD(reward - bet)}*`,
            msg
          );
        } else {
          user.stats.slotsLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🎰 *SLOTS*\n${roll.join(" │ ")}\n💀 Esta vez te bajaron *${fmtUSD(bet)}*`,
            msg
          );
        }
      }

      if (command === "dice") {
        const bet = parseNumberSafe(args[0]);
        if (!Number.isFinite(bet) || bet <= 0) {
          return sendText(sock, remoteJid, `Uso: *!dice <cantidad>*`, msg);
        }
        if (user.wallet < bet) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero.", msg);
        }

        await casinoAnimation(sock, remoteJid, msg, "DICE", [
          "🎲 Tirando dados...",
          "🎲 Rebotando...",
          "🎲 Resultado..."
        ]);

        const playerRoll = randomInt(1, 6);
        const botRoll = randomInt(1, 6);
        user.wallet -= bet;

        if (playerRoll > botRoll) {
          const reward = bet * 2;
          user.wallet += reward;
          user.stats.diceWin += 1;
          addXp(user, randomInt(10, 18));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🎲 *DICE*\n👤 Tú: ${playerRoll}\n🤖 ${db.botName}: ${botRoll}\n✅ Ganaste neto *${fmtUSD(reward - bet)}*`,
            msg
          );
        }

        if (playerRoll === botRoll) {
          user.wallet += bet;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🎲 *DICE*\n👤 Tú: ${playerRoll}\n🤖 ${db.botName}: ${botRoll}\n🤝 Empate. Recuperaste tu apuesta.`,
            msg
          );
        }

        user.stats.diceLose += 1;
        saveDB();

        return sendText(
          sock,
          remoteJid,
          `🎲 *DICE*\n👤 Tú: ${playerRoll}\n🤖 ${db.botName}: ${botRoll}\n❌ Perdiste *${fmtUSD(bet)}*`,
          msg
        );
      }

      if (command === "bj") {
        const amount = parseNumberSafe(args[0]);
        if (!Number.isFinite(amount) || amount <= 0) {
          return sendText(sock, remoteJid, `Uso: *!bj <cantidad>*`, msg);
        }
        if (user.wallet < amount) {
          return sendText(sock, remoteJid, "❌ No tienes suficiente dinero para blackjack.", msg);
        }
        if (user.blackjack?.active) {
          return sendText(sock, remoteJid, "🃏 Ya tienes una partida activa. Usa *!hit* o *!stand*.", msg);
        }

        const deck = buildDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        user.blackjack = {
          active: true,
          bet: amount,
          deck,
          playerHand,
          dealerHand
        };
        saveDB();

        const playerTotal = handTotal(playerHand);
        const dealerShown = `${dealerHand[0].rank}${dealerHand[0].suit} ??`;

        return sendText(
          sock,
          remoteJid,
          [
            `🃏 *BLACKJACK INICIADO*`,
            `💵 Apuesta: ${fmtUSD(amount)}`,
            ``,
            `👤 Tu mano: ${renderHand(playerHand)} (*${playerTotal}*)`,
            `🤖 Dealer: ${dealerShown}`,
            ``,
            `Usa *!hit* o *!stand*`
          ].join("\n"),
          msg
        );
      }

      if (command === "hit") {
        if (!user.blackjack?.active) {
          return sendText(sock, remoteJid, "❌ No tienes una partida activa de blackjack.", msg);
        }

        const game = user.blackjack;
        game.playerHand.push(game.deck.pop());
        const total = handTotal(game.playerHand);

        if (total > 21) {
          user.wallet -= game.bet;
          user.stats.bjLose += 1;
          user.blackjack = null;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🃏 *BLACKJACK*\n👤 Tu mano: ${renderHand(game.playerHand)} (*${total}*)\n💥 Te pasaste de 21\n❌ Perdiste *${fmtUSD(game.bet)}*`,
            msg
          );
        }

        saveDB();
        return sendText(
          sock,
          remoteJid,
          `🃏 *BLACKJACK*\n👤 Tu mano: ${renderHand(game.playerHand)} (*${total}*)\n🤖 Dealer: ${game.dealerHand[0].rank}${game.dealerHand[0].suit} ??`,
          msg
        );
      }

      if (command === "stand") {
        if (!user.blackjack?.active) {
          return sendText(sock, remoteJid, "❌ No tienes una partida activa de blackjack.", msg);
        }

        const game = user.blackjack;
        const playerTotal = handTotal(game.playerHand);

        while (handTotal(game.dealerHand) < 17) {
          game.dealerHand.push(game.deck.pop());
        }

        const dealerTotal = handTotal(game.dealerHand);
        const lines = [
          `🃏 *BLACKJACK RESULTADO*`,
          `👤 Tu mano: ${renderHand(game.playerHand)} (*${playerTotal}*)`,
          `🤖 Dealer: ${renderHand(game.dealerHand)} (*${dealerTotal}*)`,
          ``
        ];

        user.wallet -= game.bet;

        if (dealerTotal > 21 || playerTotal > dealerTotal) {
          user.wallet += game.bet * 2;
          user.stats.bjWin += 1;
          addXp(user, randomInt(14, 24));
          lines.push(`✅ Ganaste neto *${fmtUSD(game.bet)}*`);
        } else if (playerTotal === dealerTotal) {
          user.wallet += game.bet;
          lines.push(`🤝 Empate. Recuperaste tu apuesta.`);
        } else {
          user.stats.bjLose += 1;
          lines.push(`❌ Perdiste *${fmtUSD(game.bet)}*`);
        }

        user.blackjack = null;
        saveDB();

        return sendText(sock, remoteJid, lines.join("\n"), msg);
      }

      if (command === "rps") {
        const userChoice = String(args[0] || "").toLowerCase();
        const choices = {
          piedra: "🪨",
          papel: "📄",
          tijera: "✂️"
        };

        if (!choices[userChoice]) {
          return sendText(sock, remoteJid, `Uso: *!rps <piedra|papel|tijera>*`, msg);
        }

        const botChoice = pick(Object.keys(choices));

        if (userChoice === botChoice) {
          saveDB();
          return sendText(
            sock,
            remoteJid,
            `✂️ *RPS*\nTú: ${choices[userChoice]} ${userChoice}\n${db.botName}: ${choices[botChoice]} ${botChoice}\n🤝 Empate`,
            msg
          );
        }

        const wins =
          (userChoice === "piedra" && botChoice === "tijera") ||
          (userChoice === "papel" && botChoice === "piedra") ||
          (userChoice === "tijera" && botChoice === "papel");

        if (wins) {
          const gain = randomInt(400, 1200);
          user.wallet += gain;
          user.stats.rpsWin += 1;
          addXp(user, randomInt(8, 15));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `✂️ *RPS*\nTú: ${choices[userChoice]} ${userChoice}\n${db.botName}: ${choices[botChoice]} ${botChoice}\n✅ Ganaste *${fmtUSD(gain)}*`,
            msg
          );
        } else {
          const loss = Math.min(user.wallet, randomInt(250, 700));
          user.wallet -= loss;
          user.stats.rpsLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `✂️ *RPS*\nTú: ${choices[userChoice]} ${userChoice}\n${db.botName}: ${choices[botChoice]} ${botChoice}\n❌ Perdiste *${fmtUSD(loss)}*`,
            msg
          );
        }
      }

      if (command === "roll") {
        const value = randomInt(1, 100);
        return sendText(sock, remoteJid, `🎲 Tiraste el dado del caos y sacaste *${value}*`, msg);
      }

      if (command === "8ball") {
        const question = args.join(" ").trim();
        if (!question) {
          return sendText(sock, remoteJid, `Uso: *!8ball <pregunta>*`, msg);
        }

        return sendText(
          sock,
          remoteJid,
          `🎱 *8BALL*\n❓ ${question}\n🔮 ${pick(PHRASES.eightBall)}`,
          msg
        );
      }

      if (command === "treasure") {
        const cd = checkCooldown(user, "treasure");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `🗺️ Espera ${formatMs(cd.remaining)} para buscar otro tesoro.`, msg);
        }

        const success = Math.random() < 0.6;

        if (success) {
          const gain = randomInt(3000, 9000);
          user.wallet += gain;
          user.stats.treasureWin += 1;
          addXp(user, randomInt(12, 22));
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🗺️ ${pick(PHRASES.treasureWin)}\n💰 Ganaste *${fmtUSD(gain)}*`,
            msg
          );
        } else {
          const loss = Math.min(user.wallet, randomInt(600, 1800));
          user.wallet -= loss;
          user.stats.treasureLose += 1;
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `🕳️ ${pick(PHRASES.treasureLose)}\n❌ Perdiste *${fmtUSD(loss)}*`,
            msg
          );
        }
      }

      if (command === "meme") {
        return sendText(sock, remoteJid, pick(PHRASES.memes), msg);
      }

      if (command === "rate") {
        const thing = args.join(" ").trim();
        if (!thing) {
          return sendText(sock, remoteJid, `Uso: *!rate <algo>*`, msg);
        }

        return sendText(sock, remoteJid, `📊 Yo le doy a *${thing}* un *${randomRate()}/100*`, msg);
      }

      if (command === "pick") {
        const joined = args.join(" ").trim();
        if (!joined.includes("|")) {
          return sendText(sock, remoteJid, `Uso: *!pick opcion1 | opcion2 | opcion3*`, msg);
        }

        const options = joined.split("|").map(x => x.trim()).filter(Boolean);
        if (options.length < 2) {
          return sendText(sock, remoteJid, "❌ Pon al menos dos opciones.", msg);
        }

        return sendText(sock, remoteJid, `🧠 Mi elección brutal fue: *${pick(options)}*`, msg);
      }

      if (command === "duel") {
        if (!isGroup) {
          return sendText(sock, remoteJid, "⚔️ Los duelos son para grupos.", msg);
        }

        const targetId = resolveTargetUserId(msg, senderId, rawText);
        const amount = parseNumberSafe(args[args.length - 1]);

        if (targetId === senderId) {
          return sendText(sock, remoteJid, "❌ No puedes retarte a ti mismo.", msg);
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          return sendText(sock, remoteJid, `Uso: *!duel @usuario <cantidad>*`, msg);
        }

        const targetUser = ensureUser(targetId);
        if (user.wallet < amount) {
          return sendText(sock, remoteJid, "❌ No tienes dinero suficiente para apostar ese duelo.", msg);
        }
        if (targetUser.wallet < amount) {
          return sendText(sock, remoteJid, "❌ El otro usuario no tiene dinero suficiente para aceptar.", msg);
        }

        pendingDuels.set(targetId, {
          challenger: senderId,
          amount,
          groupId: remoteJid,
          createdAt: now()
        });

        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);
        const senderLabel = await mentionLabel(sock, senderId, remoteJid, msg);

        return sendText(
          sock,
          remoteJid,
          `⚔️ *DUEL REQUEST*\n${senderLabel} retó a ${targetLabel}\n💵 Apuesta: *${fmtUSD(amount)}*\n\nResponde con *!accept* o *!decline*`,
          msg,
          uniqMentions([senderId, targetId])
        );
      }

      if (command === "heist") {
        if (!isGroup) {
          return sendText(sock, remoteJid, "💣 Los heists son para grupos.", msg);
        }

        const cd = checkCooldown(user, "heist");
        if (!cd.ok) {
          return sendText(sock, remoteJid, `⏳ Espera ${formatMs(cd.remaining)} para iniciar otro heist.`, msg);
        }

        const targetId = resolveTargetUserId(msg, senderId, rawText);
        if (targetId === senderId) {
          return sendText(sock, remoteJid, "❌ No puedes invitarte a ti mismo.", msg);
        }

        const partner = ensureUser(targetId);
        if (user.wallet < 3000 || partner.wallet < 3000) {
          return sendText(sock, remoteJid, "❌ Ambos necesitan al menos $3,000 USD en wallet para entrar al heist.", msg);
        }

        pendingHeists.set(targetId, {
          host: senderId,
          groupId: remoteJid,
          createdAt: now()
        });

        const senderLabel = await mentionLabel(sock, senderId, remoteJid, msg);
        const targetLabel = await mentionLabel(sock, targetId, remoteJid, msg);

        return sendText(
          sock,
          remoteJid,
          `💣 *HEIST INVITATION*\n${senderLabel} quiere hacer un golpe con ${targetLabel}\n\nResponde con *!accept* o *!decline*`,
          msg,
          uniqMentions([senderId, targetId])
        );
      }

      if (command === "accept") {
        const duel = pendingDuels.get(senderId);
        if (duel) {
          if (duel.groupId !== remoteJid) {
            return sendText(sock, remoteJid, "❌ Ese duelo pertenece a otro grupo.", msg);
          }
          if (now() - duel.createdAt > 120000) {
            pendingDuels.delete(senderId);
            return sendText(sock, remoteJid, "⌛ Ese duelo expiró.", msg);
          }

          const challengerId = duel.challenger;
          const amount = duel.amount;
          const challenger = ensureUser(challengerId);
          const acceptor = ensureUser(senderId);

          if (challenger.wallet < amount || acceptor.wallet < amount) {
            pendingDuels.delete(senderId);
            return sendText(sock, remoteJid, "❌ Uno de los dos ya no tiene suficiente dinero.", msg);
          }

          challenger.wallet -= amount;
          acceptor.wallet -= amount;

          const winnerId = Math.random() < 0.5 ? challengerId : senderId;
          const loserId = winnerId === challengerId ? senderId : challengerId;
          const winner = ensureUser(winnerId);
          const loser = ensureUser(loserId);

          winner.wallet += amount * 2;
          winner.stats.duelWin += 1;
          loser.stats.duelLose += 1;
          addXp(winner, randomInt(20, 35));

          const winnerLabel = await mentionLabel(sock, winnerId, remoteJid, msg);
          const loserLabel = await mentionLabel(sock, loserId, remoteJid, msg);

          pendingDuels.delete(senderId);
          saveDB();

          return sendText(
            sock,
            remoteJid,
            `⚔️ *DUEL RESULTADO*\n🏆 Ganador: ${winnerLabel}\n💀 Perdedor: ${loserLabel}\n💵 Premio: *${fmtUSD(amount * 2)}*`,
            msg,
            uniqMentions([winnerId, loserId])
          );
        }

        const heist = pendingHeists.get(senderId);
        if (heist) {
          if (heist.groupId !== remoteJid) {
            return sendText(sock, remoteJid, "❌ Ese heist pertenece a otro grupo.", msg);
          }
          if (now() - heist.createdAt > 120000) {
            pendingHeists.delete(senderId);
            return sendText(sock, remoteJid, "⌛ Ese heist expiró.", msg);
          }

          const hostId = heist.host;
          const host = ensureUser(hostId);
          const partner = ensureUser(senderId);

          if (host.wallet < 3000 || partner.wallet < 3000) {
            pendingHeists.delete(senderId);
            return sendText(sock, remoteJid, "❌ Uno de los dos ya no tiene dinero suficiente para el golpe.", msg);
          }

          await casinoAnimation(sock, remoteJid, msg, "HEIST", [
            "💣 Planeando el golpe...",
            "🏦 Entrando por atrás...",
            "🚓 Escapando..."
          ]);

          const success = Math.random() < 0.55;

          if (success) {
            const gain1 = randomInt(5000, 12000);
            const gain2 = randomInt(5000, 12000);
            host.wallet += gain1;
            partner.wallet += gain2;
            host.stats.heistWin += 1;
            partner.stats.heistWin += 1;
            addXp(host, randomInt(20, 35));
            addXp(partner, randomInt(20, 35));

            pendingHeists.delete(senderId);
            saveDB();

            const hostLabel = await mentionLabel(sock, hostId, remoteJid, msg);
            const partnerLabel = await mentionLabel(sock, senderId, remoteJid, msg);

            return sendText(
              sock,
              remoteJid,
              `💣 *HEIST EXITOSO*\n👤 ${hostLabel} ganó *${fmtUSD(gain1)}*\n👤 ${partnerLabel} ganó *${fmtUSD(gain2)}*`,
              msg,
              uniqMentions([hostId, senderId])
            );
          } else {
            const loss1 = Math.min(host.wallet, randomInt(1500, 4000));
            const loss2 = Math.min(partner.wallet, randomInt(1500, 4000));
            host.wallet -= loss1;
            partner.wallet -= loss2;
            host.stats.heistLose += 1;
            partner.stats.heistLose += 1;

            pendingHeists.delete(senderId);
            saveDB();

            const hostLabel = await mentionLabel(sock, hostId, remoteJid, msg);
            const partnerLabel = await mentionLabel(sock, senderId, remoteJid, msg);

            return sendText(
              sock,
              remoteJid,
              `🚓 *HEIST FALLIDO*\n👤 ${hostLabel} perdió *${fmtUSD(loss1)}*\n👤 ${partnerLabel} perdió *${fmtUSD(loss2)}*`,
              msg,
              uniqMentions([hostId, senderId])
            );
          }
        }

        return sendText(sock, remoteJid, "❌ No tienes ninguna invitación pendiente.", msg);
      }

      if (command === "decline") {
        const duel = pendingDuels.get(senderId);
        if (duel) {
          const challengerLabel = await mentionLabel(sock, duel.challenger, remoteJid, msg);
          pendingDuels.delete(senderId);

          return sendText(
            sock,
            remoteJid,
            `🙅‍♂️ Duelo rechazado.\nEl reto de ${challengerLabel} fue cancelado.`,
            msg,
            uniqMentions([duel.challenger])
          );
        }

        const heist = pendingHeists.get(senderId);
        if (heist) {
          const hostLabel = await mentionLabel(sock, heist.host, remoteJid, msg);
          pendingHeists.delete(senderId);

          return sendText(
            sock,
            remoteJid,
            `🙅‍♂️ Heist rechazado.\nLa invitación de ${hostLabel} fue cancelada.`,
            msg,
            uniqMentions([heist.host])
          );
        }

        return sendText(sock, remoteJid, "❌ No tienes ninguna invitación pendiente.", msg);
      }

      return sendText(
        sock,
        remoteJid,
        `❓ Comando no reconocido.\nUsa *!menu* para ver todo.`,
        msg
      );
    } catch (err) {
      console.error("Error:", err);
    }
  });
}

startBot();