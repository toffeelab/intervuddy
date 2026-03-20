export interface FollowupQuestion {
  id: string;
  questionId: string;
  question: string;
  answer: string;
  displayOrder: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewQuestion {
  id: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryDisplayLabel: string;
  jdId: string | null;
  originQuestionId: string | null;
  question: string;
  answer: string;
  tip: string | null;
  displayOrder: number;
  keywords: string[];
  followups: FollowupQuestion[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewCategory {
  id: number;
  jdId: string | null;
  name: string;
  slug: string;
  displayLabel: string;
  icon: string;
  displayOrder: number;
  questionCount: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type JobDescriptionStatus = 'in_progress' | 'completed' | 'archived';

export interface JobDescription {
  id: string;
  companyName: string;
  positionTitle: string;
  status: JobDescriptionStatus;
  memo: string | null;
  questionCount: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuestionInput {
  categoryId: number;
  jdId?: string | null;
  question: string;
  answer: string;
  tip?: string | null;
  keywords?: string[];
}

export interface UpdateQuestionInput {
  id: string;
  categoryId?: number;
  question?: string;
  answer?: string;
  tip?: string | null;
  keywords?: string[];
}

export interface CreateFollowupInput {
  questionId: string;
  question: string;
  answer: string;
}

export interface UpdateFollowupInput {
  id: string;
  question?: string;
  answer?: string;
}

export interface CreateJobInput {
  companyName: string;
  positionTitle: string;
  memo?: string | null;
}

export interface UpdateJobInput {
  id: string;
  companyName?: string;
  positionTitle?: string;
  status?: JobDescriptionStatus;
  memo?: string | null;
}

export interface CreateCategoryInput {
  jdId?: string | null;
  name: string;
  slug: string;
  displayLabel: string;
  icon: string;
}

export interface UpdateCategoryInput {
  id: number;
  name?: string;
  slug?: string;
  displayLabel?: string;
  icon?: string;
}

// Session types
export type SessionStatus = 'waiting' | 'in_progress' | 'completed';
export type SessionRole = 'interviewer' | 'interviewee' | 'reviewer';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface InterviewSession {
  id: string;
  title: string;
  status: SessionStatus;
  createdBy: string;
  qaOwnerId: string | null;
  jdId: string | null;
  categoryId: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionParticipantInfo {
  id: string;
  sessionId: string;
  userId: string;
  role: SessionRole;
  displayName: string | null;
  joinedAt: Date;
}

export interface CreateSessionInput {
  title: string;
  role: SessionRole; // creator's role
  qaOwnerId?: string;
  jdId?: string | null;
  categoryId?: number | null;
}

export interface SessionQuestionRecord {
  id: string;
  sessionId: string;
  questionId: string | null;
  content: string;
  displayOrder: number;
  askedAt: Date;
  answer?: { userId: string; content: string; answeredAt: Date } | null;
  feedbacks: Array<{
    userId: string;
    content: string | null;
    score: number | null;
    createdAt: Date;
  }>;
}
