'use server'

import { createPlayerUseCase, getPlayerBySuiAddressUseCase } from '@/lib/di';

export interface CreatePlayerParams {
  name: string;
  suiAddress: string;
}

export const createPlayer = async (params: CreatePlayerParams) => {
  if (!params.name || typeof params.name !== 'string') {
    throw new Error('name is required');
  }

  if (!params.suiAddress || typeof params.suiAddress !== 'string') {
    throw new Error('suiAddress is required');
  }

  try {
    const result = await createPlayerUseCase.execute({
      name: params.name,
      suiAddress: params.suiAddress,
    });
    return result;
  } catch (error: any) {
    if (
      error.message === 'Player name must be between 2 and 50 characters' ||
      error.message === 'Invalid Sui address format' ||
      error.message === 'A player with this Sui address already exists'
    ) {
      throw error;
    }
    throw new Error('Failed to create player');
  }
};

export interface GetPlayerBySuiAddressParams {
  suiAddress: string;
}

export const getPlayerBySuiAddress = async (params: GetPlayerBySuiAddressParams) => {
  if (!params.suiAddress) {
    throw new Error('suiAddress is required');
  }

  try {
    const result = await getPlayerBySuiAddressUseCase.execute({
      suiAddress: params.suiAddress,
    });
    return result;
  } catch (error) {
    throw new Error('Failed to fetch player');
  }
};

