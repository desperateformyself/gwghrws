import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Warnings / strikes per user per guild
export const warnings = sqliteTable('warnings', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  userId:      text('user_id').notNull(),
  guildId:     text('guild_id').notNull(),
  reason:      text('reason'),
  moderatorId: text('moderator_id').notNull(),
  createdAt:   text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// Active mutes (for expiry tracking)
export const mutes = sqliteTable('mutes', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    text('user_id').notNull(),
  guildId:   text('guild_id').notNull(),
  expiresAt: text('expires_at'),
  reason:    text('reason'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// Audit log of all mod actions
export const auditLog = sqliteTable('audit_log', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  guildId:     text('guild_id').notNull(),
  action:      text('action').notNull(),   // WARN | MUTE | KICK | BAN | UNBAN | UNWARN | LOCK | UNLOCK | SLOWMODE | NICKNAME
  targetId:    text('target_id').notNull(),
  moderatorId: text('moderator_id').notNull(),
  reason:      text('reason'),
  metadata:    text('metadata'),           // JSON string for extra data
  createdAt:   text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// Per-guild config (prefix, log channel, thresholds, etc.)
export const guildConfig = sqliteTable('guild_config', {
  guildId:        text('guild_id').primaryKey(),
  logChannelId:   text('log_channel_id'),
  muteRoleId:     text('mute_role_id'),
  warnThreshold:  integer('warn_threshold').default(3),  // warns before auto-ban
  automodEnabled: integer('automod_enabled').default(1), // 0 | 1
  badWords:       text('bad_words').default('[]'),       // JSON array
  updatedAt:      text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── 1. REMINDERS TABLE ───────────────────────────────────────────────────────
export const reminders = sqliteTable('reminders', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    text('user_id').notNull(),
  guildId:   text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  message:   text('message').notNull(),
  dueAt:     text('due_at').notNull(), // ISO String or timestamp
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── 2. LEVELING / XP TABLE ────────────────────────────────────────────────────
export const userXp = sqliteTable('user_xp', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  userId:        text('user_id').notNull(),
  guildId:       text('guild_id').notNull(),
  xp:            integer('xp').default(0).notNull(),
  level:         integer('level').default(0).notNull(),
  lastMessageAt: text('last_message_at'),
});

// ── 3. LEVEL ROLES TABLE ─────────────────────────────────────────────────────
export const levelRewards = sqliteTable('level_rewards', {
  id:      integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull(),
  level:   integer('level').notNull(),
  roleId:  text('role_id').notNull(),
});

// ── 4. ECONOMY TABLE ─────────────────────────────────────────────────────────
export const userEconomy = sqliteTable('user_economy', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    text('user_id').notNull(),
  guildId:   text('guild_id').notNull(),
  balance:   integer('balance').default(0).notNull(),
  bank:      integer('bank').default(0).notNull(),
  lastDaily: text('last_daily'),
  lastWork:  text('last_work'),
  lastCrime: text('last_crime'),
  lastRob:   text('last_rob'),
});

// ── 5. INVENTORY TABLE ───────────────────────────────────────────────────────
export const inventory = sqliteTable('inventory', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  userId:   text('user_id').notNull(),
  guildId:  text('guild_id').notNull(),
  itemKey:  text('item_key').notNull(),
  quantity: integer('quantity').default(1).notNull(),
});

// ── 6. CUSTOM PROFILES TABLE ──────────────────────────────────────────────────
export const userProfiles = sqliteTable('user_profiles', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  userId:        text('user_id').notNull(),
  guildId:       text('guild_id').notNull(),
  bio:           text('bio').default('No bio set yet.').notNull(),
  favoriteColor: text('favorite_color').default('#ff9ecf').notNull(),
  theme:         text('theme').default('pink').notNull(),
  reputation:    integer('reputation').default(0).notNull(),
  lastRep:       text('last_rep'),
});

// ── 7. ACHIEVEMENTS TABLE ────────────────────────────────────────────────────
export const achievements = sqliteTable('achievements', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  userId:         text('user_id').notNull(),
  guildId:        text('guild_id').notNull(),
  achievementKey: text('achievement_key').notNull(),
  unlockedAt:     text('unlocked_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── 8. PET SYSTEM TABLE ──────────────────────────────────────────────────────
export const pets = sqliteTable('pets', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  userId:     text('user_id').notNull(),
  guildId:    text('guild_id').notNull(),
  name:       text('name').notNull(),
  type:       text('type').notNull(), // e.g. cat, dog, bunny
  level:      integer('level').default(1).notNull(),
  experience: integer('experience').default(0).notNull(),
  happiness:  integer('happiness').default(100).notNull(),
  hunger:     integer('hunger').default(100).notNull(), // 100 is full, 0 is starving
  lastFed:    text('last_fed'),
  lastPlayed: text('last_played'),
  createdAt:  text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
});

// ── 9. GARDEN SYSTEM TABLE ───────────────────────────────────────────────────
export const garden = sqliteTable('garden', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  userId:        text('user_id').notNull(),
  guildId:       text('guild_id').notNull(),
  plotIndex:     integer('plot_index').notNull(),
  plantType:     text('plant_type'),
  plantedAt:     text('planted_at'),
  lastWateredAt: text('last_watered_at'),
  growthStage:   integer('growth_stage').default(0).notNull(), // 0: empty/seed, 1: sprout, 2: growing, 3: mature (ready to harvest)
});

// ── 10. FOCUS SYSTEM TABLE ───────────────────────────────────────────────────
export const focusSessions = sqliteTable('focus_sessions', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  userId:         text('user_id').notNull(),
  guildId:        text('guild_id').notNull(),
  startTime:      text('start_time'), // ISO string if active, null otherwise
  totalFocusTime: integer('total_focus_time').default(0).notNull(), // in minutes
});

// ── 11. FORTUNE SYSTEM TABLE ─────────────────────────────────────────────────
export const userFortunes = sqliteTable('user_fortunes', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  userId:         text('user_id').notNull(),
  guildId:        text('guild_id').notNull(),
  lastFortune:    text('last_fortune'), // YYYY-MM-DD
  luckPercentage: integer('luck_percentage').default(50).notNull(),
  fortuneText:    text('fortune_text').notNull(),
});
