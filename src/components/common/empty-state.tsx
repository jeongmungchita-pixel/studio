'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileX, Users, Search, Plus } from 'lucide-react';
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
  className?: string;
}
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className
}: EmptyStateProps) {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'search':
        return <Search className="h-12 w-12 text-muted-foreground" />;
      case 'error':
        return <FileX className="h-12 w-12 text-muted-foreground" />;
      default:
        return <Users className="h-12 w-12 text-muted-foreground" />;
    }
  };
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4">
          {icon || getDefaultIcon()}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-muted-foreground mb-6 max-w-md">
            {description}
          </p>
        )}
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
