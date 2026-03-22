import { relations, sql } from 'drizzle-orm';
import {
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
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
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    type: text('type').notNull(),
    access_token: text('access_token'),
    refresh_token: text('refresh_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
  jdId: text('jd_id').references(() => jobDescriptions.id, { onDelete: 'cascade' }),
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => interviewCategories.id, { onDelete: 'cascade' }),
  jdId: text('jd_id').references(() => jobDescriptions.id, { onDelete: 'cascade' }),
  originQuestionId: text('origin_question_id').references(
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
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  questionId: text('question_id')
    .notNull()
    .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── interviewSessions ──────────────────────────────────────────────────────

export const interviewSessions = pgTable('interview_sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  status: text('status').notNull().default('waiting'),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  qaOwnerId: text('qa_owner_id').references(() => users.id, { onDelete: 'set null' }),
  jdId: text('jd_id').references(() => jobDescriptions.id, { onDelete: 'set null' }),
  categoryId: integer('category_id').references(() => interviewCategories.id, {
    onDelete: 'set null',
  }),
  summary: text('summary'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── sessionParticipants ────────────────────────────────────────────────────

export const sessionParticipants = pgTable(
  'session_participants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('session_participants_session_user_unique').on(table.sessionId, table.userId)]
);

// ─── sessionInvitations ─────────────────────────────────────────────────────

export const sessionInvitations = pgTable('session_invitations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  status: text('status').notNull().default('pending'),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── sessionQuestions ───────────────────────────────────────────────────────

export const sessionQuestions = pgTable('session_questions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  questionId: text('question_id').references(() => interviewQuestions.id, {
    onDelete: 'set null',
  }),
  content: text('content').notNull(),
  displayOrder: integer('display_order').notNull(),
  askedAt: timestamp('asked_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── sessionAnswers ─────────────────────────────────────────────────────────

export const sessionAnswers = pgTable(
  'session_answers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionQuestionId: text('session_question_id')
      .notNull()
      .references(() => sessionQuestions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('session_answers_question_user_unique').on(table.sessionQuestionId, table.userId),
  ]
);

// ─── sessionFeedbacks ───────────────────────────────────────────────────────

export const sessionFeedbacks = pgTable('session_feedbacks', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionQuestionId: text('session_question_id')
    .notNull()
    .references(() => sessionQuestions.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content'),
  score: real('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  jobDescriptions: many(jobDescriptions),
  interviewCategories: many(interviewCategories),
  interviewQuestions: many(interviewQuestions),
  followupQuestions: many(followupQuestions),
  accounts: many(accounts),
  createdSessions: many(interviewSessions, { relationName: 'sessionCreator' }),
  ownedSessions: many(interviewSessions, { relationName: 'sessionQaOwner' }),
  sessionParticipants: many(sessionParticipants),
  sessionInvitations: many(sessionInvitations),
  sessionAnswers: many(sessionAnswers),
  sessionFeedbacks: many(sessionFeedbacks),
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
  interviewSessions: many(interviewSessions),
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
  interviewSessions: many(interviewSessions),
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
  sessionQuestions: many(sessionQuestions),
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

export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
  creator: one(users, {
    fields: [interviewSessions.createdBy],
    references: [users.id],
    relationName: 'sessionCreator',
  }),
  qaOwner: one(users, {
    fields: [interviewSessions.qaOwnerId],
    references: [users.id],
    relationName: 'sessionQaOwner',
  }),
  jobDescription: one(jobDescriptions, {
    fields: [interviewSessions.jdId],
    references: [jobDescriptions.id],
  }),
  category: one(interviewCategories, {
    fields: [interviewSessions.categoryId],
    references: [interviewCategories.id],
  }),
  participants: many(sessionParticipants),
  invitations: many(sessionInvitations),
  questions: many(sessionQuestions),
}));

export const sessionParticipantsRelations = relations(sessionParticipants, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [sessionParticipants.sessionId],
    references: [interviewSessions.id],
  }),
  user: one(users, {
    fields: [sessionParticipants.userId],
    references: [users.id],
  }),
}));

export const sessionInvitationsRelations = relations(sessionInvitations, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [sessionInvitations.sessionId],
    references: [interviewSessions.id],
  }),
  inviter: one(users, {
    fields: [sessionInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const sessionQuestionsRelations = relations(sessionQuestions, ({ one, many }) => ({
  session: one(interviewSessions, {
    fields: [sessionQuestions.sessionId],
    references: [interviewSessions.id],
  }),
  sourceQuestion: one(interviewQuestions, {
    fields: [sessionQuestions.questionId],
    references: [interviewQuestions.id],
  }),
  answers: many(sessionAnswers),
  feedbacks: many(sessionFeedbacks),
}));

export const sessionAnswersRelations = relations(sessionAnswers, ({ one }) => ({
  sessionQuestion: one(sessionQuestions, {
    fields: [sessionAnswers.sessionQuestionId],
    references: [sessionQuestions.id],
  }),
  user: one(users, {
    fields: [sessionAnswers.userId],
    references: [users.id],
  }),
}));

export const sessionFeedbacksRelations = relations(sessionFeedbacks, ({ one }) => ({
  sessionQuestion: one(sessionQuestions, {
    fields: [sessionFeedbacks.sessionQuestionId],
    references: [sessionQuestions.id],
  }),
  user: one(users, {
    fields: [sessionFeedbacks.userId],
    references: [users.id],
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
  interviewSessions,
  sessionParticipants,
  sessionInvitations,
  sessionQuestions,
  sessionAnswers,
  sessionFeedbacks,
  usersRelations,
  accountsRelations,
  jobDescriptionsRelations,
  interviewCategoriesRelations,
  interviewQuestionsRelations,
  followupQuestionsRelations,
  interviewSessionsRelations,
  sessionParticipantsRelations,
  sessionInvitationsRelations,
  sessionQuestionsRelations,
  sessionAnswersRelations,
  sessionFeedbacksRelations,
};
