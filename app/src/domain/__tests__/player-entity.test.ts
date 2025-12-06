import {
  validatePlayerName,
  validateSuiAddress,
  isComputerPlayer,
  PlayerEntity,
} from '../entities';

describe('Player Entity Validation', () => {
  describe('validatePlayerName', () => {
    it('should accept valid names', () => {
      expect(validatePlayerName('Jo')).toBe(true);
      expect(validatePlayerName('John Doe')).toBe(true);
      expect(validatePlayerName('A'.repeat(50))).toBe(true);
    });

    it('should reject names that are too short', () => {
      expect(validatePlayerName('J')).toBe(false);
      expect(validatePlayerName('')).toBe(false);
    });

    it('should reject names that are too long', () => {
      expect(validatePlayerName('A'.repeat(51))).toBe(false);
    });
  });

  describe('validateSuiAddress', () => {
    it('should accept valid Sui addresses', () => {
      const validAddress =
        '0x1234567890123456789012345678901234567890123456789012345678901234';
      expect(validateSuiAddress(validAddress)).toBe(true);
    });

    it('should reject addresses without 0x prefix', () => {
      const invalidAddress =
        '1234567890123456789012345678901234567890123456789012345678901234';
      expect(validateSuiAddress(invalidAddress)).toBe(false);
    });

    it('should reject addresses with wrong length', () => {
      expect(validateSuiAddress('0x123')).toBe(false);
      expect(validateSuiAddress('0x' + 'a'.repeat(65))).toBe(false);
    });

    it('should reject addresses with invalid characters', () => {
      const invalidAddress =
        '0xGGGG567890123456789012345678901234567890123456789012345678901234';
      expect(validateSuiAddress(invalidAddress)).toBe(false);
    });
  });

  describe('isComputerPlayer', () => {
    it('should return true for computer player', () => {
      const computerPlayer: PlayerEntity = {
        id: process.env.NEXT_PUBLIC_HAL_ID as string,
        name: 'Computer',
        suiAddress: null,
        createdAt: Date.now(),
      };
      expect(isComputerPlayer(computerPlayer)).toBe(true);
    });

    it('should return false for human player', () => {
      const humanPlayer: PlayerEntity = {
        id: 'player-1',
        name: 'John',
        suiAddress:
          '0x1234567890123456789012345678901234567890123456789012345678901234',
        createdAt: Date.now(),
      };
      expect(isComputerPlayer(humanPlayer)).toBe(false);
    });
  });
});
