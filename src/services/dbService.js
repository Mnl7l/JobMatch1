// src/services/dbService.js
import { supabase } from '../utils/supabaseClient';

/**
 * Database Service - centralizes all database operations
 */
class DatabaseService {
  /**
   * Get all job posts
   * @returns {Promise<Array>} Array of job posts
   */
  static async getJobPosts() {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          users:posted_by (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job posts:', error.message);
      throw error;
    }
  }
  
  /**
   * Get a job post by ID
   * @param {string} id Job post ID
   * @returns {Promise<Object>} Job post object
   */
  static async getJobPostById(id) {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .select(`
          *,
          users:posted_by (
            name,
            email
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching job post:', error.message);
      throw error;
    }
  }
  
  /**
   * Create a new job post
   * @param {Object} jobData Job post data
   * @returns {Promise<Object>} Created job post
   */
  static async createJobPost(jobData) {
    try {
      // Get the current user and set as poster
      const { data: { user } } = await supabase.auth.getUser();
      jobData.posted_by = user.id;
      
      const { data, error } = await supabase
        .from('job_posts')
        .insert([jobData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creating job post:', error.message);
      throw error;
    }
  }
  
  /**
   * Update a job post
   * @param {string} id Job post ID
   * @param {Object} updates Job post updates
   * @returns {Promise<Object>} Updated job post
   */
  static async updateJobPost(id, updates) {
    try {
      const { data, error } = await supabase
        .from('job_posts')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating job post:', error.message);
      throw error;
    }
  }
  
  /**
   * Delete a job post
   * @param {string} id Job post ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteJobPost(id) {
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting job post:', error.message);
      throw error;
    }
  }
  
  /**
   * Get user profile by ID
   * @param {string} id User ID
   * @returns {Promise<Object>} User profile
   */
  static async getUserById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user:', error.message);
      throw error;
    }
  }
  
  /**
   * Update user profile
   * @param {string} id User ID
   * @param {Object} updates Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  static async updateUser(id, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating user:', error.message);
      throw error;
    }
  }
  
  /**
   * Get resume by user ID
   * @param {string} userId User ID
   * @returns {Promise<Object>} Resume data
   */
  static async getResumeByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching resume:', error.message);
      throw error;
    }
  }
  
  /**
   * Create or update a resume
   * @param {Object} resumeData Resume data
   * @returns {Promise<Object>} Created/updated resume
   */
  static async saveResume(resumeData) {
    try {
      // Check if resume already exists
      const { data: existingResume } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', resumeData.user_id)
        .single();
      
      if (existingResume) {
        // Update existing resume
        const { data, error } = await supabase
          .from('resumes')
          .update({
            education: resumeData.education,
            experience: resumeData.experience,
            skills: resumeData.skills
          })
          .eq('id', existingResume.id)
          .select();
        
        if (error) throw error;
        return data[0];
      } else {
        // Create new resume
        const { data, error } = await supabase
          .from('resumes')
          .insert([resumeData])
          .select();
        
        if (error) throw error;
        return data[0];
      }
    } catch (error) {
      console.error('Error saving resume:', error.message);
      throw error;
    }
  }
}

export default DatabaseService;