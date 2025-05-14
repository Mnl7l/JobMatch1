// src/services/applicationService.js

import { supabase } from '../utils/supabaseClient';

/**
 * Service for managing job applications
 */
class ApplicationService {
  /**
   * Apply for a job
   * @param {string} jobId - Job ID to apply for
   * @param {string} userId - User ID applying for the job
   * @param {string} coverLetter - Optional cover letter
   * @returns {Promise<Object>} Application result
   */
  static async applyForJob(jobId, userId, coverLetter = '') {
    try {
      // First, check if user has already applied
      const { data: existingApplication, error: checkError } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .single();
      
      if (!checkError && existingApplication) {
        return {
          success: false,
          error: 'You have already applied for this job',
          data: existingApplication
        };
      }
      
      // Get user resume
      const { data: resumeData, error: resumeError } = await supabase
        .from('resume-files')
        .select('id, file_url')
        .eq('user_id', userId)
        .single();
      
      if (resumeError && resumeError.code !== 'PGRST116') {
        console.error('Error fetching resume:', resumeError.message);
      }
      
      // Create the application
      const applicationData = {
        job_id: jobId,
        user_id: userId,
        status: 'pending',
        cover_letter: coverLetter,
        resume_url: resumeData?.file_url || null,
        applied_at: new Date()
      };
      
      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select();
      
      if (error) {
        // Handle specific errors
        if (error.message.includes('duplicate key value')) {
          return {
            success: false,
            error: 'You have already applied for this job',
            data: null
          };
        }
        throw error;
      }
      
      // If match score is calculated automatically by the database trigger,
      // we should return the full data including the match score
      const { data: completeData, error: fetchError } = await supabase
        .from('applications')
        .select('*, job_posts:job_id(title, company)')
        .eq('id', data[0].id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching complete application data:', fetchError.message);
        // Return partial data if we can't get complete data
        return {
          success: true,
          data: data[0],
          error: null
        };
      }
      
      // After successful application, we should also create a record in the rankings table
      // Only if it doesn't already exist
      await this.createOrUpdateRanking(jobId, userId, completeData.match_score || 50);
      
      return {
        success: true,
        data: completeData,
        error: null
      };
    } catch (error) {
      console.error('Error applying for job:', error.message);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
  
  /**
   * Create or update a ranking record
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID
   * @param {number} score - Match score
   * @returns {Promise<void>}
   */
  static async createOrUpdateRanking(jobId, userId, score) {
    try {
      // Check if ranking exists
      const { data: existingRanking, error: checkError } = await supabase
        .from('rankings')
        .select('id')
        .eq('job_id', jobId)
        .eq('user_id', userId)
        .single();
      
      if (!checkError && existingRanking) {
        // Update existing ranking
        await supabase
          .from('rankings')
          .update({ 
            score: score,
            updated_at: new Date()
          })
          .eq('id', existingRanking.id);
      } else {
        // Create new ranking
        await supabase
          .from('rankings')
          .insert([{
            job_id: jobId,
            user_id: userId,
            score: score,
            status: 'pending',
            created_at: new Date()
          }]);
      }
    } catch (error) {
      console.error('Error creating/updating ranking:', error.message);
      // We don't want to fail the application if ranking creation fails
      // Just log the error and continue
    }
  }
  
  /**
   * Get all applications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Applications
   */
  static async getUserApplications(userId) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_posts:job_id (
            id,
            title,
            company,
            location,
            job_type,
            posted_by
          )
        `)
        .eq('user_id', userId)
        .order('applied_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user applications:', error.message);
      throw error;
    }
  }
  
  /**
   * Get all applications for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Applications
   */
  static async getJobApplications(jobId) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          resumes:user_id (
            id,
            file_url,
            skills,
            education,
            experience
          )
        `)
        .eq('job_id', jobId)
        .order('match_score', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching job applications:', error.message);
      throw error;
    }
  }
  
  /**
   * Update application status
   * @param {string} applicationId - Application ID
   * @param {string} status - New status
   * @param {string} feedback - Optional feedback
   * @returns {Promise<Object>} Updated application
   */
  static async updateApplicationStatus(applicationId, status, feedback = '') {
    try {
      const updates = {
        status,
        updated_at: new Date()
      };
      
      if (feedback) {
        updates.feedback = feedback;
      }
      
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', applicationId)
        .select(`
          *,
          job_posts:job_id (
            id, 
            title
          ),
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `);
      
      if (error) throw error;
      
      // Update ranking status to match application status
      if (data[0]) {
        await supabase
          .from('rankings')
          .update({
            status: status,
            updated_at: new Date()
          })
          .eq('job_id', data[0].job_id)
          .eq('user_id', data[0].user_id);
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating application status:', error.message);
      throw error;
    }
  }
}

export default ApplicationService;