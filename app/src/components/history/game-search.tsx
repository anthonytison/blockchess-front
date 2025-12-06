"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface GameSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

export function GameSearch({ searchTerm, onSearchChange, className }: GameSearchProps) {
  const t = useTranslations();

  return (
    <div className={`mb-4 sm:mb-6 w-full ${className || ""}`}>
      <div className="relative w-full max-w-md mx-auto sm:mx-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder={t("history.search.placeholder")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-full"
        />
      </div>
    </div>
  );
}

