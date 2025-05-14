// Database Models for JobMatch application
// These models represent the database tables

/**
 * User Model - represents a user in the system
 */
export class User {
    constructor(data = {}) {
      this.id = data.id || null;
      this.name = data.name || '';
      this.email = data.email || '';
      this.role = data.role || 'job_seeker'; // Default role
      this.created_at = data.created_at || new Date();
    }
  
    // Helper method to convert to database format
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        email: this.email,
        role: this.role,
        created_at: this.created_at
      };
    }
  }
  
  /**
   * JobPost Model - represents a job posting
   */
  export class JobPost {
    constructor(data = {}) {
      this.id = data.id || null;
      this.title = data.title || '';
      this.company = data.company || '';
      this.description = data.description || '';
      this.requirements = data.requirements || '';
      this.location = data.location || '';
      this.salary_range = data.salary_range || '';
      this.job_type = data.job_type || 'full-time'; // Default job type
      this.posted_by = data.posted_by || null;
      this.created_at = data.created_at || new Date();
      
      // Include poster information if available
      if (data.users) {
        this.poster = {
          name: data.users.name,
          email: data.users.email
        };
      }
    }
  
    // Helper method to convert to database format
    toJSON() {
      return {
        id: this.id,
        title: this.title,
        company: this.company,
        description: this.description,
        requirements: this.requirements,
        location: this.location,
        salary_range: this.salary_range,
        job_type: this.job_type,
        posted_by: this.posted_by,
        created_at: this.created_at
      };
    }
  }
  
  /**
   * Resume Model - represents a user's resume
   */
  export class Resume {
    constructor(data = {}) {
      this.id = data.id || null;
      this.user_id = data.user_id || null;
      this.education = data.education || '';
      this.experience = data.experience || '';
      this.skills = data.skills || '';
      this.created_at = data.created_at || new Date();
      
      // Include user information if available
      if (data.users) {
        this.user = {
          name: data.users.name,
          email: data.users.email
        };
      }
    }
  
    // Helper method to convert to database format
    toJSON() {
      return {
        id: this.id,
        user_id: this.user_id,
        education: this.education,
        experience: this.experience,
        skills: this.skills,
        created_at: this.created_at
      };
    }
  }
  
  /**
   * Ranking Model - represents a job-user ranking match
   */
  export class Ranking {
    constructor(data = {}) {
      this.id = data.id || null;
      this.job_id = data.job_id || null;
      this.user_id = data.user_id || null;
      this.score = data.score || 0;
      this.created_at = data.created_at || new Date();
      
      // Include job information if available
      if (data.job_posts) {
        this.job = {
          id: data.job_posts.id,
          title: data.job_posts.title
        };
      }
      
      // Include user information if available
      if (data.users) {
        this.user = {
          id: data.users.id,
          name: data.users.name,
          email: data.users.email
        };
      }
    }
  
    // Helper method to convert to database format
    toJSON() {
      return {
        id: this.id,
        job_id: this.job_id,
        user_id: this.user_id,
        score: this.score,
        created_at: this.created_at
      };
    }
  }