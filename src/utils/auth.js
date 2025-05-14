// src/utils/auth.js
import { supabase } from './supabaseClient';

/**
 * Register a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {Object} userData - Additional user data including role
 * @returns {Promise<Object>} - Result of the registration
 */
export async function signUp(email, password, userData) {
  try {
    console.log('Signing up user with data:', { email, ...userData });
    
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData, // Store additional user data in auth.users
      }
    });

    if (error) throw error;

    // After signup, create a record in our profiles table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          role: userData.role,
          created_at: new Date()
        });

      if (profileError) throw profileError;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error signing up:', error.message);
    return { data: null, error };
  }
}

/**
 * Sign in a user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Result of the sign in attempt
 */
export async function signIn(email, password) {
  try {
    console.log('Signing in user:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error signing in:', error.message);
    return { data: null, error };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} - Result of the sign out
 */
export async function signOut() {
  try {
    console.log('Signing out user');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error.message);
    return { error };
  }
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object>} - User data with profile
 */
export async function getCurrentUser() {
  try {
    console.log('Getting current user');
    
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    // If user exists, get their profile data
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      
      return { 
        user: data.user,
        profile: profile || null,
        error: null 
      };
    }
    
    return { user: null, profile: null, error: null };
  } catch (error) {
    console.error('Error getting current user:', error.message);
    return { user: null, profile: null, error };
  }
}

/**
 * Checks if a user's role matches the role they're trying to log in with
 * @param {string} userId - The user's ID
 * @param {string} selectedRole - The role the user selected during login
 * @returns {Promise<boolean>} - True if roles match, false otherwise
 */
export async function checkUserRole(userId, selectedRole) {
  try {
    console.log('Checking user role:', { userId, selectedRole });
    
    // Fetch user profile from the database
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    console.log('User role from database:', data.role);
    
    // Return true if roles match, false otherwise
    return data.role === selectedRole;
  } catch (error) {
    console.error('Error checking user role:', error.message);
    return false;
  }
}

/**
 * Reset password for a user
 * @param {string} email - User's email
 * @returns {Promise<Object>} - Result of the password reset request
 */
export async function resetPassword(email) {
  try {
    console.log('Requesting password reset for:', email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error requesting password reset:', error.message);
    return { success: false, error };
  }
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Result of the password update
 */
export async function updatePassword(newPassword) {
  try {
    console.log('Updating password');
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating password:', error.message);
    return { success: false, error };
  }
}

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} - Updated profile
 */
export async function updateProfile(userId, updates) {
  try {
    console.log('Updating profile for user:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();
    
    if (error) throw error;
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error updating profile:', error.message);
    return { data: null, error };
  }
}

/**
 * Sign in with a third-party provider
 * @param {string} provider - Provider name (google, facebook, etc.)
 * @returns {Promise<void>}
 */
export async function signInWithProvider(provider) {
  try {
    console.log('Signing in with provider:', provider);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error.message);
    throw error;
  }
}

/**
 * Handle authentication callback (for OAuth providers)
 * @returns {Promise<Object>} - Auth session data
 */
export async function handleAuthCallback() {
  try {
    console.log('Handling auth callback');
    
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    return { session: data.session, error: null };
  } catch (error) {
    console.error('Error handling auth callback:', error.message);
    return { session: null, error };
  }
}