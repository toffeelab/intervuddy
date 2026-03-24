import type { LucideIcon } from 'lucide-react';
import {
  FileUser,
  Briefcase,
  Sparkles,
  BookOpen,
  Mic,
  BarChart3,
  Building2,
  Calendar,
  Settings,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group: 'prepare' | 'study' | 'manage';
  disabled?: boolean;
}

export interface NavGroup {
  key: 'prepare' | 'study' | 'manage';
  label: string;
}

export const navGroups: NavGroup[] = [
  { key: 'prepare', label: '준비' },
  { key: 'study', label: '학습' },
  { key: 'manage', label: '관리' },
];

export const navItems: NavItem[] = [
  { label: '이력서/포폴', href: '/resume', icon: FileUser, group: 'prepare', disabled: true },
  { label: '채용공고 관리', href: '/interviews', icon: Briefcase, group: 'prepare' },
  { label: '질문 생성', href: '/generate', icon: Sparkles, group: 'prepare', disabled: true },
  { label: 'Q&A 학습', href: '/study', icon: BookOpen, group: 'study' },
  { label: '모의면접', href: '/mock-interview', icon: Mic, group: 'study', disabled: true },
  { label: '대시보드', href: '/dashboard', icon: BarChart3, group: 'study', disabled: true },
  {
    label: '기업 리서치',
    href: '/companies',
    icon: Building2,
    group: 'manage',
    disabled: true,
  },
  { label: '일정 관리', href: '/schedule', icon: Calendar, group: 'manage', disabled: true },
];

export const settingsItem: NavItem = {
  label: '설정',
  href: '/settings',
  icon: Settings,
  group: 'manage',
  disabled: true,
};

export const bottomTabItems: NavItem[] = [
  navItems.find((i) => i.href === '/resume')!,
  navItems.find((i) => i.href === '/study')!,
  navItems.find((i) => i.href === '/interviews')!,
  navItems.find((i) => i.href === '/mock-interview')!,
];
