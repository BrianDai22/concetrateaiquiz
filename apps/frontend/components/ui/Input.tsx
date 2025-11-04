import * as React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-mono text-neutral-700 mb-2 uppercase">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full
            px-4 py-3
            bg-white
            border border-neutral-300
            rounded-[2px]
            text-base font-mono text-neutral-700
            placeholder:text-neutral-400
            focus:outline-none
            focus:border-primary
            focus:ring-2
            focus:ring-primary/20
            disabled:bg-neutral-50
            disabled:text-neutral-400
            transition-all
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500 font-mono">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
