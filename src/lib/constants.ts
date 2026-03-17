export const CATEGORY_ALL = '전체' as const;

export const STATS = [
  { value: '10yr', label: '총 경력', color: 'text-iv-accent' },
  { value: '1.3만', label: 'MAU 달성', color: 'text-iv-green' },
  { value: '90%', label: '인사팀 절감', color: 'text-iv-amber' },
  { value: '89점', label: 'Lighthouse', color: 'text-iv-pink' },
] as const;

export const JD_KEYWORDS = [
  'Vue3', 'Next.js', 'TypeScript', 'ArgoCD', 'JWT',
  'SSE/WebSocket', 'GitHub Actions', 'Jira', 'AI Tools',
] as const;

export const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  intro: {
    bg: 'bg-iv-accent2/12',
    text: 'text-[#a89ff5]',
    border: 'border-iv-accent2/20',
  },
  tech: {
    bg: 'bg-iv-accent/12',
    text: 'text-[#7ab4f8]',
    border: 'border-iv-accent/20',
  },
  lead: {
    bg: 'bg-iv-green/10',
    text: 'text-[#5dd4a3]',
    border: 'border-iv-green/20',
  },
  proj: {
    bg: 'bg-iv-amber/10',
    text: 'text-[#f9c74f]',
    border: 'border-iv-amber/20',
  },
  career: {
    bg: 'bg-iv-red/10',
    text: 'text-[#fca5a5]',
    border: 'border-iv-red/20',
  },
  culture: {
    bg: 'bg-iv-pink/10',
    text: 'text-[#f0a3c0]',
    border: 'border-iv-pink/20',
  },
  jd: {
    bg: 'bg-iv-jd/10',
    text: 'text-iv-jd',
    border: 'border-iv-jd/20',
  },
};

export const CATEGORY_ICON_BG: Record<string, string> = {
  '자기소개/커리어': 'bg-iv-accent2/[0.07]',
  '기술역량': 'bg-iv-accent/[0.07]',
  '리더십/팀': 'bg-iv-green/[0.07]',
  '프로젝트 심화': 'bg-iv-amber/[0.07]',
  '커리어 방향성': 'bg-iv-red/[0.07]',
  '조직/문화핏': 'bg-iv-pink/[0.07]',
  'JD-실시간/통신': 'bg-iv-jd/[0.07]',
  'JD-백오피스/UI': 'bg-iv-jd/[0.07]',
  'JD-TypeScript/보안': 'bg-iv-jd/[0.07]',
  'JD-Vue/Nuxt': 'bg-iv-jd/[0.07]',
  'JD-인프라/성능': 'bg-iv-jd/[0.07]',
  'JD-컬처핏': 'bg-iv-jd/[0.07]',
};
