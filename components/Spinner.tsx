import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white';
}

export const Spinner = ({ size = 'md', variant = 'default', className, ...props }: SpinnerProps) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2', // For buttons / small inline UI
    md: 'w-8 h-8 border-[3px]', // Default
    lg: 'w-12 h-12 border-4', // Dialogs / cards
    xl: 'w-16 h-16 border-4', // Full page / large areas
  };

  const variantClasses = {
    default: 'border-[#E9ECEF] border-t-[#2D5A27]',
    white: 'border-white/30 border-t-white',
  };

  return (
    <div
      className={cn(
        "rounded-full animate-spin",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
};
