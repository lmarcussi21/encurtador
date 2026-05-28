import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type IconButtonVariant = 'default' | 'danger';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
}

const variantStyles: Record<IconButtonVariant, string> = {
  default: 'border-brand-gray-200 bg-brand-card text-brand-text-secondary hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue-light disabled:bg-brand-gray-100 disabled:text-brand-gray-400',
  danger: 'border-brand-gray-200 bg-brand-card text-brand-text-secondary hover:bg-brand-feedback-danger/10 hover:text-brand-feedback-danger disabled:bg-brand-gray-100 disabled:text-brand-gray-400',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'default', className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        disabled={disabled}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/10 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
