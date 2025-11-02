import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme: 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'cyan';
  onClick?: () => void;
}
const colorSchemes = {
  blue: {
    bg: 'from-blue-50 to-white',
    iconBg: 'bg-blue-500',
    text: 'text-blue-600',
    shadow: 'shadow-blue-500/25',
  },
  purple: {
    bg: 'from-purple-50 to-white',
    iconBg: 'bg-purple-500',
    text: 'text-purple-600',
    shadow: 'shadow-purple-500/25',
  },
  green: {
    bg: 'from-green-50 to-white',
    iconBg: 'bg-green-500',
    text: 'text-green-600',
    shadow: 'shadow-green-500/25',
  },
  red: {
    bg: 'from-red-50 to-white',
    iconBg: 'bg-red-500',
    text: 'text-red-600',
    shadow: 'shadow-red-500/25',
  },
  yellow: {
    bg: 'from-yellow-50 to-white',
    iconBg: 'bg-yellow-500',
    text: 'text-yellow-600',
    shadow: 'shadow-yellow-500/25',
  },
  cyan: {
    bg: 'from-cyan-50 to-white',
    iconBg: 'bg-cyan-500',
    text: 'text-cyan-600',
    shadow: 'shadow-cyan-500/25',
  },
};
export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorScheme,
  onClick,
}: StatCardProps) {
  const colors = colorSchemes[colorScheme];
  return (
    <Card
      className={cn(
        'border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br group',
        colors.bg,
        onClick && 'cursor-pointer hover:scale-105'
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <div className={cn('text-4xl font-bold', colors.text)}>{value}</div>
            {typeof value === 'number' && (
              <span className="text-sm text-muted-foreground">건</span>
            )}
          </div>
        </div>
        <div
          className={cn(
            'p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform',
            colors.iconBg,
            colors.shadow
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </CardHeader>
      {(description || trend) && (
        <CardContent>
          {description && (
            <div className={cn('flex items-center gap-2 text-sm', colors.text)}>
              <span className="font-medium">{description}</span>
            </div>
          )}
          {trend && (
            <div className="flex items-center gap-2 text-sm mt-2">
              <span
                className={cn(
                  'font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
