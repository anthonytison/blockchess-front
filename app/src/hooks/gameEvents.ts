import { useSuiClient } from '@mysten/dapp-kit';
import { SuiEvent } from '@mysten/sui/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

function useGameEvents(gameObjectId: string, isCheckmate: boolean): {
  events: SuiEvent[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID;
  const suiClient = useSuiClient();

  // Use React Query directly with SuiClient
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['gameEvents', gameObjectId, packageId],
    queryFn: async () => {
      try {
        // Try complex query first
        return await suiClient.queryEvents({
          query: {
            All: [
              {
                Any: [
                  { MoveEventType: `${packageId}::game::GameCreated` },
                  { MoveEventType: `${packageId}::badge::BadgeMinted` },
                  { MoveEventType: `${packageId}::game::PlayerJoined` },
                  { MoveEventType: `${packageId}::game::MovePlayed` },
                  { MoveEventType: `${packageId}::game::GameCancelled` },
                  { MoveEventType: `${packageId}::game::GameEnded` },
                ],
              },
              {
                MoveEventField: {
                  path: '/game_id',
                  value: gameObjectId,
                },
              },
            ],
          } as any,
          limit: 100,
          order: 'ascending',
        });
      } catch (err) {
        // Fallback: query module and filter client-side
        console.warn('Complex query failed, using fallback', err);
        const result = await suiClient.queryEvents({
          query: {
            MoveEventModule: {
              package: packageId!,
              module: 'game',
            },
          },
          limit: 1000,
          order: 'ascending',
        });
        
        // Filter client-side
        return {
          ...result,
          data: result.data.filter((event: any) => {
            return event.parsedJson?.game_id === gameObjectId;
          }),
        };
      }
    },
    refetchInterval: !isCheckmate ? 10000 : false,
    enabled: !!packageId && !!gameObjectId,
  });

  // Organize events by type
  const events = useMemo(() => {
    if (!data?.data) {
        return []
    }

    return data.data
  }, [data]);

  return {
    events,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

export default useGameEvents;
