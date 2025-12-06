// Client-side Sui transaction utilities
import { Transaction } from '@mysten/sui/transactions';
import { RewardNFT } from './blockchain/rewards';

interface CreateGameParams {
    mode: number
    difficulty: number
}

interface MoveParams {
    gameObjectId: string
    isComputer: boolean
    moveSan: string
    fen: string
    moveHash: string
}

let networkType = process.env.NEXT_PUBLIC_SUI_NETWORK_TYPE || 'localnet';

let packageId: string;
let badgeRegistryId: string;
switch (networkType) {
    case 'devnet':
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_DEVNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_DEVNET_BADGE_REGISTRY_ID || '';
        break;
    case 'testnet':
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_TESTNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_TESTNET_BADGE_REGISTRY_ID || '';
        break;
    case 'mainnet':
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_MAINNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_MAINNET_BADGE_REGISTRY_ID || '';
        break;
    default:
        packageId = process.env.NEXT_PUBLIC_SUI_NETWORK_LOCALNET_PACKAGE_ID as string;
        badgeRegistryId = process.env.NEXT_PUBLIC_SUI_NETWORK_LOCALNET_BADGE_REGISTRY_ID || '';
}

export const suiModule: string = "game";

/**
 * Build a transaction to create a game on Sui blockchain
 * @param params Game creation parameters
 * @returns Transaction ready to be signed
 */
export const createGameTransaction = (params: CreateGameParams): Transaction => {
    const tx = new Transaction();

    tx.moveCall({
        target: `${packageId}::${suiModule}::create_game`,
        arguments: [
            tx.pure.u8(params.mode),
            tx.pure.u8(params.difficulty),
            tx.object('0x6'), // Sui Clock object
        ],
    });

    return tx;
}

export const moveTransaction = (tx: Transaction, params: MoveParams): Transaction => {
    tx.moveCall({
        target: `${packageId}::${suiModule}::make_move`,
        arguments: [
            tx.object(params.gameObjectId),
            tx.pure.bool(params.isComputer),
            tx.pure.string(params.moveSan),
            tx.pure.string(params.fen),
            tx.pure.string(params.moveHash),
            tx.object('0x6'), // Sui Clock object
        ],
    });

    return tx;
}

interface EndGameParams {
    gameObjectId: string
    winner: string | null  // Sui address or null for draw
    result: string  // '1-0', '0-1', or '1/2-1/2'
    finalFen: string
}

export const endGameTransaction = (tx: Transaction, params: EndGameParams): Transaction => {
    // Convert winner to Option<address>
    // In Sui, Option<T> is represented as vector<T> with 0 or 1 elements
    const winnerArg = params.winner 
        ? tx.pure.vector('address', [params.winner])
        : tx.pure.vector('address', []);

    tx.moveCall({
        target: `${packageId}::${suiModule}::end_game`,
        arguments: [
            tx.object(params.gameObjectId),
            winnerArg,
            tx.pure.string(params.result),
            tx.pure.string(params.finalFen),
            tx.object('0x6'), // Sui Clock object
        ],
    });

    return tx;
}



/**
 * Build a transaction to mint a badge NFT on Sui blockchain
 * @param params Badge minting parameters
 * @param recipientAddress Sui address of the recipient
 * @param registryObjectId Optional BadgeRegistry shared object ID (defaults to env var)
 * @returns Transaction ready to be signed
 */
export const mintNftTransaction = (params: RewardNFT, recipientAddress: string, registryObjectId?: string): Transaction => {
    const tx = new Transaction();
  
    if (!recipientAddress) {
        throw new Error('Recipient Sui address is required');
    }

    const registryId = registryObjectId || badgeRegistryId;
    if (!registryId) {
        throw new Error('BadgeRegistry object ID is required. Set NEXT_PUBLIC_SUI_NETWORK_*_BADGE_REGISTRY_ID environment variable or pass registryObjectId parameter.');
    }

    tx.moveCall({
        target: `${packageId}::badge::mint_badge`,
        arguments: [
            tx.object(registryId), // BadgeRegistry shared object
            tx.pure.address(recipientAddress),
            tx.pure.string(params.badge_type),
            tx.pure.string(params.name),
            tx.pure.string(params.description),
            tx.pure.string(params.sourceUrl)
        ],
    });

    return tx;
}

export { packageId };