// Get Player By Sui Address Use Case

import { IPlayerRepository } from '@/ports/repositories';
import { PlayerEntity } from '@/domain/entities';

export interface GetPlayerBySuiAddressRequest {
  suiAddress: string;
}

export interface GetPlayerBySuiAddressResponse {
  player: PlayerEntity | null;
}

export class GetPlayerBySuiAddressUseCase {
  constructor(private playerRepository: IPlayerRepository) {}

  async execute(
    request: GetPlayerBySuiAddressRequest
  ): Promise<GetPlayerBySuiAddressResponse> {
    const player = await this.playerRepository.getBySuiAddress(
      request.suiAddress
    );
    return { player };
  }
}
