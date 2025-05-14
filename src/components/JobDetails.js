// src/components/JobDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { confirmAction } from '../utils/confirmDialog';
import './JobDetail.css';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(false);
  const [isEmployer, setIsEmployer] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching job details for ID:', id);
        
        // Get job details
        const { data: jobData, error: jobError } = await supabase
          .from('job_posts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (jobError) throw jobError;
        
        console.log('Job details fetched:', jobData);
        setJob(jobData);
        
        // Check if current user is the employer who posted this job
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('Current user:', user.id);
          console.log('Job poster:', jobData.posted_by);
          
          // Get user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!profileError && profileData) {
            setUserProfile(profileData);
            
            // Check if user is the job poster
            const isUserEmployer = user.id === jobData.posted_by;
            setIsEmployer(isUserEmployer);
            
            // Only check for application if user is not the employer
            if (!isUserEmployer) {
              // Check if user has already applied to this job
              const { data: existingApplication, error: applicationError } = await supabase
                .from('applications')
                .select('id, match_score')
                .eq('job_id', id)
                .eq('user_id', user.id)
                .single();
              
              if (!applicationError && existingApplication) {
                console.log('User has already applied for this job');
                setApplied(true);
                // If match score is available, show it
                if (existingApplication.match_score) {
                  setMatchScore(existingApplication.match_score);
                }
              } else {
                console.log('User has not applied for this job yet');
              }
            }
          }
        }
        
      } catch (error) {
        console.error('Error fetching job details:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobDetails();
  }, [id]);

  const calculateMatchScore = async (resumeData, jobData) => {
    try {
      // Extract keywords from job posting
      const jobText = ((jobData.requirements || '') + ' ' + (jobData.description || '')).toLowerCase();
      const resumeText = ((resumeData.skills || '') + ' ' + (resumeData.experience || '') + ' ' + (resumeData.education || '')).toLowerCase();
      
      // Define common technical keywords that might appear in jobs and resumes
      const keywords = [
        'javascript', 'react', 'node', 'python', 'java', 'c++', 'sql', 'nosql', 
        'mongodb', 'aws', 'cloud', 'docker', 'kubernetes', 'devops', 'agile',
        'scrum', 'bachelor', 'master', 'phd', 'degree', 'certification',
        'project management', 'leadership', 'team', 'communication', 'problem solving',
        'full stack', 'frontend', 'backend', 'mobile', 'web', 'design', 'testing',
        'qa', 'security', 'data', 'analytics', 'machine learning', 'ai',
        'react native', 'angular', 'vue', 'typescript', 'html', 'css', 'sass',
        'php', 'c#', '.net', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter',
        'android', 'ios', 'excel', 'word', 'powerpoint', 'blockchain', 'crypto',
        'networking', 'linux', 'windows', 'macos', 'git', 'github', 'gitlab',
        'jira', 'confluence', 'slack', 'figma', 'sketch', 'adobe', 'photoshop',
        'illustrator', 'indesign', 'xd', 'ui', 'ux', 'research', 'sales',
        'marketing', 'finance', 'accounting', 'hr', 'operations', 'product',
        'manager', 'senior', 'junior', 'lead', 'director', 'vp', 'ceo', 'cto',
        'cfo', 'coo', 'database', 'infrastructure', 'automation', 'ci/cd',
        'jenkins', 'bitbucket', 'ecommerce', 'analysis', 'engineering'
      ];
      
      // Count matches
      let matchCount = 0;
      let totalKeywords = 0;
      
      keywords.forEach(keyword => {
        if (jobText.includes(keyword)) {
          totalKeywords++;
          if (resumeText.includes(keyword)) {
            matchCount++;
          }
        }
      });
      
      // Calculate base score as a percentage
      let score = totalKeywords > 0 ? Math.round((matchCount / totalKeywords) * 100) : 50;
      
      // Adjust score based on experience and education requirements
      // This is a simplified version of what a real AI matching system would do
      if (jobText.includes('experience') && resumeText.includes('experience')) {
        score += 5;
      }
      
      if (jobText.includes('bachelor') && resumeText.includes('bachelor')) {
        score += 5;
      }
      
      if (jobText.includes('master') && resumeText.includes('master')) {
        score += 7;
      }
      
      if (jobText.includes('phd') && resumeText.includes('phd')) {
        score += 10;
      }
      
      // Add a small randomness factor to simulate AI variability
      score = Math.min(98, Math.max(30, score + Math.floor(Math.random() * 6) - 3));
      
      return score;
    } catch (error) {
      console.error('Error calculating match score:', error.message);
      // Return a default score if calculation fails
      return Math.floor(Math.random() * 65) + 30;
    }
  };

  const handleApply = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to login if not authenticated
        console.log('User not authenticated, redirecting to login');
        navigate('/login');
        return;
      }
      
      console.log('Applying for job as user:', user.id);
      
      // Check if user is a job seeker
      if (userProfile && userProfile.role !== 'job_seeker') {
        alert('Only job seekers can apply for jobs. Please log in with a job seeker account.');
        return;
      }
      
      // **First, check if user has already applied for this job**
      const { data: existingApplication, error: applicationCheckError } = await supabase
        .from('applications')
        .select('id, match_score')
        .eq('job_id', id)
        .eq('user_id', user.id)
        .single();
      
      if (applicationCheckError && applicationCheckError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected if user hasn't applied
        throw applicationCheckError;
      }
      
      if (existingApplication) {
        console.log('User has already applied for this job');
        setApplied(true);
        if (existingApplication.match_score) {
          setMatchScore(existingApplication.match_score);
        }
        alert('You have already applied for this job.');
        return;
      }
      
      // Get user's resume
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (resumeError) {
        console.log('No resume found for user');
        const confirmUpload = window.confirm('You need to upload a resume before applying. Would you like to upload your resume now?');
        if (confirmUpload) {
          navigate('/upload');
        }
        return;
      }
      
      console.log('Found resume:', resumeData);
      const resumeUrl = resumeData?.file_url || null;
      
      // Calculate match score
      const calculatedMatchScore = await calculateMatchScore(resumeData, job);
      setMatchScore(calculatedMatchScore);
      console.log('Calculated match score:', calculatedMatchScore);
      
      // Create application record
      const applicationData = {
        job_id: id,
        user_id: user.id,
        status: 'pending',
        match_score: calculatedMatchScore, // Add match score directly
        resume_url: resumeUrl // Add resume URL directly
      };
      
      console.log('Submitting application with data:', applicationData);
      
      const { error } = await supabase
        .from('applications')
        .insert([applicationData]);
      
      if (error) throw error;
      
      console.log('Application submitted successfully');
      setApplied(true);
      
      // Show success message with match score
      alert(`Application submitted successfully! Your match score is ${calculatedMatchScore}%.`);
      
    } catch (error) {
      console.error('Error applying for job:', error.message);
      
      // Handle specific error messages
      if (error.message.includes('duplicate key value')) {
        alert('You have already applied for this job.');
        setApplied(true);
      } else {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleEdit = () => {
    navigate(`/edit-job/${id}`);
  };

  const handleDelete = () => {
    if (confirmAction('Are you sure you want to delete this job? This action cannot be undone.')) {
      deleteJob();
    }
  };
  
  const deleteJob = async () => {
    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      navigate('/admin');
    } catch (error) {
      console.error('Error deleting job:', error.message);
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading job details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!job) {
    return <div className="error-message">Job not found</div>;
  }

  // Parse JSON fields safely
  const parseJsonField = (field) => {
    if (!field) return [];
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return [];
      }
    }
    return field;
  };

  const requiredSkills = parseJsonField(job.required_skills);
  const preferredSkills = parseJsonField(job.preferred_skills);
  const benefits = parseJsonField(job.benefits);

  return (
    <div className="job-detail-container">
      {/* Hero Section */}
      <div className="job-hero">
        <div className="container">
          <div className="job-hero-content">
            <h1 className="job-title">{job.title}</h1>
            <div className="company-info">
              <h2 className="company-name">{job.company}</h2>
              {job.location && <p className="location">{job.location}</p>}
            </div>
            <div className="job-meta-pills">
              {job.job_type && (
                <span className={`meta-pill ${job.job_type}`}>
                  {job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1).replace('-', ' ')}
                </span>
              )}
              {job.is_remote && <span className="meta-pill remote">Remote</span>}
              {job.salary_range && <span className="meta-pill salary">{job.salary_range}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="job-content">
          {/* Apply Section */}
          {!isEmployer && (
            <div className="apply-section">
              {applied && matchScore && (
                <div className="match-score-display">
                  <h3>Your Match Score</h3>
                  <div className={`score-circle ${
                    matchScore >= 80 ? 'high-match' : 
                    matchScore >= 50 ? 'medium-match' : 'low-match'
                  }`}>
                    {matchScore}%
                  </div>
                  <p className="match-text">
                    {matchScore >= 80 ? 'You\'re a great match for this job!' : 
                    matchScore >= 50 ? 'You match many requirements for this job.' : 
                    'You match some requirements for this job.'}
                  </p>
                </div>
              )}
              
              <button 
                className="apply-button" 
                onClick={handleApply}
                disabled={applied}
              >
                {applied ? 'Already Applied' : 'Apply Now'}
              </button>
            </div>
          )}

          {/* Employer Actions */}
          {isEmployer && (
            <div className="employer-actions">
              <button className="btn btn-secondary" onClick={handleEdit}>
                Edit Job
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete Job
              </button>
            </div>
          )}
          
          {/* Job Details Sections */}
          <div className="job-details-grid">
            {/* Job Description */}
            <div className="detail-section">
              <h3>Job Description</h3>
              <div className="detail-content">
                {job.description || 'No description provided.'}
              </div>
            </div>
            
            {/* Requirements */}
            <div className="detail-section">
              <h3>Requirements</h3>
              <div className="detail-content">
                {job.requirements || 'No specific requirements listed.'}
              </div>
            </div>
            
            {/* Skills Section */}
            {(requiredSkills.length > 0 || preferredSkills.length > 0) && (
              <div className="detail-section">
                <h3>Skills</h3>
                <div className="skills-container">
                  {requiredSkills.length > 0 && (
                    <div className="skills-group">
                      <h4>Required Skills</h4>
                      <div className="skills-tags">
                        {requiredSkills.map((skill, index) => (
                          <span key={index} className="skill-tag required">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {preferredSkills.length > 0 && (
                    <div className="skills-group">
                      <h4>Preferred Skills</h4>
                      <div className="skills-tags">
                        {preferredSkills.map((skill, index) => (
                          <span key={index} className="skill-tag preferred">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Job Details */}
            <div className="detail-section">
              <h3>Job Details</h3>
              <div className="job-specs">
                {job.required_experience && (
                  <div className="spec-item">
                    <span className="spec-label">Experience:</span>
                    <span className="spec-value">{job.required_experience} years</span>
                  </div>
                )}
                {job.education_level && (
                  <div className="spec-item">
                    <span className="spec-label">Education:</span>
                    <span className="spec-value">
                      {job.education_level.charAt(0).toUpperCase() + job.education_level.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                )}
                {job.department && (
                  <div className="spec-item">
                    <span className="spec-label">Department:</span>
                    <span className="spec-value">{job.department}</span>
                  </div>
                )}
                {job.industry && (
                  <div className="spec-item">
                    <span className="spec-label">Industry:</span>
                    <span className="spec-value">{job.industry}</span>
                  </div>
                )}
                {job.application_deadline && (
                  <div className="spec-item">
                    <span className="spec-label">Application Deadline:</span>
                    <span className="spec-value">{new Date(job.application_deadline).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="spec-item">
                  <span className="spec-label">Posted:</span>
                  <span className="spec-value">{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            {/* Benefits */}
            {benefits.length > 0 && (
              <div className="detail-section">
                <h3>Benefits</h3>
                <div className="benefits-grid">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="benefit-item">
                      <i className="fas fa-check-circle"></i>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;