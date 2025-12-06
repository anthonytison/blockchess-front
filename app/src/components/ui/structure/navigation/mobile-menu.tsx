"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronRight, User, Languages, Moon, Sun, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets } from "@mysten/dapp-kit";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useContext } from "react";
import { SessionContext } from "@/app/context/SessionProvider";
import { createPlayer, getPlayer } from "@/app/actions/account";
import { saveCookie, deleteCookie } from "@/app/actions/auth";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const t = useTranslations();
  const menuRef = useRef<HTMLDivElement>(null);
  const currentAccount = useCurrentAccount();
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { player } = useContext(SessionContext);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setExpandedItems(new Set());
    }
  };

  const closeMenu = () => {
    setIsOpen(false);
    setExpandedItems(new Set());
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleWalletConnect = async (wallet: any) => {
    type ConnectOptions = NonNullable<Parameters<typeof connect>[1]>;
    type StandardConnectOutput = Parameters<NonNullable<ConnectOptions["onSuccess"]>>[0];

    const handleSuccess = async (data: StandardConnectOutput) => {
      try {
        if (data.accounts && data.accounts.length > 0) {
          const suiAddress: string = data.accounts[0].address;
          let player = await getPlayer(suiAddress);
          if (!player) {
            player = await createPlayer(suiAddress);
          }

          if (!!player) {
            await saveCookie({
              name: process.env.NEXT_PUBLIC_COOKIE_NAME as string,
              value: JSON.stringify(player),
            });
            router.refresh();
          }
        }
      } catch (e) {
        console.log((e as Error).message);
      }
    };

    connect({ wallet }, { onSuccess: handleSuccess });
    closeMenu();
  };

  const handleDisconnect = async () => {
    disconnect();
    await deleteCookie(process.env.NEXT_PUBLIC_COOKIE_NAME as string);
    router.refresh();
    closeMenu();
  };

  const handleLanguageChange = (locale: string) => {
    document.cookie = `locale=${locale}; path=/; max-age=31536000`;
    router.refresh();
    closeMenu();
  };

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstFocusable = menuRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  return (
    <div className="md:hidden">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleMenu}
        aria-label={isOpen ? t("navigation.closeMenu") : t("navigation.openMenu")}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
        <span className="sr-only">{isOpen ? t("navigation.closeMenu") : t("navigation.openMenu")}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeMenu}
            aria-hidden="true"
          />
          
          {/* Menu */}
          <div
            ref={menuRef}
            id="mobile-menu"
            className="fixed top-16 right-0 w-full sm:w-80 bg-background border-l border-b shadow-lg z-50 max-h-[calc(100vh-4rem)] overflow-y-auto"
            role="navigation"
            aria-label={t("navigation.menu")}
          >
            <div className="p-2">
              {/* Wallet Section */}
              {!currentAccount ? (
                <div className="mb-2">
                  <button
                    onClick={() => toggleItem("connect")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-muted transition-colors text-left"
                    aria-expanded={expandedItems.has("connect")}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5" />
                      <span className="font-medium">{t("navigation.connect")}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${expandedItems.has("connect") ? "rotate-90" : ""}`}
                    />
                  </button>
                  {expandedItems.has("connect") && (
                    <div className="pl-4 pr-2 py-2 space-y-1">
                      {wallets.map((wallet) => (
                        <button
                          key={wallet.name}
                          onClick={() => handleWalletConnect(wallet)}
                          className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors"
                        >
                          {wallet.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-2">
                  <button
                    onClick={() => toggleItem("account")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-muted transition-colors text-left"
                    aria-expanded={expandedItems.has("account")}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" />
                      <span className="font-medium truncate">
                        {player?.name || t("navigation.account")}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${expandedItems.has("account") ? "rotate-90" : ""}`}
                    />
                  </button>
                  {expandedItems.has("account") && (
                    <div className="pl-4 pr-2 py-2 space-y-1">
                      {player?.suiAddress && (
                        <div className="px-4 py-2 text-sm text-muted-foreground font-mono truncate">
                          {player.suiAddress.substring(0, 10)}...
                        </div>
                      )}
                      <Link
                        href="/profile"
                        onClick={closeMenu}
                        className="block w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors"
                      >
                        {t("navigation.profile")}
                      </Link>
                      <Link
                        href="/rewards"
                        onClick={closeMenu}
                        className="block w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors"
                      >
                        {t("navigation.rewards")}
                      </Link>
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors text-destructive"
                      >
                        {t("navigation.disconnect")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Section */}
              <div className="border-t pt-2 mt-2">
                {/* Language */}
                <div className="mb-2">
                  <button
                    onClick={() => toggleItem("language")}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-muted transition-colors text-left"
                    aria-expanded={expandedItems.has("language")}
                  >
                    <div className="flex items-center gap-3">
                      <Languages className="w-5 h-5" />
                      <span className="font-medium">{t("navigation.language")}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${expandedItems.has("language") ? "rotate-90" : ""}`}
                    />
                  </button>
                  {expandedItems.has("language") && (
                    <div className="pl-4 pr-2 py-2 space-y-1">
                      {languages.map((language) => (
                        <button
                          key={language.code}
                          onClick={() => handleLanguageChange(language.code)}
                          className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          <span>{language.flag}</span>
                          <span>{language.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme */}
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {theme === "light" ? (
                      <Sun className="w-5 h-5" />
                    ) : (
                      <Moon className="w-5 h-5" />
                    )}
                    <span className="font-medium">{t("navigation.theme")}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {theme === "light" ? "Light" : "Dark"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
