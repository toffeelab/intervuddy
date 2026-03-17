export interface FollowupQuestion {
  id: number;
  questionId: number;
  question: string;
  answer: string;
  displayOrder: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewQuestion {
  id: number;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  categoryDisplayLabel: string;
  jdId: number | null;
  originQuestionId: number | null;
  question: string;
  answer: string;
  tip: string | null;
  displayOrder: number;
  keywords: string[];
  followups: FollowupQuestion[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCategory {
  id: number;
  jdId: number | null;
  name: string;
  slug: string;
  displayLabel: string;
  icon: string;
  displayOrder: number;
  questionCount: number;
  deletedAt: string | null;
  createdAt: string;
}

export type JobDescriptionStatus = 'in_progress' | 'completed' | 'archived';

export interface JobDescription {
  id: number;
  companyName: string;
  positionTitle: string;
  status: JobDescriptionStatus;
  memo: string | null;
  questionCount: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionInput {
  categoryId: number;
  jdId?: number | null;
  question: string;
  answer: string;
  tip?: string | null;
}

export interface UpdateQuestionInput {
  id: number;
  question?: string;
  answer?: string;
  tip?: string | null;
}

export interface CreateFollowupInput {
  questionId: number;
  question: string;
  answer: string;
}

export interface UpdateFollowupInput {
  id: number;
  question?: string;
  answer?: string;
}

export interface CreateJobInput {
  companyName: string;
  positionTitle: string;
  memo?: string | null;
}

export interface UpdateJobInput {
  id: number;
  companyName?: string;
  positionTitle?: string;
  status?: JobDescriptionStatus;
  memo?: string | null;
}

export interface CreateCategoryInput {
  jdId?: number | null;
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
