import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
  };
  colorScheme: 'red' | 'purple' | 'blue' | 'green' | 'cyan';
  actions?: React.ReactNode;
}

const colorSchemes = {
  red: {
    gradient: 'from-red-500/10 via-pink-500/10 to-purple-500/10',
    border: 'border-red-100',
    iconBg: 'from-red-500 to-pink-600',
    iconShadow: 'shadow-red-500/25',
    textGradient: 'from-red-600 to-pink-600',
  },
  purple: {
    gradient: 'from-purple-500/10 via-violet-500/10 to-indigo-500/10',
    border: 'border-purple-100',
    iconBg: 'from-purple-500 to-violet-600',
    iconShadow: 'shadow-purple-500/25',
    textGradient: 'from-purple-600 to-violet-600',
  },
  blue: {
    gradient: 'from-blue-500/10 via-cyan-500/10 to-sky-500/10',
    border: 'border-blue-100',
    iconBg: 'from-blue-500 to-cyan-600',
    iconShadow: 'shadow-blue-500/25',
    textGradient: 'from-blue-600 to-cyan-600',
  },
  green: {
    gradient: 'from-green-500/10 via-emerald-500/10 to-teal-500/10',
    border: 'border-green-100',
    iconBg: 'from-green-500 to-emerald-600',
    iconShadow: 'shadow-green-500/25',
    textGradient: 'from-green-600 to-emerald-600',
  },
  cyan: {
    gradient: 'from-cyan-500/10 via-teal-500/10 to-blue-500/10',
    border: 'border-cyan-100',
    iconBg: 'from-cyan-500 to-teal-600',
    iconShadow: 'shadow-cyan-500/25',
    textGradient: 'from-cyan-600 to-teal-600',
  },
};

const badgeVariants = {
  default: 'bg-gray-50 text-gray-700 border-gray-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
};

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  colorScheme,
  actions,
}: PageHeaderProps) {
  const colors = colorSchemes[colorScheme];

  return (
    <div className="relative">
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-r rounded-3xl blur-3xl',
          colors.gradient
        )}
      />
      <div
        className={cn(
          'relative bg-white/80 backdrop-blur-sm border rounded-2xl p-8 shadow-xl',
          colors.border,
          colors.iconShadow
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-3 bg-gradient-to-br rounded-2xl shadow-lg',
                  colors.iconBg,
                  colors.iconShadow
                )}
              >
                <Icon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1
                  className={cn(
                    'text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
                    colors.textGradient
                  )}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {badge && (
              <Badge
                variant="outline"
                className={cn('px-4 py-2', badgeVariants[badge.variant || 'default'])}
              >
                {badge.text}
              </Badge>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
