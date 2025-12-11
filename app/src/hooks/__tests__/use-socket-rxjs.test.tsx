/**
 * Tests for useSocketRxJS hook
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSocketRxJS } from '../use-socket-rxjs';
import { getSocketService, resetSocketService } from '@/lib/socket-service';
import { useCurrentAccount } from '@mysten/dapp-kit';

// Mock @mysten/dapp-kit
jest.mock('@mysten/dapp-kit', () => ({
  useCurrentAccount: jest.fn(),
}));

// Mock socket service
jest.mock('@/lib/socket-service', () => ({
  getSocketService: jest.fn(),
  resetSocketService: jest.fn(),
}));

const mockUseCurrentAccount = useCurrentAccount as jest.MockedFunction<typeof useCurrentAccount>;
const mockGetSocketService = getSocketService as jest.MockedFunction<typeof getSocketService>;

describe('useSocketRxJS', () => {
  const mockSocketService = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    isConnected: jest.fn(() => false),
    connection$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    },
    transactionResult$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      pipe: jest.fn(),
    },
    transactionQueued$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    },
    transactionProcessing$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    },
    mintTaskQueued$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    },
    mintError$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    },
    mintNow$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      pipe: jest.fn(),
    },
    error$: {
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    },
    filterTransactionResult: jest.fn(),
    filterTransactionResultByPrefix: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSocketService.mockReturnValue(mockSocketService as any);
    mockUseCurrentAccount.mockReturnValue({
      address: '0x123',
    } as any);
  });

  afterEach(() => {
    resetSocketService();
  });

  it('should connect when currentAccount is available', () => {
    renderHook(() => useSocketRxJS());

    expect(mockSocketService.connect).toHaveBeenCalledWith('0x123');
  });

  it('should not connect when currentAccount is not available', () => {
    mockUseCurrentAccount.mockReturnValue(null);

    renderHook(() => useSocketRxJS());

    expect(mockSocketService.connect).not.toHaveBeenCalled();
  });

  it('should disconnect on cleanup', () => {
    const { unmount } = renderHook(() => useSocketRxJS());

    unmount();

    expect(mockSocketService.disconnect).toHaveBeenCalledWith('0x123');
  });

  it('should return socket service and observables', () => {
    const { result } = renderHook(() => useSocketRxJS());

    expect(result.current.socketService).toBe(mockSocketService);
    expect(result.current.transactionResult$).toBeDefined();
    expect(result.current.emit).toBeDefined();
    expect(result.current.isConnected).toBeDefined();
  });

  it('should emit events', () => {
    const { result } = renderHook(() => useSocketRxJS());

    result.current.emit('test-event', { data: 'test' });

    expect(mockSocketService.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
  });
});

