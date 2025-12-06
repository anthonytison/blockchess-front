"use client";

import { useState, useEffect, useMemo } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useTranslations } from "next-intl";
import { useBlockchain } from "@/hooks/blockchain";
import { StatisticsCards } from "@/components/rewards/statistics-cards";
import { RewardCard } from "@/components/rewards/reward-card";
import { AvailableRewardCard } from "@/components/rewards/available-reward-card";
import { TransactionModal } from "@/components/rewards/transaction-modal";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

interface PlayerStatistics {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
}

interface Reward {
  badge_type: string;
  name: string;
  description: string;
  sourceUrl: string;
  isEarned: boolean;
  earnedAt: string | null;
  objectId: string | null;
}

interface RewardsData {
  statistics: PlayerStatistics;
  rewards: Reward[];
  earnedCount: number;
}

export function RewardsContent() {
  const t = useTranslations();
  const currentAccount = useCurrentAccount();

  const [data, setData] = useState<RewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [transactionDigest, setTransactionDigest] = useState<string | null>(null);
  const [badgeObjectId, setBadgeObjectId] = useState<string | null>(null);

  const { useLoadNfts, useTransactionDetails, useBadgeObject } = useBlockchain();
  const {
    nfts,
    isLoading: isLoadingNfts,
    error: errorNfts,
    refetch,
  } = useLoadNfts(currentAccount?.address as string);

  const { transaction, isLoading: isLoadingTransaction, error: transactionError } =
    useTransactionDetails(transactionDigest);
  const { badge, isLoading: isLoadingBadge } = useBadgeObject(badgeObjectId);

  const rewardToTxDigestMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!nfts || !data) return map;

    nfts.forEach((nft: any) => {
      const objectId = nft.parsedJson?.badge_id;
      const txDigest = nft.id?.txDigest;

      if (objectId && txDigest) {
        map.set(objectId, txDigest);
      }
    });

    return map;
  }, [nfts, data]);

  // Use badge's previousTransaction as fallback if transaction digest is not available from mapping
  useEffect(() => {
    if (badge?.previousTransaction && !transactionDigest) {
      setTransactionDigest(badge.previousTransaction);
    }
  }, [badge?.previousTransaction, transactionDigest]);

  useEffect(() => {
    const loadRewards = async () => {
      if (!currentAccount?.address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { getRewards } = await import("@/app/actions/reward");
        const rewardsData = await getRewards({ suiAddress: currentAccount.address });
        setData(rewardsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load rewards");
      } finally {
        setIsLoading(false);
      }
    };

    if (currentAccount) {
      loadRewards();
    }
  }, [currentAccount]);

  if (!currentAccount) return null;

  if (isLoading || isLoadingNfts) {
    return (
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <LoadingState />
      </main>
    );
  }

  if (error || errorNfts) {
    return (
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <ErrorState
          error={error || errorNfts}
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  const handleViewTransaction = (reward: Reward) => {
    setSelectedReward(reward);
    if (reward.objectId) {
      const txDigest = rewardToTxDigestMap.get(reward.objectId);
      // Only set transaction digest if we have a value from the mapping
      // This prevents trying to fetch a transaction that doesn't exist
      setTransactionDigest(txDigest ?? null);
      setBadgeObjectId(reward.objectId);
    } else {
      setTransactionDigest(null);
      setBadgeObjectId(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedReward(null);
    setTransactionDigest(null);
    setBadgeObjectId(null);
  };

  if (!data) {
    return null;
  }

  return (
    <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 max-w-6xl">
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t("page.rewards.header")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t("page.rewards.description")}</p>
        </div>

        <StatisticsCards statistics={data.statistics} />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <h2 className="text-xl sm:text-2xl font-semibold">{t("rewards.title")}</h2>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {t("rewards.earnedCount", {
                count: data.earnedCount,
                total: data.rewards.length,
              })}
            </div>
          </div>

          {data.rewards.filter((r) => r.isEarned).length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="text-base sm:text-lg font-medium">{t("rewards.earned")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {data.rewards
                  .filter((reward) => reward.isEarned)
                  .map((reward) => (
                    <RewardCard
                      key={reward.badge_type}
                      reward={reward}
                      onViewTransaction={() => handleViewTransaction(reward)}
                    />
                  ))}
              </div>
            </div>
          )}

          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-medium">{t("rewards.available")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {data.rewards
                .filter((reward) => !reward.isEarned)
                .map((reward) => (
                  <AvailableRewardCard key={reward.badge_type} reward={reward} />
                ))}
            </div>
          </div>
        </div>
      </div>

      <TransactionModal
        open={selectedReward !== null}
        onOpenChange={handleCloseModal}
        transaction={transaction}
        badge={badge}
        isLoading={isLoadingTransaction || isLoadingBadge}
        error={transactionDigest ? transactionError : null}
        hasTransactionDigest={!!transactionDigest || !!badge?.previousTransaction}
      />
    </main>
  );
}

