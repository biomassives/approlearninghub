const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const crypto = require('crypto');

// Use the centrally‑configured client (with SERVICE_ROLE_KEY)
const supabase = require('./supabaseClient');

const INVITES_FILE = path.resolve(process.cwd(), 'data/translation-invites.json');
const SUGGESTION_FILE = path.resolve(process.cwd(), 'data/translation-suggestions.json');

const translationCache = new Map();
const CACHE_TTL = 3600000;
const cacheTimestamps = new Map();

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function storeInvite({ email, lang, key, referrer }) {
  if (!email || !lang || !key || !referrer) throw new Error('Missing required fields');

  const token = generateToken();
  const invite = { token, email, lang, key, referrer, createdAt: new Date().toISOString(), accepted: false };

  const existing = fssync.existsSync(INVITES_FILE)
    ? JSON.parse(await fs.readFile(INVITES_FILE, 'utf8'))
    : [];

  existing.push(invite);
  await fs.writeFile(INVITES_FILE, JSON.stringify(existing, null, 2));

  return { success: true, token };
}

async function verifyInvite(token) {
  const invites = fssync.existsSync(INVITES_FILE)
    ? JSON.parse(await fs.readFile(INVITES_FILE, 'utf8'))
    : [];

  const invite = invites.find(i => i.token === token && !i.accepted);
  if (!invite) throw new Error('Invalid or expired invite');

  return invite;
}

async function acceptInvite(token) {
  const invites = fssync.existsSync(INVITES_FILE)
    ? JSON.parse(await fs.readFile(INVITES_FILE, 'utf8'))
    : [];

  const inviteIndex = invites.findIndex(i => i.token === token);
  if (inviteIndex === -1) throw new Error('Invalid invite token');

  invites[inviteIndex].accepted = true;
  invites[inviteIndex].acceptedAt = new Date().toISOString();

  await fs.writeFile(INVITES_FILE, JSON.stringify(invites, null, 2));
  return { success: true, message: 'Invite accepted', invite: invites[inviteIndex] };
}

async function getLocalTranslations(langCode) {
  try {
    const filePath = path.resolve(__dirname, '..', 'data', 'translations', `${langCode}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function getTranslationsFromDB(langCode) {
  if (translationCache.has(langCode)) {
    const timestamp = cacheTimestamps.get(langCode);
    if (timestamp && Date.now() - timestamp < CACHE_TTL) {
      return translationCache.get(langCode);
    }
  }

  const { data, error } = await supabase
    .from('translations')
    .select('key, translation')
    .eq('language', langCode);

  if (error) throw error;

  const translationObj = {};
  for (const item of data) {
    if (!item.key || typeof item.translation !== 'string') continue;

    const keyParts = item.key.split('.');
    let current = translationObj;
    for (let i = 0; i < keyParts.length - 1; i++) {
      current[keyParts[i]] = current[keyParts[i]] || {};
      current = current[keyParts[i]];
    }
    current[keyParts[keyParts.length - 1]] = item.translation;
  }

  translationCache.set(langCode, translationObj);
  cacheTimestamps.set(langCode, Date.now());
  return translationObj;
}

function mergeTranslations(dbTranslations, localTranslations) {
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
  return deepMerge({ ...localTranslations }, dbTranslations);
}

module.exports = {
  storeInvite,
  acceptInvite,
  verifyInvite,
  getLocalTranslations,
  getTranslationsFromDB,
  mergeTranslations
};
