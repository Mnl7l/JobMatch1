// src/components/Jobs.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import './Jobs.css';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    keyword: '',
    location: '',
    jobType: '',
    experience: '',
    remote: ''
  });

  // Helper function to safely parse JSON fields
  const parseJsonField = (field) => {
    if (!field) return [];
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        console.error('Error parsing JSON field:', e);
        return [];
      }
    }
    if (Array.isArray(field)) return field;
    return [];
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        console.log('Fetching all available jobs');
        
        // Query without problematic join
        const { data, error } = await supabase
          .from('job_posts')
          .select(`
            id,
            title,
            company,
            description,
            requirements,
            location,
            salary_range,
            job_type,
            department,
            industry,
            required_experience,
            education_level,
            employment_type,
            required_skills,
            preferred_skills,
            is_remote,
            application_deadline,
            benefits,
            created_at,
            posted_by
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`Found ${data?.length || 0} jobs`);
        
        // Process the data to ensure JSON fields are parsed
        const processedJobs = (data || []).map(job => {
          return {
            ...job,
            // Parse JSON fields safely
            required_skills: parseJsonField(job.required_skills),
            preferred_skills: parseJsonField(job.preferred_skills),
            benefits: parseJsonField(job.benefits)
          };
        });
        
        setJobs(processedJobs);
      } catch (error) {
        console.error('Error fetching jobs:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []); // Empty dependency array is fine since fetchJobs is defined inside useEffect

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter jobs based on selected filters
  const filteredJobs = jobs.filter(job => {
    // Filter by keyword (in title, company, or description)
    if (filters.keyword && 
      !job.title.toLowerCase().includes(filters.keyword.toLowerCase()) &&
      !job.company.toLowerCase().includes(filters.keyword.toLowerCase()) &&
      !(job.description && job.description.toLowerCase().includes(filters.keyword.toLowerCase()))
    ) {
      return false;
    }
    
    // Filter by location
    if (filters.location && 
      !(job.location && job.location.toLowerCase().includes(filters.location.toLowerCase()))
    ) {
      return false;
    }
    
    // Filter by job type
    if (filters.jobType && job.job_type !== filters.jobType) {
      return false;
    }
    
    // Filter by experience level
    if (filters.experience && job.required_experience !== filters.experience) {
      return false;
    }
    
    // Filter by remote option
    if (filters.remote === 'remote' && !job.is_remote) {
      return false;
    }
    if (filters.remote === 'onsite' && job.is_remote) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return <div className="loading">Loading available jobs...</div>;
  }

  if (error) {
    return <div className="error-message">Error loading jobs: {error}</div>;
  }

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <h1>Available Jobs</h1>
        <p>Find and apply for your dream job</p>
      </div>
      
      {/* Rest of your JSX remains the same... */}
      {/* Filters */}
      <div className="jobs-filters">
        <div className="filter-row">
          <div className="filter-group">
            <input
              type="text"
              name="keyword"
              placeholder="Job title, company, or keyword"
              value={filters.keyword}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <input
              type="text"
              name="location"
              placeholder="Location"
              value={filters.location}
              onChange={handleFilterChange}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <select
              name="jobType"
              value={filters.jobType}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Job Types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="remote">Remote</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select
              name="experience"
              value={filters.experience}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Experience Levels</option>
              <option value="0-1">Entry Level (0-1 years)</option>
              <option value="1-3">Junior (1-3 years)</option>
              <option value="3-5">Mid-Level (3-5 years)</option>
              <option value="5-10">Senior (5-10 years)</option>
              <option value="10+">Expert (10+ years)</option>
            </select>
          </div>
          
          <div className="filter-group">
            <select
              name="remote"
              value={filters.remote}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">On-site & Remote</option>
              <option value="remote">Remote Only</option>
              <option value="onsite">On-site Only</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="no-jobs-found">
          <h3>No jobs found</h3>
          <p>Try adjusting your search filters or check back later for new opportunities.</p>
        </div>
      ) : (
        <div className="jobs-list">
          {filteredJobs.map(job => (
            <div className="job-card" key={job.id}>
              <div className="job-card-header">
                <h2 className="job-title">{job.title}</h2>
                <div className="job-badges">
                  <span className={`job-type-badge ${job.job_type || ''}`}>
                    {job.job_type ? job.job_type.replace('-', ' ') : ''}
                  </span>
                  {job.is_remote && <span className="remote-badge">Remote</span>}
                </div>
              </div>
              
              <div className="job-company">{job.company}</div>
              
              <div className="job-details">
                {job.location && (
                  <div className="job-location">
                    <i className="fas fa-map-marker-alt"></i> {job.location}
                  </div>
                )}
                
                {job.salary_range && (
                  <div className="job-salary">
                    <i className="fas fa-money-bill-wave"></i> {job.salary_range}
                  </div>
                )}
                
                {job.required_experience && (
                  <div className="job-experience">
                    <i className="fas fa-briefcase"></i> {job.required_experience} years
                  </div>
                )}
              </div>
              
              <div className="job-description">
                {job.description && job.description.length > 150
                  ? `${job.description.substring(0, 150)}...`
                  : job.description}
              </div>
              
              {/* Show skills if available */}
              {job.required_skills && job.required_skills.length > 0 && (
                <div className="job-skills">
                  <div className="skills-label">Required Skills:</div>
                  <div className="skills-tags">
                    {job.required_skills.slice(0, 5).map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                    {job.required_skills.length > 5 && 
                      <span className="more-skills">+{job.required_skills.length - 5} more</span>
                    }
                  </div>
                </div>
              )}
              
              {/* Show benefits if available */}
              {job.benefits && job.benefits.length > 0 && (
                <div className="job-benefits">
                  <div className="benefits-label">Benefits:</div>
                  <div className="benefits-list">
                    {job.benefits.slice(0, 3).map((benefit, index) => (
                      <span key={index} className="benefit-item">
                        <i className="fas fa-check"></i> {benefit}
                      </span>
                    ))}
                    {job.benefits.length > 3 && 
                      <span className="more-benefits">+{job.benefits.length - 3} more</span>
                    }
                  </div>
                </div>
              )}
              
              <div className="job-footer">
                <div className="job-meta">
                  <span className="job-posted-date">
                    Posted: {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  {job.application_deadline && (
                    <span className="job-deadline">
                      Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Link to={`/jobs/${job.id}`} className="view-job-btn">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jobs;