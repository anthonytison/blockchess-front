"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  isConnected?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  isConnected = false
}: EmptyStateProps) {
  const t = useTranslations();

  const actionButton = actionLabel && (
    actionHref ? (
      <Button asChild>
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    ) : onAction ? (
      <Button onClick={onAction}>{actionLabel}</Button>
    ) : null
  );

  return (
    <Card className={`max-w-md mx-auto text-center ${className || ""}`}>
      <CardContent className="py-8">
        <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {isConnected ? actionButton : 
        <Button className="cursor-pointer" onClick={() => document.getElementById("suiConnect")?.click()}>
          <User className="w-4 h-4 sm:w-5 sm:h-5" />{t("auth.connectDisabled")}
        </Button>}
      </CardContent>
    </Card>
  );
}

