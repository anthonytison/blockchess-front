"use client";

import { SuiClientProvider, WalletProvider, lightTheme,  } from "@mysten/dapp-kit";
import { TNetwork, networkConfig } from "@/lib/blockchain/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import '@mysten/dapp-kit/dist/index.css';
export function SuiProviders({ children }: { children: ReactNode }) {
  
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={process.env.NEXT_PUBLIC_SUI_NETWORK_TYPE as TNetwork}>
        <WalletProvider
          autoConnect
          theme={lightTheme}>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}