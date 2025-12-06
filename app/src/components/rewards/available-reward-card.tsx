import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Reward {
  badge_type: string;
  name: string;
  description: string;
  sourceUrl: string;
  isEarned: boolean;
  earnedAt: string | null;
}

interface AvailableRewardCardProps {
  reward: Reward;
}

export function AvailableRewardCard({ reward }: AvailableRewardCardProps) {
  return (
    <Card className="opacity-60 cursor-not-allowed">
      <CardHeader>
        <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden grayscale">
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
      </CardContent>
    </Card>
  );
}

