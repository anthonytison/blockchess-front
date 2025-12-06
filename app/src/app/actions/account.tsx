'use server'

import { PlayerEntity } from "@/domain/entities";
import { logger, playerRepository } from "@/lib/di"

/**
 * Get player
 * @param suiAddress string
 * @returns Promise<PlayerEntity | null>
 */
export const getPlayer = async (suiAddress: string): Promise<PlayerEntity | null> => {
    const result = await playerRepository.getBySuiAddress(suiAddress);
    return result;
}

/**
 * Create player if not existing
 * @param suiAddress string
 * @returns Promise<boolean>
 */
export const createPlayer = async (suiAddress: string): Promise<PlayerEntity | null> => {
    try {
        const result = await playerRepository.create({
            suiAddress,
            name: `Anonymous-${new Date().getTime()}`
        })
        return result;
    }catch(e){
        console.log('---ERROR CREATE PLAYER', (e as Error).message)
        // logger.error((e as Error).message);
        return null;
    }
}

/**
 * Update player 
 * @param suiAddress string
 * @returns Promise<boolean>
 */
export const updatePlayer = async (player: PlayerEntity): Promise<PlayerEntity | null> => {
    try {
        const result = await playerRepository.update(player)
        return result;
    }catch(e){
        // logger.error((e as Error).message);
        return null;
    }
}