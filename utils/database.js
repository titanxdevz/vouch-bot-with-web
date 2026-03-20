
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'vouch.db'));
db.pragma('journal_mode = WAL');

const query = (sql, method = 'get') => {
  const stmt = db.prepare(sql);
  const fn = (...args) => stmt[method](...args);
  fn.run = (...args) => stmt.run(...args);
  fn.get = (...args) => stmt.get(...args);
  fn.all = (...args) => stmt.all(...args);
  return fn;
};

db.exec(`
  CREATE TABLE IF NOT EXISTS vouches ( id INTEGER PRIMARY KEY AUTOINCREMENT, receiver_id TEXT NOT NULL, giver_id TEXT NOT NULL, guild_id TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 5, comment TEXT, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')) );
  CREATE TABLE IF NOT EXISTS guild_settings ( guild_id TEXT PRIMARY KEY, vouch_channel_id TEXT, log_channel_id TEXT, min_account_age_days INTEGER DEFAULT 0, min_server_age_days INTEGER DEFAULT 0, require_comment INTEGER DEFAULT 0, vouch_cooldown_hours INTEGER DEFAULT 0, max_vouches_per_day INTEGER DEFAULT 0, allowed_roles TEXT DEFAULT '[]', blocked_roles TEXT DEFAULT '[]', auto_roles TEXT DEFAULT '{}',
    prefix TEXT,
    setup_by TEXT, setup_at INTEGER );
  CREATE TABLE IF NOT EXISTS blacklist ( user_id TEXT NOT NULL, guild_id TEXT NOT NULL, reason TEXT, blacklisted_by TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')), PRIMARY KEY (user_id, guild_id) );
  CREATE TABLE IF NOT EXISTS vouch_cooldowns ( giver_id TEXT NOT NULL, receiver_id TEXT NOT NULL, guild_id TEXT NOT NULL, last_vouch INTEGER NOT NULL, PRIMARY KEY (giver_id, receiver_id, guild_id) );
  CREATE TABLE IF NOT EXISTS daily_counts ( giver_id TEXT NOT NULL, guild_id TEXT NOT NULL, date TEXT NOT NULL, count INTEGER DEFAULT 0, PRIMARY KEY (giver_id, guild_id, date) );
`);

const Vouches = {
  add: query('INSERT INTO vouches (receiver_id, giver_id, guild_id, rating, comment) VALUES (?, ?, ?, ?, ?)', 'run'),
  get: query('SELECT * FROM vouches WHERE id = ?', 'get'),
  getStats: (userId, guildId) => {
    const sql = guildId
      ? 'SELECT COUNT(*) as total, AVG(rating) as average FROM vouches WHERE receiver_id = ? AND guild_id = ?'
      : 'SELECT COUNT(*) as total, AVG(rating) as average FROM vouches WHERE receiver_id = ?';
    const params = guildId ? [userId, guildId] : [userId];
    const result = db.prepare(sql).get(params);
    return { total: result.total || 0, average: result.average || 0 };
  },
  getRecent: (userId, guildId, limit) => {
    const sql = guildId
      ? 'SELECT * FROM vouches WHERE receiver_id = ? AND guild_id = ? ORDER BY created_at DESC LIMIT ?'
      : 'SELECT * FROM vouches WHERE receiver_id = ? ORDER BY created_at DESC LIMIT ?';
    const params = guildId ? [userId, guildId, limit] : [userId, limit];
    return db.prepare(sql).all(params);
  },
  getRatingDistribution: (userId, guildId) => {
    const sql = guildId
      ? 'SELECT rating, COUNT(*) as count FROM vouches WHERE receiver_id = ? AND guild_id = ? GROUP BY rating'
      : 'SELECT rating, COUNT(*) as count FROM vouches WHERE receiver_id = ? GROUP BY rating';
    const params = guildId ? [userId, guildId] : [userId];
    const results = db.prepare(sql).all(params);
    const distribution = [{rating: 5, count: 0}, {rating: 4, count: 0}, {rating: 3, count: 0}, {rating: 2, count: 0}, {rating: 1, count: 0}];
    results.forEach(row => {
        const distItem = distribution.find(d => d.rating === row.rating);
        if(distItem) distItem.count = row.count;
    });
    return distribution;
  },
  getCount: (userId, type, guildId) => {
    const userField = type === 'received' ? 'receiver_id' : 'giver_id';
    const sql = guildId
      ? `SELECT COUNT(*) as count FROM vouches WHERE ${userField} = ? AND guild_id = ?`
      : `SELECT COUNT(*) as count FROM vouches WHERE ${userField} = ?`;
    const params = guildId ? [userId, guildId] : [userId];
    return db.prepare(sql).get(params).count;
  },
  getPage: (userId, type, guildId, page, limit) => {
    const userField = type === 'received' ? 'receiver_id' : 'giver_id';
    const sql = guildId
      ? `SELECT * FROM vouches WHERE ${userField} = ? AND guild_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      : `SELECT * FROM vouches WHERE ${userField} = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const params = guildId ? [userId, guildId, limit, page * limit] : [userId, limit, page * limit];
    return db.prepare(sql).all(params);
  },
  getLeaderboard: (guildId, limit) => {
    const sql = guildId
      ? 'SELECT receiver_id, COUNT(*) as total_vouches, AVG(rating) as average_rating FROM vouches WHERE guild_id = ? GROUP BY receiver_id ORDER BY total_vouches DESC LIMIT ?'
      : 'SELECT receiver_id, COUNT(*) as total_vouches, AVG(rating) as average_rating FROM vouches GROUP BY receiver_id ORDER BY total_vouches DESC LIMIT ?';
    const params = guildId ? [guildId, limit] : [limit];
    return db.prepare(sql).all(params);
  },
  remove: query('DELETE FROM vouches WHERE id = ?', 'run'),
  reset: query('DELETE FROM vouches WHERE receiver_id = ? AND guild_id = ?', 'run'),
  countAll: query('SELECT COUNT(*) as count FROM vouches', 'get'),
  countSince: query('SELECT COUNT(*) as count FROM vouches WHERE created_at > ?', 'get'),
  getTopGuilds: query('SELECT guild_id, COUNT(*) as vouch_count FROM vouches GROUP BY guild_id ORDER BY vouch_count DESC LIMIT ?', 'all'),
};

