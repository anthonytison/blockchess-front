// Verify Game Password Use Case

import { IGameRepository } from '@/ports/repositories';
import { PasswordService } from '@/lib/services/password-service';

export interface VerifyGamePasswordRequest {
  gameId: string;
  password: string;
}

export interface VerifyGamePasswordResponse {
  isValid: boolean;
  gameId?: string;
}

export class VerifyGamePasswordUseCase {
  constructor(private gameRepository: IGameRepository) {}

  async execute(request: VerifyGamePasswordRequest): Promise<VerifyGamePasswordResponse> {
    const game = await this.gameRepository.getById(request.gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }

    // If game has no password, it's not protected
    if (!game.password) {
      return { isValid: true, gameId: game.id };
    }

    // Verify the provided password against the stored hash
    const isValid = await PasswordService.verifyPassword(request.password, game.password);
    
    return { 
      isValid, 
      gameId: isValid ? game.id : undefined 
    };
  }
}