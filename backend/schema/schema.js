// backend/schema/schema.js
const {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  varchar,
} = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  isApproved: boolean('is_approved').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const sermons = pgTable('sermons', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  speaker: varchar('speaker', { length: 255 }),
  series: varchar('series', { length: 255 }),
  videoUrl: text('video_url'),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'),
  category: varchar('category', { length: 100 }),
  viewCount: integer('view_count').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  transcodedVersions: text('transcoded_versions'), // JSON string of transcoded video URLs
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const liveStreams = pgTable('live_streams', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  streamUrl: text('stream_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  isLive: boolean('is_live').notNull().default(false),
  viewerCount: integer('viewer_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  sermonId: integer('sermon_id')
    .notNull()
    .references(() => sermons.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
const usersRelations = relations(users, ({ many }) => ({
  favorites: many(favorites),
}));

const sermonsRelations = relations(sermons, ({ many }) => ({
  favorites: many(favorites),
}));

const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  sermon: one(sermons, {
    fields: [favorites.sermonId],
    references: [sermons.id],
  }),
}));

module.exports = {
  users,
  sermons,
  liveStreams,
  favorites,
  passwordResetTokens,
  usersRelations,
  sermonsRelations,
  favoritesRelations,
};
