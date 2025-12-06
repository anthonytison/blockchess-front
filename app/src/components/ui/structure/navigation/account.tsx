'use client';

import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { Button } from "@/components/ui/button";
import { User, Skull } from "lucide-react";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteCookie } from "@/app/actions/auth";
import { useContext } from "react";
import { SessionContext } from "@/app/context/SessionProvider";

const NavAccount = () => {

  const currentAccount = useCurrentAccount();

	const { mutate: disconnect } = useDisconnectWallet();

  const { player } = useContext(SessionContext)

  const t = useTranslations('navigation');

  if (!currentAccount) return <></>

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline" 
        size="sm"
        className="w-[150px] truncate text-left cursor-pointer"
        aria-label={t('account')}>
          {player.name === "Andy" ? <Skull className="w-4 h-4 mr-2" /> : <User className="w-4 h-4 mr-2" />}
          {player ? <span title={player.name}>{player.name.length > 10 ? `${player.name.substring(0, 10)}...` : player.name}</span> : t('account')}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent 
    align="end"
    className="w-[150px]"
    >
      {player &&
        <DropdownMenuItem
          key="sui-address"
          className="flex items-center gap-2"
        >
          <span title={player.suiAddress as string}>{(player.suiAddress as string).substring(0, 10)}...</span>
        </DropdownMenuItem>
      }
      <DropdownMenuItem
        key="profile"
        className="flex items-center gap-2"
      >
        <Link href="/profile">{t('profile')}</Link>
      </DropdownMenuItem>
      <DropdownMenuItem
        key="rewards"
        className="flex items-center gap-2"
      >
        <Link href="/rewards">{t('rewards')}</Link>
      </DropdownMenuItem>
      <DropdownMenuItem
        key="disconnect"
        className="flex items-center gap-2"
      >
        <a

            type="button"
            onClick={async () => {
                disconnect();
                await deleteCookie(process.env.NEXT_PUBLIC_COOKIE_NAME as string)
            }}
        >
            {t('disconnect')}
        </a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}
export default NavAccount;