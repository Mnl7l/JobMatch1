// apiServices.js - Services to interact with Supabase

import supabase from '../../utils/supabaseClient';

// User Service
export const userService = {
  // Create a new user
  async createUser(userData) {
    const { data, error } = await supabase
      .from('Users')
      .insert([userData])
      .select();
    
    if (error) throw error;
    return data;
  },

  // Get user by ID
  async getUserById(userId) {
    const { data, error } = await supabase
      .from('Users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user
  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('Users')
      .update(updates)
      .eq('user_id', userId)
      .select();
    
    if (error) throw error;
    return data;
  },

  // Delete user
  async deleteUser(userId) {
    const { error } = await supabase
      .from('Users')
      .delete()
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  }
};

// Candidate Service
export const candidateService = {
  // Create a new candidate
  async createCandidate(candidateData) {
    const { data, error } = await supabase
      .from('Candidates')
      .insert([candidateData])
      .select();
    
    if (error) throw error;
    return data;
  },

  // Get candidate by ID
  async getCandidateById(candidateId) {
    const { data, error } = await supabase
      .from('Candidates')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update candidate
  async updateCandidate(candidateId, updates) {
    const { data, error } = await supabase
      .from('Candidates')
      .update(updates)
      .eq('candidate_id', candidateId)
      .select();
    
    if (error) throw error;
    return data;
  },

  // Delete candidate
  async deleteCandidate(candidateId) {
    const { error } = await supabase
      .from('Candidates')
      .delete()
      .eq('candidate_id', candidateId);
    
    if (error) throw error;
    return true;
  }
};

// Recruiter Service
export const recruiterService = {
  // Create a new recruiter
  async createRecruiter(recruiterData) {
    const { data, error } = await supabase
      .from('Recruiters')
      .insert([recruiterData])
      .select();
    
    if (error) throw error;
    return data;
  },

  // Get recruiter by ID
  async getRecruiterById(recruiterId) {
    const { data, error } = await supabase
      .from('Recruiters')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update recruiter
  async updateRecruiter(recruiterId, updates) {
    const { data, error } = await supabase
      .from('Recruiters')
      .update(updates)
      .eq('recruiter_id', recruiterId)
      .select();
    
    if (error) throw error;
    return data;
  },

  // Delete recruiter
  async deleteRecruiter(recruiterId) {
    const { error } = await supabase
      .from('Recruiters')
      .delete()
      .eq('recruiter_id', recruiterId);
    
    if (error) throw error;
    return true;
  }
};

// Job Service
export const jobService = {
  // Create a new job
  async createJob(jobData) {
    const { data, error } = await supabase
      .from('Jobs')
      .insert([jobData])
      .select();
    
    if (error) throw error;
    return data;
  },

  // Get job by ID
  async getJobById(jobId) {
    const { data, error } = await supabase
      .from('Jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all jobs
  async getAllJobs() {
    const { data, error } = await supabase
      .from('Jobs')
      .select('*');
    
    if (error) throw error;
    return data;
  },

  // Get jobs by recruiter
  async getJobsByRecruiter(recruiterId) {
    const { data, error } = await supabase
      .from('Jobs')
      .select('*')
      .eq('recruiter_id', recruiterId);
    
    if (error) throw error;
    return data;
  },

  // Update job
  async updateJob(jobId, updates) {
    const { data, error } = await supabase
      .from('Jobs')
      .update(updates)
      .eq('job_id', jobId)
      .select();
    
    if (error) throw error;
    return data;
  },

  // Delete job
  async deleteJob(jobId) {
    const { error } = await supabase
      .from('Jobs')
      .delete()
      .eq('job_id', jobId);
    
    if (error) throw error;
    return true;
  }
};

// Application Service
export const applicationService = {
  // Create a new application
  async createApplication(applicationData) {
    const { data, error } = await supabase
      .from('Applications')
      .insert([applicationData])
      .select();
    
    if (error) throw error;
    return data;
  },

  // Get application by ID
  async getApplicationById(applicationId) {
    const { data, error } = await supabase
      .from('Applications')
      .select('*')
      .eq('application_id', applicationId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get applications by job
  async getApplicationsByJob(jobId) {
    const { data, error } = await supabase
      .from('Applications')
      .select('*')
      .eq('job_id', jobId);
    
    if (error) throw error;
    return data;
  },

  // Get applications by candidate
  async getApplicationsByCandidate(candidateId) {
    const { data, error } = await supabase
      .from('Applications')
      .select('*')
      .eq('candidate_id', candidateId);
    
    if (error) throw error;
    return data;
  },

  // Update application status
  async updateApplicationStatus(applicationId, status) {
    const { data, error } = await supabase
      .from('Applications')
      .update({ status })
      .eq('application_id', applicationId)
      .select();
    
    if (error) throw error;
    return data;
  },

  // Delete application
  async deleteApplication(applicationId) {
    const { error } = await supabase
      .from('Applications')
      .delete()
      .eq('application_id', applicationId);
    
    if (error) throw error;
    return true;
  }
};

// AI Ranking Service - This would integrate with the AI APIs 
// for resume parsing and candidate ranking
export const aiRankingService = {
  // Rank candidates for a specific job
  async rankCandidatesForJob(jobId) {
    // First, get the job details
    const job = await jobService.getJobById(jobId);
    
    // Then get all applications for this job
    const applications = await applicationService.getApplicationsByJob(jobId);
    
    // Get candidate details for each application
    const candidatesPromises = applications.map(app => 
      candidateService.getCandidateById(app.candidate_id)
    );
    const candidates = await Promise.all(candidatesPromises);
    
    // This is where you would integrate with your AI API
    // For now, we'll just return the candidates with a random score
    const rankedCandidates = candidates.map((candidate, index) => ({
      ...candidate,
      application_id: applications[index].application_id,
      // In a real implementation, this would be a score from the AI API
      score: Math.random() * 100
    }));
    
    // Sort by score in descending order
    rankedCandidates.sort((a, b) => b.score - a.score);
    
    return rankedCandidates;
  }
};

// Authentication service using Supabase Auth
export const authService = {
  // Register a new user
  async register(email, password, userData) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) throw authError;
    
    // If auth successful, create user record in our database
    if (authData.user) {
      const newUser = {
        ...userData,
        email,
        // Use the Supabase auth user ID as our user_id
        user_id: authData.user.id
      };
      
      await userService.createUser(newUser);
      
      return authData;
    }
  },
  
  // Login existing user
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },
  
  // Logout current user
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  },
  
  // Get current user
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    // If we have a user, get their details from our Users table
    if (data.user) {
      const userData = await userService.getUserById(data.user.id);
      return { ...data, userData };
    }
    
    return data;
  }
};

export default {
  userService,
  candidateService,
  recruiterService,
  jobService,
  applicationService,
  aiRankingService,
  authService
};