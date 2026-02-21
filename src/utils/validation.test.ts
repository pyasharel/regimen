import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  fullNameSchema,
  authSignUpSchema,
  authSignInSchema,
} from './validation';

describe('validation', () => {
  describe('emailSchema', () => {
    it('accepts valid email', () => {
      expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(emailSchema.safeParse('notanemail').success).toBe(false);
      expect(emailSchema.safeParse('').success).toBe(false);
    });

    it('trims whitespace', () => {
      expect(emailSchema.safeParse('  user@example.com  ').success).toBe(true);
    });
  });

  describe('passwordSchema', () => {
    it('accepts password with at least 6 chars', () => {
      expect(passwordSchema.safeParse('123456').success).toBe(true);
      expect(passwordSchema.safeParse('abcdef').success).toBe(true);
    });

    it('rejects password shorter than 6', () => {
      expect(passwordSchema.safeParse('12345').success).toBe(false);
    });
  });

  describe('fullNameSchema', () => {
    it('accepts non-empty name', () => {
      expect(fullNameSchema.safeParse('John Doe').success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(fullNameSchema.safeParse('').success).toBe(false);
      expect(fullNameSchema.safeParse('   ').success).toBe(false);
    });
  });

  describe('authSignUpSchema', () => {
    it('accepts valid sign up data', () => {
      const result = authSignUpSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid data', () => {
      expect(authSignUpSchema.safeParse({ email: 'bad', password: 'short', fullName: '' }).success).toBe(false);
    });
  });

  describe('authSignInSchema', () => {
    it('accepts valid sign in data', () => {
      const result = authSignInSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid data', () => {
      expect(authSignInSchema.safeParse({ email: 'bad', password: '12' }).success).toBe(false);
    });
  });
});
