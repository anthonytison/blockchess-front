import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

export type TNetwork = 'localnet' | 'testnet' | 'mainnet';

export interface ISuiVariant {
  variant: string
  fields: Record<string, unknown>
}

export interface ISuiGame {
  created_at: string
  difficulty: ISuiVariant
  game_id: string
  mode: ISuiVariant
  player1: string
  player2: string
}

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    localnet: {
      url: getFullnodeUrl("localnet"),
      variables: {
        packageId: process.env.NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID as string,
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        packageId: process.env.NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID as string,
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        packageId: process.env.NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID as string,
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
