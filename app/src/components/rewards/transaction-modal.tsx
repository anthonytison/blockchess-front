'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TransactionDetails {
  transactionHash: string;
  blockNumber: string | null;
  timestamp: string | null;
  sender: string | null;
  recipient: string | null;
  gasUsed?: string | null;
  gasFee?: string | null;
  status?: string | null;
  badgeObjectId?: string | null;
  rawTransaction?: any;
}

interface BadgeObject {
  objectId: string;
  badge_type: string;
  recipient: string;
  name: string;
  description: string;
  image_url: string;
  minted_at: number;
  owner?: string;
  version?: string;
  previousTransaction?: string;
  createdAt?: string | null;
}

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionDetails | null;
  badge: BadgeObject | null;
  isLoading: boolean;
  error?: Error | null;
  hasTransactionDigest?: boolean;
}

export function TransactionModal({ open, onOpenChange, transaction, badge, isLoading, error, hasTransactionDigest = false }: TransactionModalProps) {
  const t = useTranslations();

  const getExplorerUrl = (hash: string) => {
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'localnet';
    const baseUrl = network === 'mainnet' 
      ? 'https://suiexplorer.com/txblock'
      : network === "localnet" ?
      'http://localhost:9001/txblock'
      : `https://suiexplorer.com/txblock?network=${network}`;
    return `${baseUrl}/${hash}`;
  };

  const getObjectExplorerUrl = (objectId: string) => {
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'localnet';
    const baseUrl = network === 'mainnet' 
      ? 'https://suiexplorer.com/object'
      : network === "localnet" ?
      'http://localhost:9001/object'
      : `https://suiexplorer.com/object?network=${network}`;
    return `${baseUrl}/${objectId}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{t('rewards.transactionDetails')}</DialogTitle>
        </DialogHeader>
        <DialogClose onClose={() => onOpenChange(false)} />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">{t('common.loading')}</span>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* NFT Information */}
            {badge && (
              <Card>
                <CardContent className="pt-4 sm:pt-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                      {badge.image_url && (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 mx-auto sm:mx-0">
                          <img
                            src={badge.image_url}
                            alt={badge.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 w-full sm:w-auto text-center sm:text-left">
                        <h3 className="text-lg sm:text-xl font-semibold mb-1">{badge.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{badge.description}</p>
                        {transaction?.timestamp && (
                          <p className="text-xs text-muted-foreground">
                            {t('rewards.createdAt')}: {new Date(transaction.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {badge.objectId && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t">
                        <code className="flex-1 text-xs break-all text-muted-foreground text-center sm:text-left">
                          {badge.objectId}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(getObjectExplorerUrl(badge.objectId), '_blank')}
                          className="shrink-0 w-full sm:w-auto"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          <span className="text-xs">View</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transaction Details */}
            {transaction ? (
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold">{t('rewards.transactionInfo')}</h4>
                
                {/* Transaction Hash */}
                {transaction.transactionHash && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium">{t('rewards.transactionHash')}:</span>
                    <code className="flex-1 text-xs break-all text-muted-foreground text-center sm:text-left">
                      {transaction.transactionHash}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(getExplorerUrl(transaction.transactionHash), '_blank')}
                      className="shrink-0 w-full sm:w-auto"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      <span className="text-xs">View</span>
                    </Button>
                  </div>
                )}
                
                {/* Raw Transaction Data */}
                {transaction.rawTransaction && (
                    <div className="pb-4 h-[300px] sm:h-[400px] md:h-[500px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words overflow-x-auto text-xs bg-slate-200 dark:bg-slate-900 p-2 sm:p-3 rounded">
                        {JSON.stringify(transaction.rawTransaction, null, 2)}
                      </pre>
                    </div>
                )}
              </div>
            ) : error && hasTransactionDigest ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">{t('rewards.transactionNotFound')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('rewards.transactionNotAvailable') || 'Transaction may not be indexed yet or may not exist on this network.'}
                </p>
              </div>
            ) : badge && !transaction && !hasTransactionDigest ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm mb-2">
                  {t('rewards.transactionNotAvailable') || 'Transaction details are not available for this badge.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  The transaction may still be processing or the NFT may not be fully indexed yet. Please try again in a few moments.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

