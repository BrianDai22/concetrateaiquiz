import * as React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-white
        rounded-[2px]
        p-6
        shadow-sm
        border border-neutral-200
        ${className}
      `}
    >
      {children}
    </div>
  );
};
