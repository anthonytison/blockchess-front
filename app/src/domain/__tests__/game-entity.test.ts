import { validateObjectId } from '../entities';

describe('Game Entity Validation', () => {
  describe('validateObjectId', () => {
    it('should accept valid blockchain object IDs', () => {
      const validObjectId =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(validateObjectId(validObjectId)).toBe(true);

      const validObjectIdUpperCase =
        '0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
      expect(validateObjectId(validObjectIdUpperCase)).toBe(true);

      const validObjectIdMixedCase =
        '0x1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf';
      expect(validateObjectId(validObjectIdMixedCase)).toBe(true);
    });

    it('should reject object IDs without 0x prefix', () => {
      const invalidObjectId =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(validateObjectId(invalidObjectId)).toBe(false);
    });

    it('should reject object IDs with wrong length', () => {
      expect(validateObjectId('0x123')).toBe(false);
      expect(validateObjectId('0x' + 'a'.repeat(63))).toBe(false);
      expect(validateObjectId('0x' + 'a'.repeat(65))).toBe(false);
    });

    it('should reject object IDs with invalid characters', () => {
      const invalidObjectId =
        '0xGGGG567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(validateObjectId(invalidObjectId)).toBe(false);

      const invalidObjectIdWithSpace =
        '0x1234567890abcdef 234567890abcdef1234567890abcdef1234567890abcdef';
      expect(validateObjectId(invalidObjectIdWithSpace)).toBe(false);

      const invalidObjectIdWithSpecialChar =
        '0x1234567890abcdef!234567890abcdef1234567890abcdef1234567890abcdef';
      expect(validateObjectId(invalidObjectIdWithSpecialChar)).toBe(false);
    });

    it('should reject empty or null values', () => {
      expect(validateObjectId('')).toBe(false);
      expect(validateObjectId('0x')).toBe(false);
    });
  });
});