const GuildSettings = {
  ensure: (guildId) => {
    db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)').run(guildId);
    const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    settings.allowed_roles = JSON.parse(settings.allowed_roles || '[]');
    settings.blocked_roles = JSON.parse(settings.blocked_roles || '[]');
    settings.auto_roles = JSON.parse(settings.auto_roles || '{}');
    return settings;
  },
  set: query('UPDATE guild_settings SET vouch_channel_id = ?, log_channel_id = ?, min_account_age_days = ?, min_server_age_days = ?, require_comment = ?, vouch_cooldown_hours = ?, max_vouches_per_day = ?, allowed_roles = ?, blocked_roles = ?, auto_roles = ?, setup_by = ?, setup_at = ? WHERE guild_id = ?', 'run'),
  update: (guildId, key, value) => db.prepare(`UPDATE guild_settings SET ${key} = ? WHERE guild_id = ?`).run(value, guildId),
};

const Blacklist = {
  get: query('SELECT * FROM blacklist WHERE user_id = ? AND guild_id = ?', 'get'),
  add: query('INSERT OR REPLACE INTO blacklist (user_id, guild_id, reason, blacklisted_by) VALUES (?, ?, ?, ?)', 'run'),
  remove: query('DELETE FROM blacklist WHERE user_id = ? AND guild_id = ?', 'run'),
  list: query('SELECT * FROM blacklist WHERE guild_id = ? LIMIT ? OFFSET ?', 'all'),
  count: query('SELECT COUNT(*) as count FROM blacklist WHERE guild_id = ?', 'get'),
};

const Cooldowns = {
  get: query('SELECT * FROM vouch_cooldowns WHERE giver_id = ? AND receiver_id = ? AND guild_id = ?', 'get'),
  set: query('INSERT OR REPLACE INTO vouch_cooldowns (giver_id, receiver_id, guild_id, last_vouch) VALUES (?, ?, ?, strftime(\'%s\',\'now\'))', 'run'),
  getAllForGiver: query('SELECT * FROM vouch_cooldowns WHERE giver_id = ? AND guild_id = ?', 'all'),
};

const DailyCounts = {
  get: query('SELECT * FROM daily_counts WHERE giver_id = ? AND guild_id = ? AND date = ?', 'get'),
  increment: query('INSERT INTO daily_counts (giver_id, guild_id, date, count) VALUES (?, ?, ?, 1) ON CONFLICT(giver_id, guild_id, date) DO UPDATE SET count = count + 1', 'run'),
};

module.exports = { db, Vouches, GuildSettings, Blacklist, Cooldowns, DailyCounts };
