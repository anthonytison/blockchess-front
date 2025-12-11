import { useQuery } from '@tanstack/react-query';
import { PlayerEntity } from "@/domain/entities";
import { RewardConfig, rewardsList } from "@/lib/blockchain/rewards";
import { mintNftTransaction } from "@/lib/sui-transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useTranslations } from "next-intl";
import { useMemo } from 'react';
import { saveReward, shouldEarnReward } from '@/app/actions/reward';
import { SuiEvent, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { useToast } from '@/app/context/toast-provider';
import {  SuiGraphQLClient } from '@mysten/sui/graphql';
import { useMemo as useReactMemo } from 'react';

export interface ResultJson {
  game_id: string
  player1?: string
  player?: string
  is_computer?: boolean
  move_number?: number
  move_san?: string
  fen?: string
  move_hash?: string
  timestamp?: number
  winner?: string
  mode?: Record<string, Record<string, string>>
  difficulty?: Record<string, Record<string, string>>
  created_at?: number
}

interface EventNodeContents {
  type: {
    repr: string
  }
  json: ResultJson
}

interface EventNodeTx {
  bcs: string
  timestamp: string
  contents: EventNodeContents
}

interface TransactionBlockEffectsEvents {
  nodes: EventNodeTx[];
}

interface TransactionBlockEffects {
  events: TransactionBlockEffectsEvents;
}

interface TransactionBlockSender {
  address: string;
}

export interface TransactionBlock {
  digest: string;
  bcs: string;
  signatures: string[];
  sender?: TransactionBlockSender;
  effects?: TransactionBlockEffects;
}

/**
 * Get GraphQL endpoint URL for the current network
 * Returns null if GraphQL is not available (e.g., on localnet)
 */
function getGraphQLEndpoint(): string | null {
  const networkType = process.env.NEXT_PUBLIC_SUI_NETWORK_TYPE || 'localnet';
  
  // Sui Explorer GraphQL endpoints
  switch (networkType) {
    case 'testnet':
      return 'https://graphql.testnet.sui.io/graphql';
    case 'mainnet':
      return 'https://graphql.sui.io/graphql';
    case 'localnet':
    default:
      // Localnet typically doesn't have GraphQL endpoint, return null to use RPC fallback
      return process.env.NEXT_PUBLIC_SUI_NETWORK_GRAPHQL_URL as string;
  }
}

export function useBlockchain() {
    
    const t = useTranslations();
    
    const { showSuccess } = useToast();

    const packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID;

    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const suiClient = useSuiClient();
    
    // Create GraphQL client (only if endpoint is available)
    const graphqlClient = useReactMemo(() => {
      const graphqlUrl = getGraphQLEndpoint();
      if (!graphqlUrl) {
        return null;
      }
      return new SuiGraphQLClient({ url: graphqlUrl });
    }, []);

    /**
     * Helper function to wait for transaction to be indexed
     * @param digest string
     * @param maxRetries number
     * @param delay number
     * @returns 
     */
    const waitForTransaction = async (digest: string, maxRetries = 10, delay = 1000): Promise<SuiTransactionBlockResponse | null> => {
      let useGraphQL = true;
      let graphQLAttempted = false;

      for (let i = 0; i < maxRetries; i++) {
        try {
          // Try GraphQL first (only once), then fallback to RPC
          if (useGraphQL && !graphQLAttempted && graphqlClient) {
            graphQLAttempted = true;
            try {
              const result = await graphqlClient.query({
                query: `
                  query GetTransaction($digest: String!) {
                    transactionBlock(digest: $digest) {
                      digest
                      effects {
                        status {
                          status
                        }
                      }
                      objectChanges {
                        type
                        objectType
                        objectId
                        owner {
                          ... on AddressOwner {
                            owner {
                              address
                            }
                          }
                        }
                      }
                      events {
                        type
                        parsedJson
                      }
                    }
                  }
                `,
                variables: { digest },
              });

              if (result.data?.transactionBlock) {
                // Transform GraphQL response to match SuiTransactionBlockResponse format
                const txBlock = result.data.transactionBlock;
                return {
                  digest: txBlock.digest,
                  effects: txBlock.effects ? {
                    status: txBlock.effects.status,
                  } : undefined,
                  objectChanges: txBlock.objectChanges || [],
                  events: txBlock.events || [],
                } as any;
              }
            } catch (graphqlError: any) {
              // GraphQL failed, switch to RPC for all subsequent attempts
              useGraphQL = false;
            }
          }

          // Use RPC (either because GraphQL failed or we're retrying)
          const txResponse = await suiClient.getTransactionBlock({
            digest,
            options: {
              showEffects: true,
              showObjectChanges: true,
              showInput: true,
              showEvents: true,
              showBalanceChanges: true,
            },
          });
          return txResponse;
        } catch (error: any) {
          if (i === maxRetries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5; // Exponential backoff
        }
      }
      return null;
    };

    /**
     * Validate transaction and return the object id
     * @param digest string
     * @param objectType string
     * @param type string
     * @param errorMessage string
     * @returns string
     */
    const validateTransaction = async ({digest, objectType, type, errorMessage}: {digest: string, objectType: string, type: string, errorMessage?: string}): Promise<string> => {
      const txResponse: SuiTransactionBlockResponse | null = await waitForTransaction(digest);

      if(!txResponse) {
        throw new Error(t(`errors.${errorMessage ? errorMessage : 'transactionFailed'}`));
      }

      if (txResponse.effects && txResponse.effects.status.status !== "success") {
        throw new Error(t(`errors.${errorMessage ? errorMessage : 'transactionFailed'}`));
      }
      // Find the created Game object
      // First, try to find the Game object by looking for the exact objectType match
      let responseObject = txResponse.objectChanges?.find(
          (change: any) => {
            const isCorrectType = change.type === type;
            const hasCorrectObjectType = change.objectType && 
              (change.objectType.endsWith(objectType) || change.objectType.includes(objectType));
            return isCorrectType && hasCorrectObjectType;
          }
        );
      
      // If not found, also check the GameCreated event to get the game_id
      if (!responseObject || !('objectId' in responseObject)) {
        const gameCreatedEvent = txResponse.events?.find(
          (event: any) => event.type?.includes('GameCreated')
        );
        if (gameCreatedEvent && gameCreatedEvent.parsedJson?.game_id) {
          // Return the game_id from the event as fallback
          return gameCreatedEvent.parsedJson.game_id;
        }
      }
      
      if (!responseObject || !('objectId' in responseObject)) {
        throw new Error(t(`errors.${errorMessage ? errorMessage : 'objectNotFound'}`));
      }
      
      const objectId = responseObject.objectId;
      return objectId;
    }

    /**
     * Load events from the blockchain for a game
     * Queries all transaction blocks that changed the game object
     * @param gameObjectId string - Game object ID to query events for
     * @param isCheckmate boolean
     * @returns { events: TransactionBlock[], isLoading: boolean, error: Error | null, refetch: () => void }
     */
    const useLoadEvents = (gameObjectId: string | undefined, isCheckmate: boolean): { events: TransactionBlock[], isLoading: boolean, error: Error | null, refetch: () => void } => {
      // Load events from blockchain using game object ID
      const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['loadEventsByGameObjectId', gameObjectId, packageId],
        queryFn: async () => {
          if (!gameObjectId) {
            return { data: [] as TransactionBlock[] };
          }

          // Try GraphQL first if available
          if (graphqlClient) {
            try {
              const results = await graphqlClient.query<{ transactionBlocks: { nodes: TransactionBlock[] } }>({
                  query: `
                    query getTransactionBlocks($gameObjectId: SuiAddress!) {
                      transactionBlocks(filter: {
                        changedObject: $gameObjectId
                      }) {
                        nodes {
                                digest
                          bcs
                          signatures
                          sender {
                            address
                          }
    											effects {
                            events {
                              nodes {
                                timestamp
                                bcs
                                contents {
                                  type {
                                    repr
                                  }
                                  json
                                }
                                }
                              }
                            }
                          }
                        }
                      }
                  `,
                variables: { gameObjectId },
                });

              const allEvents: TransactionBlock[] = results.data?.transactionBlocks?.nodes || [];

              if (allEvents.length > 0) {
                return { data: allEvents };
              }
            } catch (err) {
              // GraphQL query failed, falling back to SuiClient
            }
          }
          
          // Fallback: Use SuiClient to query events by game object ID
          try {
            // Try complex query first
            let eventsResult;
            try {
              eventsResult = await suiClient.queryEvents({
                query: {
                  All: [
                    {
                      Any: [
                        { MoveEventType: `${packageId}::game::GameCreated` },
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
            } catch (queryError) {
              // Fallback: query module and filter client-side
              try {
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
                
                // Filter client-side by game_id
                eventsResult = {
                  ...result,
                  data: result.data.filter((event: any) => {
                    return event.parsedJson?.game_id === gameObjectId;
                  }),
                };
              } catch (fallbackError) {
                // Both queries failed, log and return empty result
                console.error('[useLoadEvents] Both query attempts failed:', {
                  originalError: queryError,
                  fallbackError: fallbackError,
                  gameObjectId,
                  packageId,
                });
                // Return empty result instead of throwing
                eventsResult = {
                  data: [],
                  nextCursor: null,
                  hasNextPage: false,
                };
              }
            }

            // Get transaction digests from events
            const digests = new Set<string>();
            eventsResult.data.forEach((event: SuiEvent) => {
              if (event.id.txDigest) {
                digests.add(event.id.txDigest);
              }
            });

            // Fetch full transaction blocks for each digest
            const transactionBlocks: TransactionBlock[] = [];
            for (const digest of Array.from(digests)) {
              try {
                const txBlock = await suiClient.getTransactionBlock({
                  digest,
                  options: {
                    showEffects: true,
                    showEvents: true,
                    showInput: false,
                  },
                });

                // Transform to TransactionBlock format
                if (txBlock.effects && txBlock.events) {
                  const transformedBlock: TransactionBlock = {
                    digest: txBlock.digest,
                    bcs: '',
                    signatures: txBlock.transaction?.data?.txSignatures || [],
                    sender: txBlock.transaction?.data?.sender ? { address: txBlock.transaction.data.sender } : undefined,
                    effects: {
                      events: {
                        nodes: txBlock.events.map((event: SuiEvent) => {
                          // Convert timestamp from milliseconds to ISO string
                          const timestamp = event.timestampMs 
                            ? new Date(Number(event.timestampMs)).toISOString()
                            : '';
                          return {
                            bcs: '',
                            timestamp,
                            contents: {
                              type: {
                                repr: event.type,
                              },
                              json: event.parsedJson as ResultJson,
                            },
                          };
                        }),
                      },
                    },
                  };
                  transactionBlocks.push(transformedBlock);
                }
              } catch (err) {
                // Failed to fetch transaction block, skipping
              }
            }

            // Sort by timestamp (most recent first)
            transactionBlocks.sort((a, b) => {
              const timeA = a.effects?.events?.nodes[0]?.timestamp || '';
              const timeB = b.effects?.events?.nodes[0]?.timestamp || '';
              return timeB.localeCompare(timeA);
            });

            return { data: transactionBlocks };
          } catch (err) {
            console.error('[useLoadEvents] Failed to query events using SuiClient', err);
            return { data: [] as TransactionBlock[] };
          }
        },
        refetchInterval: !isCheckmate ? 10000 : false,
        enabled: !!packageId && !!gameObjectId,
        staleTime: 0, // Always consider data stale to ensure fresh fetch on mount
        gcTime: 30000, // Keep in cache for 30 seconds
      });

      const events = useMemo(() => {
        if (!data?.data) {
          return [];
        }
        return data.data as TransactionBlock[];
      }, [data]);

      return {
        events,
        isLoading,
        error: error as Error | null,
        refetch,
      };
    }

    /**
     * Load nfts from the blockchain using GraphQL
     * @param suiAddress string
     * @returns { nfts: SuiEvent[], isLoading: boolean, error: Error | null, refetch: () => void }
     */
    const useLoadNfts = (suiAddress: string): { nfts: SuiEvent[], isLoading: boolean, error: Error | null, refetch: () => void } => {
      const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['loadNfts', suiAddress, packageId],
        queryFn: async () => {
          // Try GraphQL first if available
          if (graphqlClient) {
            try {
              const result = await graphqlClient.query({
                query: `
                  query GetBadgeEvents($eventType: String! $sender: SuiAddress! $first: Int) {
                  events(
                    filter: {
                      sender: $sender
                      eventType: $eventType
                    }
                    first: $first
                  ) {
                              nodes {
                                bcs timestamp
                                contents {
                                  type {
                                    repr
                                  }
                                  json
                                }
                              }
                  }
                }
              `,
              variables: {
                eventType: `${packageId}::badge::BadgeMinted`,
                sender: suiAddress,
                first: 50,
              },
            });

            // Filter events by recipient and transform to SuiEvent format
            const events = (result.data?.nodes || []).filter((event: any) => {
              return event.parsedJson?.recipient === suiAddress;
            }).map((event: any) => ({
              id: { txDigest: event.id, eventSeq: '0' },
              packageId: packageId!,
              transactionModule: 'badge',
              sender: event.senders?.[0]?.address || '',
              type: event.type?.repr || '',
              parsedJson: event.parsedJson,
              bcs: '',
              timestampMs: event.timestamp || null,
            }));

              return { data: events };
            } catch (err) {
              // GraphQL query failed, using fallback
            }
          }
          
          // Fallback to RPC (either GraphQL not available or failed)
          try {
            // Fallback to RPC
            const result = await suiClient.queryEvents({
              query: {
                MoveEventModule: {
                  package: packageId!,
                  module: 'badge',
                },
              },
              limit: 1000,
              order: 'ascending',
            });
            
            return {
              ...result,
              data: result.data.filter((event: any) => {
                return event.parsedJson?.recipient === suiAddress;
              }),
            };
          } catch (rpcErr: any) {
            throw rpcErr;
          }
        },
        refetchInterval: false,
        enabled: !!packageId && !!suiAddress,
      });

      const nfts = useMemo(() => {
        if (!data?.data) {
          return [];
        }
        return data.data;
      }, [data]);

      return {
        nfts,
        isLoading,
        error: error as Error | null,
        refetch,
      };
    }

    /**
     * Mint an nft
     * @param type string
     * @param player PlayerEntity | null
     * @returns Promise<void>
     */
    const mintNft = async (type: string, player: PlayerEntity | null): Promise<string> => {
      return new Promise(async (resolve, reject) => {
        if(typeof player?.suiAddress === 'undefined') {
          resolve('');
          return;
        }
        
        try {
          const rewardToEarn: string | null = await shouldEarnReward(player?.suiAddress as string, type);
          if (!rewardToEarn) {
            resolve('');
            return;
          }
          
          // Find reward by badge_type (what shouldEarnReward returns) instead of conditions.check
          const reward: RewardConfig | undefined  = rewardsList.find(reward => reward.nft.badge_type === rewardToEarn);
          if (!reward) {
            const error = new Error(`Reward not found for badge_type: ${rewardToEarn}`);
            console.error('[mintNft]', error.message);
            reject(error);
            return;
          }

          if (!player?.suiAddress) {
            const error = new Error('Player Sui address is required');
            console.error('[mintNft]', error.message);
            reject(error);
            return;
          }

          const txMintFirstGame: Transaction = mintNftTransaction(reward.nft, player.suiAddress);
          await signAndExecuteTransaction({ transaction: txMintFirstGame }, {
            onSuccess: async (result) => {
              try {
                const objectId: string = await validateTransaction({
                  digest: result.digest,
                  objectType: '::badge::Badge',
                  type: 'created',
                  errorMessage: 'badgeObjectNotFound'
                });
                
                await saveReward({
                  type: rewardToEarn, // Use badge_type (e.g., "first_game_won") instead of "wins"
                  playerId: player?.id as string,
                  objectId
                })
                
                // Show success toast for NFT minted with reward name (not badge_type)
                showSuccess(t('toast.nftMinted', { type: reward.nft.name }));
                
                resolve(objectId);
              } catch (error) {
                console.error('[mintNft] Error in onSuccess callback:', error);
                reject(error);
              }
            },
            onError: (error) => {
              console.error('[mintNft] Transaction error:', error);
              reject(error);
            }
          });
        } catch (error) {
          console.error('[mintNft] Error creating or executing transaction:', error);
          reject(error);
        }
      });
    }

    /**
     * Get transaction details from blockchain using GraphQL
     * @param txDigest string
     * @returns { transaction: TransactionDetails | null, isLoading: boolean, error: Error | null }
     */
    const useTransactionDetails = (txDigest: string | null): { transaction: any | null, isLoading: boolean, error: Error | null } => {
      const { data, isLoading, error } = useQuery({
        queryKey: ['transactionDetailsGql', txDigest],
        queryFn: async () => {
          if (!txDigest) return null;

          // Try GraphQL first, but immediately fallback to RPC if it fails or GraphQL is not available
          if (graphqlClient) {
            try {
              const result = await graphqlClient.query({
              query: `
                query GetTransactionDetails($digest: String!) {
                  transactionBlock(digest: $digest) {
                    digest
                    checkpoint {
                      sequenceNumber
                      timestamp
                    }
                    sender {
                      address
                    }
                    effects {
                      status {
                        status
                      }
                      gasUsed {
                        computationCost
                        storageCost
                        storageRebate
                      }
                      gasObject {
                        owner {
                          ... on AddressOwner {
                            owner {
                              address
                            }
                          }
                        }
                      }
                    }
                    objectChanges {
                      type
                      objectId
                      objectType
                      owner {
                        ... on AddressOwner {
                          owner {
                            address
                          }
                        }
                      }
                    }
                    events {
                      id
                      type {
                        repr
                      }
                      parsedJson
                    }
                    balanceChanges {
                      owner {
                        ... on AddressOwner {
                          owner {
                            address
                          }
                        }
                      }
                      amount
                      coinType {
                        repr
                      }
                    }
                  }
                }
              `,
              variables: { digest: txDigest },
            });

            if (!result.data?.transactionBlock) {
              throw new Error('Transaction not found');
            }

            const txBlock = result.data.transactionBlock;
            const checkpoint = txBlock.checkpoint;
            const sender = txBlock.sender?.address || null;
            const effects = txBlock.effects;
            
            // Find recipient and badge object from object changes
            let recipient: string | null = null;
            let badgeObjectId: string | null = null;
            
            if (txBlock.objectChanges) {
              const createdObject = txBlock.objectChanges.find(
                (change: any) => change.type === 'created' && change.objectType?.includes('badge::Badge')
              );
              if (createdObject) {
                badgeObjectId = createdObject.objectId || null;
                if (createdObject.owner?.__typename === 'AddressOwner') {
                  recipient = createdObject.owner.owner?.address || null;
                }
              }
            }

            // If recipient not found in object changes, try to get it from events
            if (!recipient && txBlock.events) {
              const badgeEvent = txBlock.events.find(
                (event: any) => event.type?.repr?.includes('badge::BadgeMinted')
              );
              if (badgeEvent?.parsedJson && typeof badgeEvent.parsedJson === 'object' && 'recipient' in badgeEvent.parsedJson) {
                recipient = (badgeEvent.parsedJson as any).recipient;
              }
            }

            const gasUsed = effects?.gasUsed 
              ? String((effects.gasUsed.computationCost || 0) + (effects.gasUsed.storageCost || 0) - (effects.gasUsed.storageRebate || 0))
              : null;

            const gasFee = gasUsed;

            const status = effects?.status?.status || null;

            return {
              transactionHash: txBlock.digest,
              blockNumber: checkpoint?.sequenceNumber ? String(checkpoint.sequenceNumber) : null,
              timestamp: checkpoint?.timestamp 
                ? new Date(Number(checkpoint.timestamp)).toISOString() 
                : new Date().toISOString(),
              sender,
              recipient,
              gasUsed,
              gasFee,
              status,
              events: (txBlock.events || []).map((event: any) => ({
                id: { txDigest: event.id, eventSeq: '0' },
                type: event.type?.repr || '',
                parsedJson: event.parsedJson,
              })),
              objectChanges: txBlock.objectChanges || [],
              balanceChanges: txBlock.balanceChanges || [],
              badgeObjectId,
              rawTransaction: txBlock,
            };
            } catch (graphqlErr: any) {
              // GraphQL failed - fallback to RPC
            }
          }
          
          // Use RPC (either GraphQL not available, or GraphQL failed)
          try {
            // Fallback to RPC
            const txResponse: SuiTransactionBlockResponse = await suiClient.getTransactionBlock({
              digest: txDigest,
              options: {
                showEffects: true,
                showObjectChanges: true,
                showInput: true,
                showEvents: true,
                showBalanceChanges: true,
              },
            });

            const transactionHash = txDigest;
            const blockNumber = txResponse.checkpoint ? String(txResponse.checkpoint) : null;
            const timestamp = txResponse.timestampMs 
              ? new Date(Number(txResponse.timestampMs)).toISOString() 
              : (txResponse.timestampMs === null ? null : new Date().toISOString());
            const sender = (txResponse.transaction?.data as any)?.sender || null;
            
            let recipient: string | null = null;
            let badgeObjectId: string | null = null;
            
            if (txResponse.objectChanges) {
              const createdObject = txResponse.objectChanges.find(
                (change: any) => change.type === 'created' && change.objectType?.includes('badge::Badge')
              );
              if (createdObject && 'objectId' in createdObject) {
                badgeObjectId = createdObject.objectId;
                if ('owner' in createdObject) {
                  if (typeof createdObject.owner === 'string') {
                    recipient = createdObject.owner;
                  } else if (createdObject.owner && 'AddressOwner' in createdObject.owner) {
                    recipient = createdObject.owner.AddressOwner;
                  }
                }
              }
            }

            if (!recipient && txResponse.events) {
              const badgeEvent = txResponse.events.find(
                (event: any) => event.type?.includes('badge::BadgeMinted')
              );
              if (badgeEvent && badgeEvent.parsedJson && typeof badgeEvent.parsedJson === 'object' && 'recipient' in badgeEvent.parsedJson) {
                recipient = (badgeEvent.parsedJson as any).recipient;
              }
            }

            const gasUsed = txResponse.effects?.gasUsed 
              ? String((txResponse.effects.gasUsed as any).totalGasUsed || txResponse.effects.gasUsed.computationCost || '0') 
              : null;

            const gasFee = txResponse.effects 
              ? String((txResponse.effects as any).gasFeeSummary?.totalGasCost || (txResponse.effects as any).gasUsed?.totalGasUsed || '0') 
              : null;

            const status = txResponse.effects?.status?.status || null;

            return {
              transactionHash,
              blockNumber,
              timestamp,
              sender,
              recipient,
              gasUsed,
              gasFee,
              status,
              events: txResponse.events || [],
              objectChanges: txResponse.objectChanges || [],
              balanceChanges: txResponse.balanceChanges || [],
              badgeObjectId,
              rawTransaction: txResponse,
            };
          } catch (rpcErr: any) {
            throw rpcErr;
          }
        },
        enabled: !!txDigest,
        retry: 2,
      });

      return {
        transaction: data || null,
        isLoading,
        error: error as Error | null,
      };
    }

    /**
     * Get badge NFT object from blockchain using GraphQL
     * @param badgeId string
     * @returns { badge: BadgeObject | null, isLoading: boolean, error: Error | null }
     */
    const useBadgeObject = (badgeId: string | null): { badge: any | null, isLoading: boolean, error: Error | null } => {
      const { data, isLoading, error } = useQuery({
        queryKey: ['badgeObjectGql', badgeId],
        queryFn: async () => {
          if (!badgeId) return null;

          // Try GraphQL first if available
          if (graphqlClient) {
            try {
              const result = await graphqlClient.query({
                query: `
                  query GetBadgeObject($objectId: ID!) {
                  object(address: $objectId) {
                    address
                    version
                    owner {
                      ... on AddressOwner {
                        owner {
                          address
                        }
                      }
                    }
                    previousTransactionBlock {
                      digest
                    }
                    asMoveObject {
                      contents {
                        ... on MoveValue {
                          type {
                            repr
                          }
                          bcs
                          data
                        }
                      }
                    }
                    display {
                      key
                      value
                    }
                  }
                }
              `,
              variables: { objectId: badgeId },
            });

            const obj = result.data?.object;
            if (!obj || !obj.asMoveObject) {
              return null;
            }

            const moveObject = obj.asMoveObject;
            const contents = moveObject.contents;
            const fields: any = {};

            // Parse BCS data or use data field if available
            if (contents && Array.isArray(contents)) {
              contents.forEach((field: any) => {
                if (field.data && typeof field.data === 'object') {
                  Object.assign(fields, field.data);
                }
              });
            }

            // Parse display data from key-value pairs
            const displayData: any = {};
            if (obj.display && Array.isArray(obj.display)) {
              obj.display.forEach((entry: any) => {
                if (entry.key && entry.value) {
                  displayData[entry.key] = entry.value;
                }
              });
            }

            const owner = obj.owner?.__typename === 'AddressOwner' 
              ? obj.owner.owner?.address 
              : undefined;

            return {
              objectId: obj.address || badgeId,
              badge_type: fields?.badge_type || '',
              recipient: fields?.recipient || '',
              name: displayData?.name || fields?.name || '',
              description: displayData?.description || fields?.description || '',
              image_url: displayData?.image_url || displayData?.imageUrl || fields?.image_url || '',
              minted_at: Number(fields?.minted_at) || 0,
              owner,
              version: obj.version,
              previousTransaction: obj.previousTransactionBlock?.digest || null,
              createdAt: null,
            };
            } catch (err) {
              console.error('Error fetching badge object via GraphQL, falling back to RPC:', err);
            }
          }
          
          // Fallback to RPC (either GraphQL not available or failed)
          try {
            // Fallback to RPC
            const objectResponse = await suiClient.getObject({
              id: badgeId,
              options: {
                showType: true,
                showOwner: true,
                showPreviousTransaction: true,
                showDisplay: true,
                showContent: true,
                showBcs: false,
                showStorageRebate: true,
              },
            });

            if (objectResponse.data && 'content' in objectResponse.data && objectResponse.data.content) {
              const content = objectResponse.data.content;
              if (content.dataType === 'moveObject' && 'fields' in content) {
                const fields = (content as any).fields;
                return {
                  objectId: badgeId,
                  badge_type: fields?.badge_type || '',
                  recipient: fields?.recipient || '',
                  name: fields?.name || '',
                  description: fields?.description || '',
                  image_url: fields?.image_url || '',
                  minted_at: Number(fields?.minted_at) || 0,
                  owner: objectResponse.data.owner 
                    ? (typeof objectResponse.data.owner === 'string' 
                        ? objectResponse.data.owner 
                        : (objectResponse.data.owner as any).AddressOwner)
                    : undefined,
                  version: objectResponse.data.version,
                  previousTransaction: objectResponse.data.previousTransaction,
                  createdAt: null,
                };
              }
            }
            return null;
          } catch (rpcErr: any) {
            throw rpcErr;
          }
        },
        enabled: !!badgeId,
        retry: 2,
      });

      return {
        badge: data || null,
        isLoading,
        error: error as Error | null,
      };
    }

    return { 
      signAndExecuteTransaction, 
      mintNft, 
      waitForTransaction, 
      validateTransaction, 
      useLoadEvents, 
      useLoadNfts,
      useTransactionDetails,
      useBadgeObject,
    };
}

