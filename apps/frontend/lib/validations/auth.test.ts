import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, getPasswordStrength } from './auth';

describe('Auth Validation', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address');
      }
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Email is required');
      }
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password is required');
      }
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name must be at least 2 characters');
      }
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123!',
        confirmPassword: 'password123!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes('uppercase'))).toBe(true);
      }
    });

    it('should reject password without lowercase', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'PASSWORD123!',
        confirmPassword: 'PASSWORD123!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes('lowercase'))).toBe(true);
      }
    });

    it('should reject password without special character', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes('special character'))).toBe(true);
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Pass1!',
        confirmPassword: 'Pass1!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes('8 characters'))).toBe(true);
      }
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPass123!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes("don't match"))).toBe(true);
      }
    });
  });

  describe('getPasswordStrength', () => {
    it('should return "weak" for short passwords', () => {
      expect(getPasswordStrength('Pass1!')).toBe('weak');
      expect(getPasswordStrength('ab')).toBe('weak');
      expect(getPasswordStrength('')).toBe('weak');
    });

    it('should return "weak" for passwords exactly 7 characters', () => {
      expect(getPasswordStrength('Pass1!7')).toBe('weak');
    });

    it('should return "medium" for passwords without numbers or special chars', () => {
      expect(getPasswordStrength('Password')).toBe('medium');
      expect(getPasswordStrength('LongPasswordText')).toBe('medium');
    });

    it('should return "medium" for passwords with numbers but no special chars', () => {
      expect(getPasswordStrength('Password123')).toBe('medium');
    });

    it('should return "medium" for passwords with special chars but no numbers', () => {
      expect(getPasswordStrength('Password!!!')).toBe('medium');
    });

    it('should return "strong" for passwords with numbers and special chars', () => {
      expect(getPasswordStrength('Password123!')).toBe('strong');
      expect(getPasswordStrength('MyP@ssw0rd')).toBe('strong');
      expect(getPasswordStrength('Str0ng!Pass')).toBe('strong');
    });
  });
});
