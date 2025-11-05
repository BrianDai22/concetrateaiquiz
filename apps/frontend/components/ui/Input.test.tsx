import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from '@/__tests__/test-utils';
import { Input } from './Input';

describe('Input', () => {
  it('should render input with placeholder', () => {
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toBeInTheDocument();
  });

  it('should display label when provided', () => {
    render(<Input label="Username" placeholder="Enter username" />);

    const label = screen.getByText(/username/i);
    const input = screen.getByPlaceholderText(/enter username/i);

    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
    expect(input).toBeInTheDocument();
  });

  it('should not render label when not provided', () => {
    render(<Input placeholder="No label" />);

    const labels = screen.queryByRole('label');
    expect(labels).not.toBeInTheDocument();
  });

  it('should show error message and apply error styling', () => {
    render(
      <Input
        placeholder="Email"
        error="Invalid email address"
        data-testid="email-input"
      />
    );

    const errorMessage = screen.getByText(/invalid email address/i);
    const input = screen.getByTestId('email-input');

    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-red-500');
    expect(input).toHaveClass('border-red-500');
  });

  it('should forward ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="Test" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.placeholder).toBe('Test');
  });

  it('should handle input changes', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);

    const input = screen.getByPlaceholderText(/type here/i) as HTMLInputElement;
    await user.type(input, 'Hello World');

    expect(input.value).toBe('Hello World');
  });

  it('should handle disabled state', () => {
    render(<Input placeholder="Disabled" disabled />);

    const input = screen.getByPlaceholderText(/disabled/i);
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:bg-neutral-50');
    expect(input).toHaveClass('disabled:text-neutral-400');
  });

  it('should forward HTML input props', () => {
    render(
      <Input
        type="email"
        name="email"
        placeholder="Email"
        required
        data-testid="email-input"
      />
    );

    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toBeRequired();
  });

  it('should apply custom className', () => {
    render(
      <Input placeholder="Custom" className="custom-class" data-testid="custom-input" />
    );

    const input = screen.getByTestId('custom-input');
    expect(input).toHaveClass('custom-class');
  });
});
