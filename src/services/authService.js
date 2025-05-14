// src/services/authService.js
import { supabase } from '../utils/supabaseClient';

/**
 * Authentication Service - handles all auth operations
 */
class AuthService {
  /**
   * Sign up a new user
   * @param {string} email User email
   * @param {string} password User password
   * @param {Object} userData Additional user data (name, role, etc.)
   * @returns {Promise<Object>} Auth data
   */
  static async signUp(email, password, userData) {
    try {
      // 1. Register the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role || 'job_seeker',
          }
        }
      });
      
      if (authError) throw authError;
      
      return authData;
    } catch (error) {
      console.error('Error signing up:', error.message);
      throw error;
    }
  }
  
  /**
   * Sign in with email and password
   * @param {string} email User email
   * @param {string} password User password
   * @returns {Promise<Object>} Auth data
   */
  static async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in:', error.message);
      throw error;
    }
  }
  
  /**
   * Sign out the current user
   * @returns {Promise<void>}
   */
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error.message);
      throw error;
    }
  }
  
  /**
   * Request password reset email
   * @param {string} email User email
   * @returns {Promise<boolean>} Success status
   */
  static async resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resetting password:', error.message);
      throw error;
    }
  }
  
  /**
   * Get the current authenticated user
   * @returns {Promise<Object|null>} User object or null
   */
  static async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error('Error getting current user:', error.message);
      return null;
    }
  }
  
  /**
   * Get the current user with profile data
   * @returns {Promise<Object|null>} User object with profile or null
   */
  static async getCurrentUserWithProfile() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) return null;
      
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      return {
        ...user,
        profile
      };
    } catch (error) {
      console.error('Error getting user profile:', error.message);
      return null;
    }
  }
}

export default AuthService;