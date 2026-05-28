import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-blue text-white hover:bg-brand-blue-hover disabled:bg-[#96a3d8] disabled:text-white',
  secondary:
    'border border-brand-gray-200 bg-brand-card text-brand-text-secondary hover:bg-brand-gray-100 disabled:bg-brand-gray-100 disabled:text-brand-gray-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  md: 'px-4 py-3.5 text-sm',
  sm: 'px-3 py-2 text-xs',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      className = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    const hasIcon = Boolean(icon);

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${hasIcon ? 'gap-2' : ''} ${className}`}
        {...props}
      >
        {icon && iconPosition === 'left' ? <span className="inline-flex">{icon}</span> : null}
        {children}
        {icon && iconPosition === 'right' ? <span className="inline-flex">{icon}</span> : null}
      </button>
    );
  },
);

Button.displayName = 'Button';
