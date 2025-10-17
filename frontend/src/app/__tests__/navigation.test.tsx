import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LandingPage from '../page';

// Mock the router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => 'test-uuid-123');
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID,
  },
});

describe('Navigation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRandomUUID.mockReturnValue('test-uuid-123');
  });

  it('navigates from landing page to project workspace on prompt submission', async () => {
    render(<LandingPage />);

    // Find the prompt input
    const promptInput = screen.getByPlaceholderText(/describe the 3d scene/i);
    const generateButton = screen.getByLabelText('Generate scene');

    // Enter a prompt
    fireEvent.change(promptInput, { 
      target: { value: 'Create a magical forest with glowing mushrooms' } 
    });

    // Submit the form
    fireEvent.click(generateButton);

    // Should navigate to project workspace with the prompt
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/project/test-uuid-123?prompt=Create%20a%20magical%20forest%20with%20glowing%20mushrooms'
      );
    });
  });

  it('prevents navigation with empty prompt', () => {
    render(<LandingPage />);

    const generateButton = screen.getByLabelText('Generate scene');

    // Try to submit without entering a prompt
    fireEvent.click(generateButton);

    // Should not navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('allows navigation with whitespace in prompt (preserves original input)', async () => {
    render(<LandingPage />);

    const promptInput = screen.getByPlaceholderText(/describe the 3d scene/i);
    const generateButton = screen.getByLabelText('Generate scene');

    // Enter a prompt with leading/trailing whitespace
    fireEvent.change(promptInput, { 
      target: { value: '   Create a space station   ' } 
    });

    fireEvent.click(generateButton);

    // The current implementation preserves the original prompt with whitespace in the URL
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/project/test-uuid-123?prompt=%20%20%20Create%20a%20space%20station%20%20%20'
      );
    });
  });

  it('handles special characters in prompt URL encoding', async () => {
    render(<LandingPage />);

    const promptInput = screen.getByPlaceholderText(/describe the 3d scene/i);
    const generateButton = screen.getByLabelText('Generate scene');

    // Enter a prompt with special characters
    fireEvent.change(promptInput, { 
      target: { value: 'Create a café with "modern" furniture & décor!' } 
    });

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/project/test-uuid-123?prompt=Create%20a%20caf%C3%A9%20with%20%22modern%22%20furniture%20%26%20d%C3%A9cor!'
      );
    });
  });

  it('generates unique project IDs for each navigation', async () => {
    // Mock multiple UUID calls
    let callCount = 0;
    mockRandomUUID.mockImplementation(() => {
      callCount++;
      return `test-uuid-${callCount}`;
    });

    // Test with two separate component instances to avoid loading state issues
    const { unmount } = render(<LandingPage />);

    const promptInput = screen.getByPlaceholderText(/describe the 3d scene/i);
    const generateButton = screen.getByLabelText('Generate scene');

    // First submission
    fireEvent.change(promptInput, { target: { value: 'First scene' } });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/project/test-uuid-1?prompt=First%20scene');
    });

    // Unmount and render a fresh component for the second test
    unmount();
    mockPush.mockClear();
    
    render(<LandingPage />);
    
    const promptInput2 = screen.getByPlaceholderText(/describe the 3d scene/i);
    const generateButton2 = screen.getByLabelText('Generate scene');
    
    fireEvent.change(promptInput2, { target: { value: 'Second scene' } });
    fireEvent.click(generateButton2);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/project/test-uuid-2?prompt=Second%20scene');
    });
  });
});