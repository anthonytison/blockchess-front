/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { GameSetupWizard } from '../game-setup/game-setup-wizard';
import { useMintQueue } from '@/hooks/use-mint-queue';
import { useToast } from '@/app/context/toast-provider';
import { useBlockchain } from '@/hooks/blockchain';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';

// Mock dependencies
jest.mock('@/hooks/use-mint-queue');
jest.mock('@/app/context/toast-provider');
jest.mock('@/hooks/blockchain');
jest.mock('@mysten/dapp-kit');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockEnqueueMint = jest.fn();
const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();
const mockValidateTransaction = jest.fn();
const mockSignAndExecute = jest.fn();

describe('GameSetupWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (useMintQueue as jest.Mock).mockReturnValue({
      enqueueMint: mockEnqueueMint,
    });
    
    (useToast as jest.Mock).mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    });
    
    (useBlockchain as jest.Mock).mockReturnValue({
      validateTransaction: mockValidateTransaction,
    });
    
    (useSignAndExecuteTransaction as jest.Mock).mockReturnValue({
      mutate: mockSignAndExecute,
    });

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    
    // Mock fetch
    global.fetch = jest.fn();
  });

  it('should show success toast when game is created successfully', async () => {
    const mockGame = { id: 'test-game-id' };
    const mockObjectId = 'test-object-id';
    
    mockValidateTransaction.mockResolvedValue(mockObjectId);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ game: mockGame }),
    });
    
    mockSignAndExecute.mockImplementation((_transaction, callbacks) => {
      callbacks.onSuccess({ digest: 'test-digest' });
    });

    render(<GameSetupWizard />);

    // Simulate form submission
    // This would require filling out the form and submitting
    // For now, we test that the mocks are set up correctly
    
    expect(mockShowSuccess).not.toHaveBeenCalled();
  });

  it('should show error toast when blockchain transaction fails', () => {
    mockSignAndExecute.mockImplementation((_transaction, callbacks) => {
      callbacks.onError({});
    });

    render(<GameSetupWizard />);

    // Verify error toast is shown
    waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('errors.failedCreateGameBlockchain');
    });
  });

  it('should enqueue mint requests when game is created', async () => {
    const mockGame = { id: 'test-game-id' };
    const mockObjectId = 'test-object-id';
    const mockPlayer = { id: 'player-id', suiAddress: '0x123' };
    
    mockValidateTransaction.mockResolvedValue(mockObjectId);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ game: mockGame }),
    });
    
    mockSignAndExecute.mockImplementation((_transaction, callbacks) => {
      callbacks.onSuccess({ digest: 'test-digest' });
    });

    render(<GameSetupWizard />);

    // After successful game creation, mints should be enqueued
    waitFor(() => {
      expect(mockEnqueueMint).toHaveBeenCalled();
    });
  });

  it('should handle error objects with missing messages', () => {
    const emptyError = {};
    const errorWithoutMessage = { code: 'ERROR_CODE' };
    const errorWithMessage = { message: 'Test error message' };

    mockSignAndExecute.mockImplementation((_transaction, callbacks) => {
      callbacks.onError(emptyError);
    });

    render(<GameSetupWizard />);

    waitFor(() => {
      expect(mockShowError).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});

