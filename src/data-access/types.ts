export interface DeepQA {
  id: number;
  question: string;
  answer: string;
}

export interface QAItem {
  id: number;
  categoryName: string;
  tag: string;
  tagLabel: string;
  isJD: boolean;
  isDeep: boolean;
  question: string;
  answer: string;
  tip: string | null;
  jdTip: string | null;
  keywords: string[];
  deepQA: DeepQA[];
}

export interface Category {
  id: number;
  name: string;
  tag: string;
  tagLabel: string;
  icon: string;
  isJdGroup: boolean;
  displayOrder: number;
  count: number;
}
