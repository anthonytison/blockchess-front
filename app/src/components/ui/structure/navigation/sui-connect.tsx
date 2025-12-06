"use client";

import {
	useConnectWallet,
	useCurrentAccount,
	useDisconnectWallet,
	useWallets,
} from "@mysten/dapp-kit";
import { useTranslations } from "next-intl";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { createPlayer, getPlayer } from "@/app/actions/account";
import { saveCookie } from "@/app/actions/auth";

const SuiConnect = () => {
	const t = useTranslations("navigation");

	const currentAccount = useCurrentAccount();

	const wallets = useWallets();

	const { mutate: connect } = useConnectWallet();

	const { mutate: disconnect } = useDisconnectWallet();

	if (!!currentAccount) return <></>;

	type ConnectOptions = NonNullable<Parameters<typeof connect>[1]>;

	type StandardConnectOutput = Parameters<
		NonNullable<ConnectOptions["onSuccess"]>
	>[0];

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
				} else {
					disconnect();
				}
			}
		} catch (e) {
			console.log((e as Error).message);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button id="suiConnect" className="cursor-pointer" variant="outline" size="sm" aria-label={t("connect")}>
					<User className="w-4 h-4 mr-2" />
					{t("connect")}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{wallets.map((wallet) => (
					<DropdownMenuItem
						key={`wallets-${wallet.name}`}
						className="flex items-center gap-2 cursor-pointer"
					>
						<Button
							type="button"
							className="cursor-pointer"
							variant="ghost"
							onClick={() => {
								connect({ wallet }, { onSuccess: handleSuccess });
							}}
						>
							{wallet.name}
						</Button>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
export { SuiConnect };
export default SuiConnect;
