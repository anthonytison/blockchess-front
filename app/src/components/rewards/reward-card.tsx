import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface Reward {
  badge_type: string;
  name: string;
  description: string;
  sourceUrl: string;
  isEarned: boolean;
  earnedAt: string | null;
}

interface RewardCardProps {
  reward: Reward;
  onViewTransaction: () => void;
}

export function RewardCard({ reward, onViewTransaction }: RewardCardProps) {
  const t = useTranslations();

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-2 right-2">
        <Award className="h-5 w-5 text-yellow-500" />
      </div>
      <CardHeader>
        <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden">
          <img
            src={reward.sourceUrl}
            alt={reward.name}
            className="w-full h-full object-contain"
          />
        </div>
        <CardTitle className="text-base">{reward.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{reward.description}</p>
        {reward.earnedAt && (
          <p className="text-xs text-muted-foreground mt-2">
            {t('rewards.earnedAt')}: {new Date(reward.earnedAt).toLocaleDateString()}
          </p>
        )}
        <Button
          onClick={onViewTransaction}
          variant="outline"
          size="sm"
          className="w-full mt-4"
        >
          {t('rewards.viewTransaction')}
        </Button>
      </CardContent>
    </Card>
  );
}

