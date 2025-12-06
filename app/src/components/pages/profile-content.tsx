"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerEntity } from "@/domain/entities";
import { getCookie, saveCookie } from "@/app/actions/auth";
import { ProfileFormData, profileSchema } from "@/lib/validations/profile";
import { updatePlayer } from "@/app/actions/account";
import { LoadingState } from "@/components/ui/loading-state";
import { useTranslations } from "next-intl";
import { useToast } from "@/app/context/toast-provider";

export function ProfileContent() {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerEntity | null>(null);
  
  const { showSuccess } = useToast();

  const form = useForm<ProfileFormData>({
    mode: "onChange",
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
    },
  });

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const checkWallet = async () => {
    try {
      const cookieValue: string | null = await getCookie(
        process.env.NEXT_PUBLIC_COOKIE_NAME as string
      );

      if (cookieValue) {
        const playerData: PlayerEntity = JSON.parse(cookieValue);
        setValue("name", playerData.name);
        setPlayer(playerData);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const onHandleSubmit = async (formData: ProfileFormData) => {
    try {
      const newPlayer: PlayerEntity = {
        ...(player as PlayerEntity),
        name: formData.name as string,
      };
      const result = await updatePlayer(newPlayer);
      if (!result) {
        throw new Error("Failed to update profile");
      } else {

        if(newPlayer.name === "Andy"){
          console.log(`%c☠️ Andy! You Goonie!`, 'background-color:black;color:white;font-weight:bold;padding:15px;')
          showSuccess('☠️ Andy! You Goonie!');
        }
        
        await saveCookie({
          name: process.env.NEXT_PUBLIC_COOKIE_NAME as string,
          value: JSON.stringify(newPlayer),
        });
        router.refresh();
      }
    } catch (e) {
    }
  };

  useEffect(() => {
    checkWallet();
  }, [router]);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <LoadingState />
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center py-4 sm:py-8">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6">
        <Card className="p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t("page.profile.header")}</h1>
          <form onSubmit={handleSubmit(onHandleSubmit)} className="space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {t("page.profile.description")}
            </p>

            <div>
              <Label htmlFor="name">{t("game.setup.players.player1")}</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                {...register("name", { required: true })}
                placeholder={t("game.setup.players.player1Placeholder")}
                minLength={2}
                maxLength={50}
              />

              {errors.name && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded mt-2">
                  {errors.name.message}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs sm:text-sm text-muted-foreground">
                {t("blockchain.using")} Sui Address
              </Label>
              <p className="text-xs font-mono break-all bg-muted p-2 sm:p-3 rounded">
                {currentAccount?.address}
              </p>
            </div>

            <Button
              type="submit"
              disabled={!isValid || !!isSubmitting}
              className="w-full"
            >
              {isSubmitting ? t("common.loading") : t("common.confirm")}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}

