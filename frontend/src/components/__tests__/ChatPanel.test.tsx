import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatPanel } from '../ChatPanel';
import { ChatMessage } from '@/types';

describe('ChatPanel', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      projectId: 'test-project',
      role: 'user',
      content: 'Create a forest scene',
      timestamp: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      projectId: 'test-project',
      role: 'assistant',
      content: 'I\'ll create a beautiful forest scene for you.',
      timestamp: '2024-01-01T00:01:00Z',
    },
  ];

  let mockOnSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSendMessage = vi.fn();
  });

  it('renders chat messages correctly', () => {
    render(
      <ChatPanel
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
        isStreaming={false}
      />
    );

    expect(screen.getByText('Create a forest scene')).toBeInTheDocument();
    expect(screen.getByText('I\'ll create a beautiful forest scene for you.')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Assistant')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isStreaming={false}
      />
    );

    expect(screen.getByText('Start a conversation to generate your 3D scene')).toBeInTheDocument();
  });

  it('handles message input and submission', async () => {
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isStreaming={false}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe your scene or ask a question...');
    const sendButton = screen.getByText('Send');

    // Type a message
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(textarea).toHaveValue('Test message');

    // Submit the message
    fireEvent.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('handles Enter key submission', () => {
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isStreaming={false}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe your scene or ask a question...');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('allows Shift+Enter for new lines without submission', () => {
    const freshMockOnSendMessage = vi.fn();
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={freshMockOnSendMessage}
        isStreaming={false}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe your scene or ask a question...');

    fireEvent.change(textarea, { target: { value: 'Line 1' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    // Should not call onSendMessage for Shift+Enter
    expect(freshMockOnSendMessage).not.toHaveBeenCalled();
  });

  it('shows streaming indicator when streaming', () => {
    render(
      <ChatPanel
        messages={mockMessages}
        onSendMessage={mockOnSendMessage}
        isStreaming={true}
      />
    );

    expect(screen.getByText('Generating scene...')).toBeInTheDocument();
    // Use getAllByText since there are multiple "Assistant" labels
    expect(screen.getAllByText('Assistant')).toHaveLength(2); // One for existing message, one for streaming
  });

  it('disables input during streaming', () => {
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isStreaming={true}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe your scene or ask a question...');
    const sendButton = screen.getByText('Send');

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('prevents submission of empty messages', () => {
    const freshMockOnSendMessage = vi.fn();
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={freshMockOnSendMessage}
        isStreaming={false}
      />
    );

    const sendButton = screen.getByText('Send');

    // Button should be disabled when no text
    expect(sendButton).toBeDisabled();

    // Try to submit empty message
    fireEvent.click(sendButton);
    expect(freshMockOnSendMessage).not.toHaveBeenCalled();

    // Add whitespace only
    const textarea = screen.getByPlaceholderText('Describe your scene or ask a question...');
    fireEvent.change(textarea, { target: { value: '   ' } });
    
    // Should still be disabled
    expect(sendButton).toBeDisabled();
  });

  it('clears input after successful submission', async () => {
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={mockOnSendMessage}
        isStreaming={false}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe your scene or ask a question...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Input should be cleared after submission
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });
});