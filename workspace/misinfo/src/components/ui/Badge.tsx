import React from 'react';
import { cn } from '@/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
}) => {
  const variantClasses = {
    primary: 'bg-primary-100 text-primary-800 border-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-700',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    success: 'bg-success-100 text-success-800 border-success-200 dark:bg-success-900/20 dark:text-success-300 dark:border-success-700',
    warning: 'bg-warning-100 text-warning-800 border-warning-200 dark:bg-warning-900/20 dark:text-warning-300 dark:border-warning-700',
    danger: 'bg-danger-100 text-danger-800 border-danger-200 dark:bg-danger-900/20 dark:text-danger-300 dark:border-danger-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};
