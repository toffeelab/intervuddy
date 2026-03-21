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
