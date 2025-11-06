import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { Chatbot } from './Chatbot';

// Mock fetch globally
global.fetch = vi.fn();

describe('Chatbot', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        response: 'This is a test response from the AI assistant.',
        timestamp: new Date().toISOString(),
      }),
    } as Response);
  });

  it('should render floating chat button', () => {
    render(<Chatbot />);

    const button = screen.getByRole('button', { name: /open chat/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Chat');
  });

  it('should open dialog when chat button is clicked', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    const button = screen.getByRole('button', { name: /open chat/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Platform Assistant')).toBeInTheDocument();
    });
  });

  it('should display welcome message when no messages', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    const button = screen.getByRole('button', { name: /open chat/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/hi! i'm your platform assistant/i)).toBeInTheDocument();
    });
  });

  it('should send message when send button is clicked', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Type message
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'How do I submit an assignment?');

    // Click send
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('This is a test response from the AI assistant.')).toBeInTheDocument();
    });

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v0/chatbot/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: 'How do I submit an assignment?' }),
      })
    );
  });

  it('should send message when Enter key is pressed', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Type message and press Enter
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test message{Enter}');

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('This is a test response from the AI assistant.')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should not send message when Shift+Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Type message and press Shift+Enter
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test message');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    // Verify fetch was NOT called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should display loading state while waiting for response', async () => {
    const user = userEvent.setup();

    // Mock slow response
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  response: 'Delayed response',
                  timestamp: new Date().toISOString(),
                }),
              } as Response),
            100
          )
        )
    );

    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test message');
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Check for loading state
    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Delayed response')).toBeInTheDocument();
    });
  });

  it('should display error message for 401 unauthorized', async () => {
    const user = userEvent.setup();

    // Mock 401 response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
    } as Response);

    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test message');
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText('Please log in to use the chatbot')).toBeInTheDocument();
    });
  });

  it('should display generic error message for other errors', async () => {
    const user = userEvent.setup();

    // Mock error response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test message');
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText('Failed to get response from chatbot')).toBeInTheDocument();
    });
  });

  it('should not send empty message', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Try to send empty message
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Verify fetch was NOT called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should disable input and button while sending', async () => {
    const user = userEvent.setup();

    // Mock slow response
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  response: 'Response',
                  timestamp: new Date().toISOString(),
                }),
              } as Response),
            100
          )
        )
    );

    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test message');
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Check that input and button are disabled
    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    // Wait for response and check they're enabled again
    await waitFor(() => {
      expect(screen.getByText('Response')).toBeInTheDocument();
    });

    // After response is shown, input and button should be enabled
    expect(input).not.toBeDisabled();
    expect(sendButton).not.toBeDisabled();
  });

  it('should display user message in chat', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'My test question');
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Check that user message appears
    await waitFor(() => {
      expect(screen.getByText('My test question')).toBeInTheDocument();
    });
  });

  it('should clear input after sending message', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i) as HTMLInputElement;
    await user.type(input, 'Test message');

    expect(input.value).toBe('Test message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Check that input is cleared
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock network error
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Send message
    const input = screen.getByPlaceholderText(/ask a question/i);
    await user.type(input, 'Test message');
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Check for error
    await waitFor(() => {
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });

  it('should close dialog when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<Chatbot />);

    // Open dialog
    const openButton = screen.getByRole('button', { name: /open chat/i });
    await user.click(openButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Close dialog
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no accessible name
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
