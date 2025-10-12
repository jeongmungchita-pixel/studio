/**
 * KGF Nexus Design System - Windsurf Style
 * 미니멀하고 세련된 디자인 시스템
 */

// Windsurf 스타일 색상 팔레트
export const roleColors = {
  SUPER_ADMIN: {
    primary: 'from-slate-900 to-slate-800',
    bg: 'bg-white dark:bg-slate-950',
    border: 'border-slate-200 dark:border-slate-800',
    text: 'text-slate-900 dark:text-slate-100',
    badge: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    hover: 'hover:bg-slate-50 dark:hover:bg-slate-900',
    gradient: 'bg-gradient-to-r from-slate-900 to-slate-800',
    light: 'bg-slate-50 dark:bg-slate-900',
    icon: 'text-slate-900 dark:text-slate-100',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  FEDERATION_ADMIN: {
    primary: 'from-purple-500 to-purple-600',
    bg: 'from-purple-50 to-white',
    border: 'border-purple-200',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    hover: 'hover:bg-purple-50',
    gradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
    light: 'bg-purple-50',
    icon: 'text-purple-600',
  },
  CLUB_OWNER: {
    primary: 'from-blue-500 to-blue-600',
    bg: 'from-blue-50 to-white',
    border: 'border-blue-200',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    hover: 'hover:bg-blue-50',
    gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    icon: 'text-blue-600',
  },
  CLUB_MANAGER: {
    primary: 'from-cyan-500 to-cyan-600',
    bg: 'from-cyan-50 to-white',
    border: 'border-cyan-200',
    text: 'text-cyan-600',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    hover: 'hover:bg-cyan-50',
    gradient: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
    light: 'bg-cyan-50',
    icon: 'text-cyan-600',
  },
  MEMBER: {
    primary: 'from-green-500 to-green-600',
    bg: 'from-green-50 to-white',
    border: 'border-green-200',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-700 border-green-200',
    hover: 'hover:bg-green-50',
    gradient: 'bg-gradient-to-r from-green-500 to-green-600',
    light: 'bg-green-50',
    icon: 'text-green-600',
  },
  PARENT: {
    primary: 'from-emerald-500 to-emerald-600',
    bg: 'from-emerald-50 to-white',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    hover: 'hover:bg-emerald-50',
    gradient: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    light: 'bg-emerald-50',
    icon: 'text-emerald-600',
  },
} as const;

// 상태별 색상
export const statusColors = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: 'text-yellow-600',
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: 'text-green-600',
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: 'text-red-600',
  },
  active: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: 'text-gray-600',
  },
} as const;

// 카드 스타일
export const cardStyles = {
  default: 'bg-white border rounded-2xl shadow-lg',
  hover: 'hover:shadow-xl transition-all duration-300',
  gradient: 'bg-gradient-to-br',
  glass: 'bg-white/80 backdrop-blur-sm',
  elevated: 'shadow-xl',
} as const;

// 버튼 스타일
export const buttonStyles = {
  primary: 'bg-gradient-to-r shadow-lg hover:shadow-xl transition-all duration-300',
  secondary: 'border-2 hover:bg-gray-50 transition-all duration-300',
  success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/25',
  danger: 'border-2 border-red-200 text-red-600 hover:bg-red-50',
  ghost: 'hover:bg-gray-100 transition-all duration-300',
} as const;

// 간격 시스템
export const spacing = {
  xs: 'p-2',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
} as const;

// 라운드 시스템
export const rounded = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const;

// 그림자 시스템
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-lg',
  lg: 'shadow-xl',
  colored: (color: string) => `shadow-lg shadow-${color}-500/25`,
} as const;

// 애니메이션
export const animations = {
  fadeIn: 'animate-in fade-in duration-300',
  slideIn: 'animate-in slide-in-from-bottom duration-300',
  scaleIn: 'animate-in zoom-in duration-300',
  spin: 'animate-spin',
} as const;

// 타이포그래피
export const typography = {
  h1: 'text-4xl font-bold',
  h2: 'text-3xl font-bold',
  h3: 'text-2xl font-bold',
  h4: 'text-xl font-semibold',
  body: 'text-base',
  small: 'text-sm',
  xs: 'text-xs',
} as const;

// 유틸리티 함수
export const getRoleColor = (role: keyof typeof roleColors) => {
  return roleColors[role] || roleColors.MEMBER;
};

export const getStatusColor = (status: keyof typeof statusColors) => {
  return statusColors[status] || statusColors.inactive;
};
