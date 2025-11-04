import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyles = `
    rounded-[2px]
    text-base font-mono font-normal uppercase
    transition-colors
    disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
  `;

  const variantStyles = {
    primary: `
      bg-primary text-neutral-700
      px-[22px] py-[16.5px]
      hover:bg-primary-400
    `,
    secondary: `
      bg-neutral-100 text-neutral-700
      px-[18px] py-[11.5px]
      hover:bg-neutral-200
    `,
    ghost: `
      bg-transparent text-neutral-700
      px-[18px] py-[11.5px]
      hover:bg-neutral-100
    `,
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);
