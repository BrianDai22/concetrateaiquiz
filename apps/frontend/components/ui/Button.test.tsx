import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/__tests__/test-utils';
import { Button, PrimaryButton, SecondaryButton } from './Button';

describe('Button', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('should render primary variant by default', () => {
    render(<Button>Primary</Button>);

    const button = screen.getByRole('button', { name: /primary/i });
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('text-neutral-700');
  });

  it('should render secondary variant when specified', () => {
    render(<Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toHaveClass('bg-neutral-100');
    expect(button).toHaveClass('text-neutral-700');
  });

  it('should render ghost variant when specified', () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole('button', { name: /ghost/i });
    expect(button).toHaveClass('bg-transparent');
    expect(button).toHaveClass('text-neutral-700');
  });

  it('should handle disabled state', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:bg-neutral-50');
    expect(button).toHaveClass('disabled:text-neutral-400');
    expect(button).toHaveClass('disabled:cursor-not-allowed');
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Clickable</Button>);

    const button = screen.getByRole('button', { name: /clickable/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not trigger click when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );

    const button = screen.getByRole('button', { name: /disabled/i });
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole('button', { name: /custom/i });
    expect(button).toHaveClass('custom-class');
  });

  it('should forward HTML button props', () => {
    render(
      <Button type="submit" name="submit-button">
        Submit
      </Button>
    );

    const button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'submit-button');
  });
});

describe('PrimaryButton', () => {
  it('should render as primary variant', () => {
    render(<PrimaryButton>Primary</PrimaryButton>);

    const button = screen.getByRole('button', { name: /primary/i });
    expect(button).toHaveClass('bg-primary');
  });
});

describe('SecondaryButton', () => {
  it('should render as secondary variant', () => {
    render(<SecondaryButton>Secondary</SecondaryButton>);

    const button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toHaveClass('bg-neutral-100');
  });
});
