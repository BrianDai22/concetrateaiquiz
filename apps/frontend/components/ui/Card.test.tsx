import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/__tests__/test-utils';
import { Card } from './Card';

describe('Card', () => {
  it('should render children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );

    const content = screen.getByText(/card content/i);
    expect(content).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <Card className="custom-card">
        <div data-testid="card-content">Content</div>
      </Card>
    );

    const cardContent = screen.getByTestId('card-content');
    const cardContainer = cardContent.parentElement;

    expect(cardContainer).toHaveClass('custom-card');
    expect(cardContainer).toHaveClass('bg-white');
    expect(cardContainer).toHaveClass('rounded-[2px]');
  });

  it('should render default styles', () => {
    render(
      <Card>
        <div data-testid="content">Test</div>
      </Card>
    );

    const cardContent = screen.getByTestId('content');
    const cardContainer = cardContent.parentElement;

    expect(cardContainer).toHaveClass('bg-white');
    expect(cardContainer).toHaveClass('rounded-[2px]');
    expect(cardContainer).toHaveClass('p-6');
    expect(cardContainer).toHaveClass('shadow-sm');
    expect(cardContainer).toHaveClass('border');
    expect(cardContainer).toHaveClass('border-neutral-200');
  });
});
