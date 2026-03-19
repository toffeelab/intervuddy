import { relations, sql } from 'drizzle-orm';
import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ─── users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── accounts ────────────────────────────────────────────────────────────────

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    type: text('type').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
  },
  (table) => [
    uniqueIndex('accounts_provider_account_unique').on(table.provider, table.providerAccountId),
  ]
);

// ─── verificationTokens ───────────────────────────────────────────────────────

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').unique().notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ─── jobDescriptions ─────────────────────────────────────────────────────────

export const jobDescriptions = pgTable('job_descriptions', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  positionTitle: text('position_title').notNull(),
  status: text('status').notNull().default('in_progress'),
  memo: text('memo'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── interviewCategories ──────────────────────────────────────────────────────

export const interviewCategories = pgTable('interview_categories', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  jdId: integer('jd_id').references(() => jobDescriptions.id, { onDelete: 'cascade' }),
  sourceCategoryId: integer('source_category_id').references(
    (): AnyPgColumn => interviewCategories.id,
    { onDelete: 'set null' }
  ),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  displayLabel: text('display_label').notNull(),
  icon: text('icon').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── interviewQuestions ───────────────────────────────────────────────────────

export const interviewQuestions = pgTable('interview_questions', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => interviewCategories.id, { onDelete: 'cascade' }),
  jdId: integer('jd_id').references(() => jobDescriptions.id, { onDelete: 'cascade' }),
  originQuestionId: integer('origin_question_id').references(
    (): AnyPgColumn => interviewQuestions.id,
    { onDelete: 'set null' }
  ),
  question: text('question').notNull(),
  answer: text('answer').notNull().default(''),
  tip: text('tip'),
  keywords: text('keywords')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  displayOrder: integer('display_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── followupQuestions ────────────────────────────────────────────────────────

export const followupQuestions = pgTable('followup_questions', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  questionId: integer('question_id')
    .notNull()
    .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  jobDescriptions: many(jobDescriptions),
  interviewCategories: many(interviewCategories),
  interviewQuestions: many(interviewQuestions),
  followupQuestions: many(followupQuestions),
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const jobDescriptionsRelations = relations(jobDescriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [jobDescriptions.userId],
    references: [users.id],
  }),
  interviewCategories: many(interviewCategories),
  interviewQuestions: many(interviewQuestions),
}));

export const interviewCategoriesRelations = relations(interviewCategories, ({ one, many }) => ({
  user: one(users, {
    fields: [interviewCategories.userId],
    references: [users.id],
  }),
  jobDescription: one(jobDescriptions, {
    fields: [interviewCategories.jdId],
    references: [jobDescriptions.id],
  }),
  sourceCategory: one(interviewCategories, {
    fields: [interviewCategories.sourceCategoryId],
    references: [interviewCategories.id],
    relationName: 'categorySource',
  }),
  derivedCategories: many(interviewCategories, {
    relationName: 'categorySource',
  }),
  interviewQuestions: many(interviewQuestions),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one, many }) => ({
  user: one(users, {
    fields: [interviewQuestions.userId],
    references: [users.id],
  }),
  category: one(interviewCategories, {
    fields: [interviewQuestions.categoryId],
    references: [interviewCategories.id],
  }),
  jobDescription: one(jobDescriptions, {
    fields: [interviewQuestions.jdId],
    references: [jobDescriptions.id],
  }),
  originQuestion: one(interviewQuestions, {
    fields: [interviewQuestions.originQuestionId],
    references: [interviewQuestions.id],
    relationName: 'questionOrigin',
  }),
  derivedQuestions: many(interviewQuestions, {
    relationName: 'questionOrigin',
  }),
  followupQuestions: many(followupQuestions),
}));

export const followupQuestionsRelations = relations(followupQuestions, ({ one }) => ({
  user: one(users, {
    fields: [followupQuestions.userId],
    references: [users.id],
  }),
  question: one(interviewQuestions, {
    fields: [followupQuestions.questionId],
    references: [interviewQuestions.id],
  }),
}));

// ─── Schema export ────────────────────────────────────────────────────────────

export const schema = {
  users,
  accounts,
  verificationTokens,
  jobDescriptions,
  interviewCategories,
  interviewQuestions,
  followupQuestions,
  usersRelations,
  accountsRelations,
  jobDescriptionsRelations,
  interviewCategoriesRelations,
  interviewQuestionsRelations,
  followupQuestionsRelations,
};
