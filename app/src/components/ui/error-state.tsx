"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error: string | Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ error, onRetry, retryLabel, className }: ErrorStateProps) {
  const t = useTranslations();

  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : error;
  const displayRetryLabel = retryLabel || t("errors.tryAgain");

  return (
    <Card className={`max-w-md mx-auto ${className || ""}`}>
      <CardHeader>
        <CardTitle className="text-red-600">{t("errors.error")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{errorMessage}</p>
        {onRetry && (
          <Button onClick={onRetry}>{displayRetryLabel}</Button>
        )}
      </CardContent>
    </Card>
  );
}

