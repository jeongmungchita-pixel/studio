'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  backButton?: {
    onClick: () => void;
    label?: string;
  };
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
    icon?: React.ReactNode;
  }>;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  backButton,
  primaryAction,
  secondaryActions = [],
  children,
  className
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {backButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={backButton.onClick}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {backButton.label || '뒤로'}
            </Button>
          )}
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {badge && (
                <Badge variant={badge.variant || 'default'}>
                  {badge.text}
                </Badge>
              )}
            </div>
            
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
              className="gap-2"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="gap-2"
            >
              {primaryAction.icon || <Plus className="h-4 w-4" />}
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {children && (
        <>
          <Separator />
          {children}
        </>
      )}
    </div>
  );
}
