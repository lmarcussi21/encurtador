import { forwardRef, ReactNode, type InputHTMLAttributes } from 'react';
import { Warning } from 'phosphor-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: ReactNode;
  helperText?: string;
  prefix?: string;
}

const baseInput =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-brand-text-primary transition-all placeholder:text-brand-text-muted focus:outline-none';
const defaultStyles = 'border-brand-gray-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20';
const errorStyles = 'border-brand-feedback-danger focus:border-brand-feedback-danger focus:ring-2 focus:ring-brand-feedback-danger/20';

function renderFeedback(error?: ReactNode, helperText?: string): ReactNode {
  if (error) {
    return (
      <span className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-feedback-danger">
        <Warning size={16} weight="bold" />
        <span>{error}</span>
      </span>
    );
  }

  if (helperText) {
    return (
      <span className="mt-1 block text-xs font-medium text-brand-text-secondary">
        {helperText}
      </span>
    );
  }

  return null;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, prefix, className = '', ...props }, ref) => {
    const inputClasses = `${baseInput} ${error ? errorStyles : defaultStyles} ${className}`;

    if (prefix) {
      const wrapperFocusStyles = error
        ? 'focus-within:border-brand-feedback-danger focus-within:ring-2 focus-within:ring-brand-feedback-danger/20'
        : 'focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20';

      return (
        <label className="block text-sm">
          <span className="block text-xs font-semibold text-brand-text-secondary tracking-wider mb-2">
            {label}
          </span>
          <div className={`flex items-center rounded-xl border bg-white transition-all ${error ? 'border-brand-feedback-danger' : 'border-brand-gray-200'} ${wrapperFocusStyles}`}>
            <span className="bg-brand-gray-100 border-r border-brand-gray-200 px-3 py-3 text-sm text-brand-text-muted select-none">
              {prefix}
            </span>
            <input
              ref={ref}
              className={`${baseInput} ${error ? errorStyles : defaultStyles} rounded-r-xl bg-transparent border-none focus:ring-0 ${className}`}
              {...props}
            />
          </div>
          {renderFeedback(error, helperText)}
        </label>
      );
    }

    return (
      <label className="block text-sm">
        <span className="block text-xs font-semibold text-brand-text-secondary tracking-wider mb-2">
          {label}
        </span>
        <input ref={ref} className={inputClasses} {...props} />
        {renderFeedback(error, helperText)}
      </label>
    );
  },
);

Input.displayName = 'Input';
