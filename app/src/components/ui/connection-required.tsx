"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConnectionRequiredProps {
  message?: string;
  className?: string;
}

export function ConnectionRequired({ message, className }: ConnectionRequiredProps) {
  const t = useTranslations();
  const displayMessage = message || t("auth.connection_required_listing");

  return (
    <Card className={`max-w-md mx-auto text-center ${className || ""}`}>
      <CardContent className="py-8">
        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{displayMessage}</h3>
      </CardContent>
    </Card>
  );
}

