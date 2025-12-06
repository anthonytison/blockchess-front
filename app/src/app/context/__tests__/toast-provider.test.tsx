/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from '../toast-provider';
import { useBlockchain } from '@/hooks/blockchain';

// Mock dependencies
jest.mock('@/hooks/blockchain');
jest.mock('@/components/ui/toast', () => ({
  Toast: ({ toast, onDismiss }: any) => (
    <div data-testid={`toast-${toast.id}`} onClick={() => onDismiss(toast.id)}>
      {toast.message}
    </div>
  ),
}));

const mockMintNft = jest.fn();

function TestComponent() {
  const { showSuccess, showError, showInfo } = useToast();
  
  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useBlockchain as jest.Mock).mockReturnValue({
      mintNft: mockMintNft,
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  it('should render children', () => {
    render(
      <ToastProvider>
        <div>Test Content</div>
      </ToastProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('should show error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Error');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('should show info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Info');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('should dismiss toast after duration', async () => {
    jest.useFakeTimers();
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    button.click();

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('should allow manual dismiss', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    button.click();

    await waitFor(() => {
      const toast = screen.getByTestId(/toast-/);
      expect(toast).toBeInTheDocument();
      
      // Click to dismiss
      toast.click();
    });

    await waitFor(() => {
      expect(screen.queryByTestId(/toast-/)).not.toBeInTheDocument();
    });
  });
});

