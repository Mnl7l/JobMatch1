// src/components/JobForm.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import './JobForm.css';

const JobForm = ({ isEditMode }) => {
  console.log('JobForm component rendering, isEditMode:', isEditMode);
  
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    requirements: '',
    location: '',
    salary_range: '',
    job_type: 'full-time',
    department: '',
    industry: '',
    required_experience: '',
    education_level: '',
    employment_type: 'full-time',
    required_skills: [],
    preferred_skills: [],
    is_remote: false,
    application_deadline: '',
    benefits: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();

  // Skill options
  const skillOptions = [
    'JavaScript', 'React', 'Angular', 'Vue', 'Node.js', 'Python', 'Java', 'C#', 
    'PHP', 'Ruby', 'SQL', 'NoSQL', 'MongoDB', 'AWS', 'Azure', 'Docker', 
    'Kubernetes', 'Git', 'CI/CD', 'REST API', 'GraphQL', 'Machine Learning',
    'Data Analysis', 'DevOps', 'Agile', 'Scrum'
  ];

  // Experience level options
  const experienceOptions = [
    { value: '0-1', label: 'Entry Level (0-1 years)' },
    { value: '1-3', label: 'Junior (1-3 years)' },
    { value: '3-5', label: 'Mid-Level (3-5 years)' },
    { value: '5-10', label: 'Senior (5-10 years)' },
    { value: '10+', label: 'Expert (10+ years)' }
  ];

  // Education level options
  const educationOptions = [
    { value: 'high_school', label: 'High School' },
    { value: 'associate', label: 'Associate Degree' },
    { value: 'bachelor', label: 'Bachelor\'s Degree' },
    { value: 'master', label: 'Master\'s Degree' },
    { value: 'phd', label: 'PhD' },
    { value: 'certification', label: 'Professional Certification' }
  ];

  // Benefits options
  const benefitsOptions = [
    'Health Insurance', 'Dental Insurance', 'Vision Insurance', '401k',
    'Flexible Schedule', 'Remote Work', 'Paid Time Off', 'Stock Options',
    'Gym Membership', 'Professional Development', 'Free Lunch'
  ];

  // Use useCallback to memoize the fetchJobDetails function
  const fetchJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching job details for ID:', id);
      
      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      console.log('Job details fetched:', data);
      
      // Check if current user is the owner of this job
      const { data: { user } } = await supabase.auth.getUser();
      if (user.id !== data.posted_by) {
        throw new Error('You do not have permission to edit this job');
      }
      
      // Parse JSON fields if they're stored as strings
      data.required_skills = typeof data.required_skills === 'string' ? 
        JSON.parse(data.required_skills || '[]') : (data.required_skills || []);
      data.preferred_skills = typeof data.preferred_skills === 'string' ? 
        JSON.parse(data.preferred_skills || '[]') : (data.preferred_skills || []);
      data.benefits = typeof data.benefits === 'string' ? 
        JSON.parse(data.benefits || '[]') : (data.benefits || []);
      
      setFormData(data);
    } catch (error) {
      console.error('Error fetching job:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // If in edit mode, fetch the job details
    if (isEditMode && id) {
      console.log('Edit mode active, fetching job details');
      fetchJobDetails();
    } else {
      console.log('Create new job mode');
    }
  }, [isEditMode, id, fetchJobDetails]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSkillChange = (skill, isRequired = true) => {
    const fieldName = isRequired ? 'required_skills' : 'preferred_skills';
    setFormData(prev => {
      const currentSkills = [...prev[fieldName]];
      const index = currentSkills.indexOf(skill);
      
      if (index > -1) {
        currentSkills.splice(index, 1);
      } else {
        currentSkills.push(skill);
      }
      
      return {
        ...prev,
        [fieldName]: currentSkills
      };
    });
  };

  const handleBenefitChange = (benefit) => {
    setFormData(prev => {
      const currentBenefits = [...prev.benefits];
      const index = currentBenefits.indexOf(benefit);
      
      if (index > -1) {
        currentBenefits.splice(index, 1);
      } else {
        currentBenefits.push(benefit);
      }
      
      return {
        ...prev,
        benefits: currentBenefits
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    try {
      setLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to post a job');
      }
      
      console.log('Current user ID:', user.id);
      
      // Prepare job data, ensuring all fields are properly formatted
      const jobData = {
        title: formData.title,
        company: formData.company,
        description: formData.description,
        requirements: formData.requirements,
        location: formData.location,
        salary_range: formData.salary_range,
        job_type: formData.job_type,
        department: formData.department,
        industry: formData.industry,
        required_experience: formData.required_experience,
        education_level: formData.education_level,
        employment_type: formData.employment_type,
        required_skills: JSON.stringify(formData.required_skills || []),
        preferred_skills: JSON.stringify(formData.preferred_skills || []),
        is_remote: formData.is_remote,
        application_deadline: formData.application_deadline || null,
        benefits: JSON.stringify(formData.benefits || []),
        posted_by: user.id
      };
      
      // Use a variable to track the response
      let response;
      
      if (isEditMode && id) {
        console.log('Updating existing job');
        // Update existing job
        const { data, error } = await supabase
          .from('job_posts')
          .update(jobData)
          .eq('id', id)
          .select();
        
        if (error) throw error;
        response = data;
        setSuccess('Job updated successfully!');
      } else {
        console.log('Creating new job');
        // Create new job
        const { data, error } = await supabase
          .from('job_posts')
          .insert([jobData])
          .select();
        
        if (error) throw error;
        response = data;
        setSuccess('Job posted successfully!');
      }
      
      // Use the response variable
      console.log('Job saved successfully:', response);
      
      // Show success message temporarily
      setTimeout(() => {
        // Redirect to admin panel or job listing
        console.log('Redirecting to admin panel');
        navigate('/admin');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving job:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return <div className="loading">Loading job details...</div>;
  }

  return (
    <div className="job-form-container">
      <h2>{isEditMode ? 'Edit Job Post' : 'Post a New Job'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="job-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="title">Job Title*</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g. Software Engineer, Product Manager"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="company">Company*</label>
            <input
              id="company"
              name="company"
              type="text"
              value={formData.company}
              onChange={handleChange}
              required
              placeholder="Your company name"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input
                id="department"
                name="department"
                type="text"
                value={formData.department || ''}
                onChange={handleChange}
                placeholder="e.g. Engineering, Marketing"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="industry">Industry</label>
              <input
                id="industry"
                name="industry"
                type="text"
                value={formData.industry || ''}
                onChange={handleChange}
                placeholder="e.g. Technology, Finance"
              />
            </div>
          </div>
        </div>
        
        {/* Job Details Section */}
        <div className="form-section">
          <h3>Job Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="job_type">Job Type*</label>
              <select
                id="job_type"
                name="job_type"
                value={formData.job_type}
                onChange={handleChange}
                required
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="employment_type">Employment Type</label>
              <select
                id="employment_type"
                name="employment_type"
                value={formData.employment_type || 'full-time'}
                onChange={handleChange}
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location || ''}
                onChange={handleChange}
                placeholder="e.g. Riyadh, Saudi Arabia or Remote"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="salary_range">Salary Range</label>
              <input
                id="salary_range"
                name="salary_range"
                type="text"
                value={formData.salary_range || ''}
                onChange={handleChange}
                placeholder="e.g. $60,000 - $80,000"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="application_deadline">Application Deadline</label>
              <input
                id="application_deadline"
                name="application_deadline"
                type="date"
                value={formData.application_deadline || ''}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="is_remote"
                  checked={formData.is_remote || false}
                  onChange={handleChange}
                />
                Remote Work Available
              </label>
            </div>
          </div>
        </div>
        
        {/* Description Section */}
        <div className="form-section">
          <h3>Job Description</h3>
          
          <div className="form-group">
            <label htmlFor="description">Job Description*</label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows="5"
              required
              placeholder="Describe the job position, responsibilities, and requirements"
            ></textarea>
          </div>
          
          <div className="form-group">
            <label htmlFor="requirements">Requirements</label>
            <textarea
              id="requirements"
              name="requirements"
              value={formData.requirements || ''}
              onChange={handleChange}
              rows="5"
              placeholder="List the skills, qualifications, and experience required"
            ></textarea>
          </div>
        </div>
        
        {/* Qualifications Section */}
        <div className="form-section">
          <h3>Qualifications</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="required_experience">Required Experience</label>
              <select
                id="required_experience"
                name="required_experience"
                value={formData.required_experience || ''}
                onChange={handleChange}
              >
                <option value="">Select Experience Level</option>
                {experienceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="education_level">Education Level</label>
              <select
                id="education_level"
                name="education_level"
                value={formData.education_level || ''}
                onChange={handleChange}
              >
                <option value="">Select Education Level</option>
                {educationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Skills Section */}
        <div className="form-section">
          <h3>Skills</h3>
          
          <div className="form-group">
            <label>Required Skills</label>
            <div className="skills-grid">
              {skillOptions.map(skill => (
                <div key={skill} className="skill-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.required_skills.includes(skill)}
                      onChange={() => handleSkillChange(skill, true)}
                    />
                    {skill}
                  </label>
                </div>
              ))}
            </div>
            <p className="form-helper">Select all skills that are absolutely required for this position</p>
          </div>
          
          <div className="form-group">
            <label>Preferred Skills</label>
            <div className="skills-grid">
              {skillOptions.map(skill => (
                <div key={skill} className="skill-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.preferred_skills.includes(skill)}
                      onChange={() => handleSkillChange(skill, false)}
                    />
                    {skill}
                  </label>
                </div>
              ))}
            </div>
            <p className="form-helper">Select skills that would be nice to have but are not required</p>
          </div>
        </div>
        
        {/* Benefits Section */}
        <div className="form-section">
          <h3>Benefits</h3>
          
          <div className="form-group">
            <label>Company Benefits</label>
            <div className="benefits-grid">
              {benefitsOptions.map(benefit => (
                <div key={benefit} className="benefit-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.benefits.includes(benefit)}
                      onChange={() => handleBenefitChange(benefit)}
                    />
                    {benefit}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button" 
            onClick={() => navigate('/admin')}
          >
            Cancel
          </button>
          
          <button 
            type="submit" 
            className="submit-button" 
            disabled={loading}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Job' : 'Post Job'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default JobForm;