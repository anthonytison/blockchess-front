/**
 * @jest-environment jsdom
 */

// Mock all dependencies BEFORE any imports
jest.mock('@mysten/dapp-kit', () => ({
  useSignAndExecuteTransaction: jest.fn(() => ({
    mutate: jest.fn(),
  })),
  useSuiClient: jest.fn(() => ({
    queryEvents: jest.fn(),
    getTransactionBlock: jest.fn(),
    getObject: jest.fn(),
  })),
}));

jest.mock('next-intl', () => ({
  useTranslations: jest.fn(() => (key: string) => key),
}));

jest.mock('@mysten/sui/graphql', () => ({
  SuiGraphQLClient: jest.fn(),
}));

jest.mock('@/app/context/toast-provider', () => ({
  useToast: jest.fn(() => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
  })),
}));

jest.mock('@/app/actions/reward', () => ({
  saveReward: jest.fn(),
  shouldEarnReward: jest.fn(),
}));

jest.mock('@/lib/blockchain/rewards', () => ({
  rewardsList: [
    {
      nft: {
        badge_type: 'first_game_won',
        name: 'First Game Won',
      },
    },
  ],
}));

jest.mock('@/lib/sui-transactions', () => ({
  mintNftTransaction: jest.fn(() => ({})),
}));

// Now import after mocks
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBlockchain } from '../blockchain';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { useSuiClient } from '@mysten/dapp-kit';

// Setup mock implementations
const mockQuery = jest.fn();
const mockSuiClient = {
  queryEvents: jest.fn(),
  getTransactionBlock: jest.fn(),
  getObject: jest.fn(),
};

(SuiGraphQLClient as jest.MockedClass<typeof SuiGraphQLClient>).mockImplementation(() => ({
  query: mockQuery,
} as any));

(useSuiClient as jest.Mock).mockReturnValue(mockSuiClient);

// Mock environment variables
const originalEnv = process.env;

describe('useBlockchain', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUI_NETWORK_TYPE: 'testnet',
      NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID: '0x123',
      NEXT_PUBLIC_SUI_NETWORK_TESTNET_BADGE_REGISTRY_ID: '0xbadge_registry_testnet',
      SUI_NETWORK_URL: 'http://127.0.0.1:9000',
    };

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('GraphQL endpoint configuration', () => {
    it('should use testnet GraphQL endpoint for testnet', () => {
      process.env.NEXT_PUBLIC_SUI_NETWORK_TYPE = 'testnet';
      
      renderHook(() => useBlockchain(), { wrapper });
      
      expect(SuiGraphQLClient).toHaveBeenCalledWith({
        url: 'https://sui-testnet.suiexplorer.com/graphql',
      });
    });
  });
});
