import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function WalletWarning() {
  const t = useTranslations("blockchain");

  return <Card className="w-full border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                {t('connectionRequired')}
              </h2>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                {t('pleaseConnect')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
}