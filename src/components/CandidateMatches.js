// src/components/CandidateMatches.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import MatchingService from '../services/matchingService';
import './CandidateMatches.css';

const CandidateMatches = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [processingMatches, setProcessingMatches] = useState(false);
  const [error, setError] = useState(null);
  const [resume, setResume] = useState(null);
  const [filters, setFilters] = useState({
    matchScore: '',
    jobType: '',
    location: ''
  });

  // Fetch user data and matches on component mount
  useEffect(() => {
    const fetchUserAndMatches = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login'); // Redirect to login if not authenticated
          return;
        }
        
        setUser(user);
        
        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        
        // Redirect if not a job seeker
        if (profile.role !== 'job_seeker') {
          navigate('/');
          return;
        }
        
        // Check if user has resume
        const { data: resumeData, error: resumeError } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!resumeError && resumeData) {
          setResume(resumeData);
          
          // Load job matches if resume exists
          await loadJobMatches(user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user and matches:', error.message);
        setError('Failed to load match data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchUserAndMatches();
  }, [navigate]);

  // Load job matches for the current user
  const loadJobMatches = async (userId) => {
    try {
      setLoading(true);
      
      // Get rankings for this user
      const { data: rankings, error: rankingsError } = await supabase
        .from('rankings')
        .select(`
          *,
          job_posts:job_id (
            *,
            profiles:posted_by (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('user_id', userId)
        .order('score', { ascending: false });
      
      if (rankingsError) throw rankingsError;
      
      // Process matches data
      const processedMatches = rankings.map(ranking => {
        // Parse score details if stored as string
        const scoreDetails = ranking.details 
          ? (typeof ranking.details === 'string' ? JSON.parse(ranking.details) : ranking.details) 
          : null;
          
        return {
          id: ranking.id,
          jobId: ranking.job_id,
          matchScore: ranking.score,
          scoreDetails: scoreDetails,
          status: ranking.status || 'pending',
          jobTitle: ranking.job_posts?.title || 'Unknown Job',
          company: ranking.job_posts?.company || 'Unknown Company',
          location: ranking.job_posts?.location || '',
          isRemote: ranking.job_posts?.is_remote || false,
          salary: ranking.job_posts?.salary_range || '',
          jobType: ranking.job_posts?.job_type || ranking.job_posts?.employment_type || '',
          postedBy: ranking.job_posts?.profiles
            ? `${ranking.job_posts.profiles.first_name || ''} ${ranking.job_posts.profiles.last_name || ''}`.trim()
            : 'Unknown Employer',
          employerEmail: ranking.job_posts?.profiles?.email || '',
          deadline: ranking.job_posts?.application_deadline || '',
          createdAt: ranking.job_posts?.created_at
            ? new Date(ranking.job_posts.created_at).toLocaleDateString()
            : ''
        };
      });
      
      setMatches(processedMatches);
      setLoading(false);
    } catch (error) {
      console.error('Error loading job matches:', error.message);
      setError('Failed to load job matches. Please try again.');
      setLoading(false);
    }
  };

  // Process matches for all available jobs
  const processMatches = async () => {
    if (!user) return;
    
    try {
      setProcessingMatches(true);
      
      // Use the matching service to process all jobs
      await MatchingService.processCandidateMatches(user.id);
      
      // Reload matches with updated scores
      await loadJobMatches(user.id);
    } catch (error) {
      console.error('Error processing matches:', error.message);
      setError('Failed to process matches. Please try again.');
      setProcessingMatches(false);
    }
  };

  // Filter matches based on selected filters
  const getFilteredMatches = () => {
    return matches.filter(match => {
      // Match score filter
      if (filters.matchScore) {
        const score = Number(match.matchScore);
        switch (filters.matchScore) {
          case 'high':
            if (score < 80) return false;
            break;
          case 'medium':
            if (score < 60 || score >= 80) return false;
            break;
          case 'low':
            if (score >= 60) return false;
            break;
          default:
            break;
        }
      }
      
      // Job type filter
      if (filters.jobType && match.jobType) {
        if (!match.jobType.toLowerCase().includes(filters.jobType.toLowerCase())) {
          return false;
        }
      }
      
      // Location filter
      if (filters.location && match.location) {
        if (!match.location.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      matchScore: '',
      jobType: '',
      location: ''
    });
  };

  // Apply for a job
  const applyForJob = async (jobId) => {
    try {
      // Create an application record
      const { error } = await supabase
        .from('applications')
        .insert([{
          job_id: jobId,
          user_id: user.id,
          status: 'pending',
          applied_at: new Date()
        }]);
      
      if (error) throw error;
      
      // Update the status in rankings
      await supabase
        .from('rankings')
        .update({ status: 'applied' })
        .eq('job_id', jobId)
        .eq('user_id', user.id);
      
      // Update local state
      setMatches(prev => 
        prev.map(match => 
          match.jobId === jobId ? { ...match, status: 'applied' } : match
        )
      );
      
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying for job:', error.message);
      alert('Failed to submit application. Please try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading matches...</div>;
  }

  if (!resume) {
    return (
      <div className="candidate-matches">
        <h2>Job Matches</h2>
        <div className="no-resume">
          <h3>Complete Your Profile</h3>
          <p>You need to create a resume before we can find job matches for you.</p>
          <button 
            className="create-resume-btn"
            onClick={() => navigate('/resume')}
          >
            Create Resume
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="candidate-matches">
      <h2>Your Job Matches</h2>
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <div className="matches-header">
        <p>{matches.length} job matches found</p>
        <button 
          className="refresh-btn"
          onClick={processMatches}
          disabled={processingMatches}
        >
          {processingMatches ? 'Processing...' : 'Find New Matches'}
        </button>
      </div>
      
      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Match Score</label>
          <select 
            name="matchScore" 
            value={filters.matchScore}
            onChange={handleFilterChange}
          >
            <option value="">All Scores</option>
            <option value="high">High Match (80%+)</option>
            <option value="medium">Medium Match (60-79%)</option>
            <option value="low">Low Match (&lt;60%)</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Job Type</label>
          <input 
            type="text" 
            name="jobType"
            value={filters.jobType}
            onChange={handleFilterChange}
            placeholder="Filter by job type"
          />
        </div>
        
        <div className="filter-group">
          <label>Location</label>
          <input 
            type="text" 
            name="location"
            value={filters.location}
            onChange={handleFilterChange}
            placeholder="Filter by location"
          />
        </div>
        
        <button 
          className="clear-filters-btn"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      </div>
      
      {/* Matches list */}
      {matches.length === 0 ? (
        <div className="no-matches">
          <p>No job matches found.</p>
          <p>Click "Find New Matches" to discover jobs that match your skills and experience.</p>
        </div>
      ) : (
        <div className="matches-list">
          {getFilteredMatches().map(match => (
            <div key={match.id} className="match-card">
              <div className="match-header">
                <h3>{match.jobTitle}</h3>
                <div className={`match-score ${
                  match.matchScore >= 80 ? 'high' : 
                  match.matchScore >= 60 ? 'medium' : 'low'
                }`}>
                  {match.matchScore}% Match
                </div>
              </div>
              
              <div className="company-info">
                <div className="company-name">{match.company}</div>
                <div className="location-info">
                  {match.isRemote ? 'Remote' : match.location || 'Location not specified'}
                </div>
              </div>
              
              <div className="job-details">
                {match.jobType && (
                  <div className="job-type">{match.jobType}</div>
                )}
                
                {match.salary && (
                  <div className="salary-range">{match.salary}</div>
                )}
                
                {match.deadline && (
                  <div className="deadline">Deadline: {new Date(match.deadline).toLocaleDateString()}</div>
                )}
                
                <div className="posted-info">Posted: {match.createdAt}</div>
              </div>
              
              {match.scoreDetails && (
                <div className="match-breakdown">
                  <h4>Why You Match</h4>
                  <div className="breakdown-bars">
                    {Object.entries(match.scoreDetails.skills).map(([type, data]) => (
                      <div key={type} className="breakdown-item">
                        <div className="breakdown-label">{type} Skills</div>
                        <div className="progress-bar">
                          <div 
                            className="progress" 
                            style={{ width: `${data.score}%` }}
                          ></div>
                        </div>
                        <div className="breakdown-value">{data.score}%</div>
                      </div>
                    ))}
                    <div className="breakdown-item">
                      <div className="breakdown-label">Experience</div>
                      <div className="progress-bar">
                        <div 
                          className="progress" 
                          style={{ width: `${match.scoreDetails.experience.score}%` }}
                        ></div>
                      </div>
                      <div className="breakdown-value">{match.scoreDetails.experience.score}%</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="match-actions">
                <button 
                  className="view-job-btn"
                  onClick={() => navigate(`/jobs/${match.jobId}`)}
                >
                  View Details
                </button>
                
                {match.status === 'applied' ? (
                  <button className="applied-btn" disabled>
                    Applied
                  </button>
                ) : (
                  <button 
                    className="apply-btn"
                    onClick={() => applyForJob(match.jobId)}
                  >
                    Apply Now
                  </button>
                )}
                
                <button 
                  className="contact-btn"
                  onClick={() => window.location.href = `mailto:${match.employerEmail}`}
                  disabled={!match.employerEmail}
                >
                  Contact Employer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CandidateMatches;