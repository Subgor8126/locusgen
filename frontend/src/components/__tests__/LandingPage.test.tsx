import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingPage from '../LandingPage';
import { mockPush, sessionStorageMock } from '../../test/setup';
import { User, Project } from '@/types';

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  it('renders the landing page with main elements', () => {
    render(<LandingPage />);
    
    expect(screen.getByText('LocusGen')).toBeInTheDocument();
    expect(screen.getByText('Create 3D Scenes with')).toBeInTheDocument();
    expect(screen.getByText('Natural Language')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the 3D scene/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('displays dark theme styling', () => {
    render(<LandingPage />);
    
    const mainContainer = screen.getByText('LocusGen').closest('div');
    expect(mainContainer).toHaveClass('text-white');
  });

  it('shows user welcome message when user is provided', () => {
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      cognitoSub: 'sub-123'
    };
    
    render(<LandingPage user={mockUser} />);
    
    expect(screen.getByText('Welcome back, John Doe')).toBeInTheDocument();
  });

  it('displays project thumbnails for authenticated users', () => {
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      cognitoSub: 'sub-123'
    };
    
    const mockProjects: Project[] = [
      {
        id: 'project-1',
        name: 'Living Room Scene',
        userId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'project-2',
        name: 'Forest Environment',
        userId: '1',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    ];
    
    render(<LandingPage user={mockUser} projects={mockProjects} />);
    
    expect(screen.getByText('Your Projects')).toBeInTheDocument();
    expect(screen.getByText('Living Room Scene')).toBeInTheDocument();
    expect(screen.getByText('Forest Environment')).toBeInTheDocument();
  });

  it('handles prompt input changes', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe the 3D scene/);
    await user.type(textarea, 'A cozy living room');
    
    expect(textarea).toHaveValue('A cozy living room');
  });

  it('disables submit button when prompt is empty', () => {
    render(<LandingPage />);
    
    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when prompt has content', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe the 3D scene/);
    const submitButton = screen.getByRole('button');
    
    await user.type(textarea, 'A cozy living room');
    
    expect(submitButton).not.toBeDisabled();
  });

  it('creates anonymous project and navigates on form submission', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe the 3D scene/);
    const submitButton = screen.getByRole('button');
    
    await user.type(textarea, 'A cozy living room with fireplace');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'project_test-uuid-123',
        expect.stringContaining('A cozy living room with fireplace')
      );
      expect(mockPush).toHaveBeenCalledWith(
        '/project/test-uuid-123?prompt=A%20cozy%20living%20room%20with%20fireplace'
      );
    });
  });

  it('shows loading state during form submission', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe the 3D scene/);
    const submitButton = screen.getByRole('button');
    
    await user.type(textarea, 'A cozy living room');
    await user.click(submitButton);
    
    // Check for loading spinner
    expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('truncates long prompts in project name', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    
    const longPrompt = 'A very long prompt that exceeds thirty characters and should be truncated';
    const textarea = screen.getByPlaceholderText(/Describe the 3D scene/);
    const submitButton = screen.getByRole('button');
    
    await user.type(textarea, longPrompt);
    await user.click(submitButton);
    
    await waitFor(() => {
      const setItemCall = sessionStorageMock.setItem.mock.calls[0];
      const projectData = JSON.parse(setItemCall[1]);
      expect(projectData.name).toBe('Scene from "A very long prompt that exceed..."');
    });
  });

  it('navigates to project when project thumbnail is clicked', async () => {
    const user = userEvent.setup();
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      cognitoSub: 'sub-123'
    };
    
    const mockProjects: Project[] = [
      {
        id: 'project-1',
        name: 'Living Room Scene',
        userId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];
    
    render(<LandingPage user={mockUser} projects={mockProjects} />);
    
    const projectThumbnail = screen.getByText('Living Room Scene').closest('div');
    await user.click(projectThumbnail!);
    
    expect(mockPush).toHaveBeenCalledWith('/project/project-1');
  });

  it('applies focus styles to prompt input', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe the 3D scene/);
    
    await user.click(textarea);
    
    expect(textarea).toHaveClass('focus:border-red-500', 'focus:ring-red-500/40');
  });

  it('prevents form submission with only whitespace', async () => {
    const user = userEvent.setup();
    render(<LandingPage />);
    
    const textarea = screen.getByPlaceholderText(/Describe the 3D scene/);
    const submitButton = screen.getByRole('button');
    
    await user.type(textarea, '   ');
    
    expect(submitButton).toBeDisabled();
  });
});