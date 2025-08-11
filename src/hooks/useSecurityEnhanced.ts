import { useState, useCallback } from 'react';
import { sanitizeInput, createRateLimiter, logSecurityEvent } from '@/utils/secureFileAccess';
import { supabase } from '@/integrations/supabase/client';

// Enhanced security hook for authentication and form validation
export const useSecurityEnhanced = () => {
  const [rateLimiters] = useState(() => ({
    login: createRateLimiter(10, 15 * 60 * 1000), // 10 attempts per 15 minutes (less restrictive)
    signup: createRateLimiter(5, 60 * 60 * 1000), // 5 attempts per hour
    general: createRateLimiter(15, 60 * 1000), // 15 requests per minute
  }));

  const checkRateLimit = useCallback((action: 'login' | 'signup' | 'general', identifier: string) => {
    return rateLimiters[action](identifier);
  }, [rateLimiters]);

  const validateAndSanitizeInput = useCallback((input: string, fieldName: string) => {
    // Basic validation
    if (!input || input.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:\s*text\/html/i,
      /vbscript:/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(input))) {
      logSecurityEvent('xss_attempt', 'form_input', undefined, {
        field: fieldName,
        suspiciousInput: input.substring(0, 100)
      });
      throw new Error('Invalid input detected');
    }

    return sanitizeInput(input);
  }, []);

  const enhancedSignIn = useCallback(async (email: string, password: string) => {
    const userIdentifier = email || 'unknown';
    
    // Rate limiting
    if (!checkRateLimit('login', userIdentifier)) {
      await logSecurityEvent('rate_limit_exceeded', 'auth_login', undefined, {
        email: userIdentifier,
        action: 'login'
      });
      throw new Error('Too many login attempts. Please try again later.');
    }

    // Input validation and sanitization
    const sanitizedEmail = validateAndSanitizeInput(email, 'Email');
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    // Password validation - match signup requirements
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        // Log failed login attempt
        await logSecurityEvent('login_failed', 'auth_login', undefined, {
          email: sanitizedEmail,
          error: error.message
        });
        throw error;
      }

      // Log successful login
      await logSecurityEvent('login_success', 'auth_login', data.user?.id, {
        email: sanitizedEmail
      });

      return data;
    } catch (error) {
      // Check for server-side rate limiting
      if ((error as any)?.message?.includes('rate limit')) {
        await logSecurityEvent('server_rate_limit', 'auth_login', undefined, {
          email: sanitizedEmail
        });
      }
      throw error;
    }
  }, [checkRateLimit, validateAndSanitizeInput]);

  const enhancedSignUp = useCallback(async (email: string, password: string, fullName: string, role: string = 'user') => {
    const userIdentifier = email || 'unknown';
    
    // Rate limiting
    if (!checkRateLimit('signup', userIdentifier)) {
      await logSecurityEvent('rate_limit_exceeded', 'auth_signup', undefined, {
        email: userIdentifier,
        action: 'signup'
      });
      throw new Error('Too many signup attempts. Please try again later.');
    }

    // Input validation and sanitization
    const sanitizedEmail = validateAndSanitizeInput(email, 'Email');
    const sanitizedFullName = validateAndSanitizeInput(fullName, 'Full Name');
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    // Password strength validation
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      throw new Error('Password must contain uppercase, lowercase, and numbers');
    }

    // Full name validation
    if (sanitizedFullName.length < 2) {
      throw new Error('Full name must be at least 2 characters long');
    }

    // Role validation
    const allowedRoles = ['user', 'fan', 'member'];
    if (!allowedRoles.includes(role)) {
      await logSecurityEvent('invalid_role_attempt', 'auth_signup', undefined, {
        email: sanitizedEmail,
        attemptedRole: role
      });
      throw new Error('Invalid role specified');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/auditioner`,
          data: {
            full_name: sanitizedFullName,
            role: role,
          }
        }
      });

      if (error) {
        // Log failed signup attempt
        await logSecurityEvent('signup_failed', 'auth_signup', undefined, {
          email: sanitizedEmail,
          error: error.message
        });
        throw error;
      }

      // Log successful signup
      await logSecurityEvent('signup_success', 'auth_signup', data.user?.id, {
        email: sanitizedEmail,
        role: role
      });

      return data;
    } catch (error) {
      // Check for server-side rate limiting
      if ((error as any)?.message?.includes('rate limit')) {
        await logSecurityEvent('server_rate_limit', 'auth_signup', undefined, {
          email: sanitizedEmail
        });
      }
      throw error;
    }
  }, [checkRateLimit, validateAndSanitizeInput]);

  const enhancedPasswordReset = useCallback(async (email: string) => {
    const userIdentifier = email || 'unknown';
    
    // Rate limiting
    if (!checkRateLimit('general', userIdentifier)) {
      await logSecurityEvent('rate_limit_exceeded', 'password_reset', undefined, {
        email: userIdentifier
      });
      throw new Error('Too many password reset attempts. Please try again later.');
    }

    // Input validation and sanitization
    const sanitizedEmail = validateAndSanitizeInput(email, 'Email');
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error('Please enter a valid email address');
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `https://gleeworld.org/auth?reset=true`,
      });

      if (error) {
        await logSecurityEvent('password_reset_failed', 'password_reset', undefined, {
          email: sanitizedEmail,
          error: error.message
        });
        throw error;
      }

      // Log password reset request
      await logSecurityEvent('password_reset_requested', 'password_reset', undefined, {
        email: sanitizedEmail
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }, [checkRateLimit, validateAndSanitizeInput]);

  return {
    enhancedSignIn,
    enhancedSignUp,
    enhancedPasswordReset,
    validateAndSanitizeInput,
    checkRateLimit
  };
};