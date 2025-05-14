// src/components/AdminPanel.js - Fixed version with correct skills access
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import MatchingService from '../services/matchingService';
import Reports from './Reports';
import './AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    highMatches: 0,
    mediumMatches: 0,
    lowMatches: 0
  });
  
  // Filters and UI states
  const [filters, setFilters] = useState({
    jobId: '',
    matchScore: '',
    status: '',
    department: '',
    jobType: ''
  });
  const [selectedJob, setSelectedJob] = useState('');
  const [matchingMethod, setMatchingMethod] = useState('rule-based');
  const [processingMatches, setProcessingMatches] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      console.log('Fetching admin data...');
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated. Please log in to access this page.');
      }
      
      // Check if user is an employer
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      if (profile.role !== 'employer') {
        throw new Error('You must be an employer to access the admin panel.');
      }
      
      // Fetch all employer's jobs
      const { data: jobData, error: jobError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('posted_by', user.id)
        .order('created_at', { ascending: false });
      
      if (jobError) throw jobError;
      setJobs(jobData || []);
      
      // Fetch rankings/matches for all jobs
      const jobIds = jobData.map(job => job.id);
      
      if (jobIds.length > 0) {
        // Fetch rankings first
        const { data: rankingData, error: rankingError } = await supabase
          .from('rankings')
          .select('*')
          .in('job_id', jobIds)
          .order('score', { ascending: false });
        
        if (rankingError) throw rankingError;
        
        // Prepare enriched rankings array
        const enrichedRankings = [];
        
        for (const ranking of rankingData) {
          // Get profile for this ranking
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, phone')
            .eq('id', ranking.user_id)
            .single();
          
          if (!profileErr && profileData) {
            // Get resume for this user
            const { data: resumeData, error: resumeErr } = await supabase
              .from('resumes')
              .select('id, skills, experience, education, yearsOfExperience')
              .eq('user_id', ranking.user_id)
              .single();
            
            // Get job data for this ranking
            const { data: jobData, error: jobErr } = await supabase
              .from('job_posts')
              .select('id, title, company')
              .eq('id', ranking.job_id)
              .single();
            
            // Combine all data
            enrichedRankings.push({
              ...ranking,
              profiles: profileData,
              resumes: !resumeErr && resumeData ? resumeData : null,
              job_posts: !jobErr && jobData ? jobData : null
            });
          }
        }
        
        setRankings(enrichedRankings);
        
        // Calculate statistics
        const totalMatches = enrichedRankings.length;
        const highCount = enrichedRankings.filter(r => r.score >= 80).length;
        const mediumCount = enrichedRankings.filter(r => r.score >= 60 && r.score < 80).length;
        const lowCount = enrichedRankings.filter(r => r.score < 60).length;
        
        setStats({
          totalApplications: totalMatches,
          highMatches: highCount,
          mediumMatches: mediumCount,
          lowMatches: lowCount
        });
      }
      
      // Fetch job seekers for manual matching with resumes
      const { data: candidateData, error: candidateError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('role', 'job_seeker');
      
      if (candidateError) throw candidateError;
      
      // Get resume data for each candidate
      const candidatesWithResumes = [];
      for (const candidate of candidateData || []) {
        const { data: resumeData, error: resumeErr } = await supabase
          .from('resumes')
          .select('yearsOfExperience')
          .eq('user_id', candidate.id)
          .single();
        
        candidatesWithResumes.push({
          ...candidate,
          yearsOfExperience: !resumeErr && resumeData ? resumeData.yearsOfExperience : 'N/A'
        });
      }
      
      setCandidates(candidatesWithResumes);
      
    } catch (error) {
      console.error('Error fetching admin data:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const processJobMatches = async (jobId) => {
    if (!jobId) return;
    
    try {
      setProcessingMatches(true);
      console.log(`Processing matches for job ${jobId} using ${matchingMethod} method`);
      
      // Call the matching service
      await MatchingService.processJobMatches(jobId);
      
      // Reload rankings
      await fetchAdminData();
      
      alert('Matches have been processed successfully!');
    } catch (error) {
      console.error('Error processing matches:', error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessingMatches(false);
    }
  };

  const processCandidateMatches = async (candidateId) => {
    try {
      setProcessingMatches(true);
      console.log(`Processing matches for candidate ${candidateId} using ${matchingMethod} method`);
      
      // Call the matching service
      await MatchingService.processCandidateMatches(candidateId);
      
      // Reload rankings
      await fetchAdminData();
      
      alert('Matches have been processed successfully!');
    } catch (error) {
      console.error('Error processing matches:', error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessingMatches(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getFilteredRankings = () => {
    let filtered = rankings;
    
    if (filters.jobId) {
      filtered = filtered.filter(r => r.job_id === filters.jobId);
    }
    
    if (filters.matchScore) {
      switch (filters.matchScore) {
        case 'high':
          filtered = filtered.filter(r => r.score >= 80);
          break;
        case 'medium':
          filtered = filtered.filter(r => r.score >= 60 && r.score < 80);
          break;
        case 'low':
          filtered = filtered.filter(r => r.score < 60);
          break;
        default:
          break;
      }
    }
    
    return filtered;
  };

  if (loading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <p>Please make sure you're logged in with an employer account.</p>
        <button 
          onClick={() => navigate('/login')} 
          className="btn btn-primary"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <h3>Employer Dashboard</h3>
        <p>Manage and review candidate applications</p>
      </div>

      {/* Dashboard Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalApplications}</div>
          <div className="stat-label">Total Matches</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.highMatches}</div>
          <div className="stat-label">High Matches</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.mediumMatches}</div>
          <div className="stat-label">Medium Matches</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.lowMatches}</div>
          <div className="stat-label">Low Matches</div>
        </div>
      </div>
      
      {/* Admin Tabs */}
      <div className="admin-tabs">
        <div 
          className={`admin-tab ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs
        </div>
        <div 
          className={`admin-tab ${activeTab === 'matching' ? 'active' : ''}`}
          onClick={() => setActiveTab('matching')}
        >
          Matching
        </div>
        <div 
          className={`admin-tab ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          Candidates
        </div>
        <div 
          className={`admin-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </div>
      </div>
      
      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="admin-card">
          <div className="admin-header">
            <div className="admin-title">My Job Listings</div>
            <div className="admin-controls">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/post-job')}
              >
                <i className="fas fa-plus"></i> Post New Job
              </button>
            </div>
          </div>
          
          <table className="job-list-table">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Posted Date</th>
                <th>Matches</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No jobs posted yet</td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const jobMatches = rankings.filter(r => r.job_id === job.id).length;
                  return (
                    <tr key={job.id}>
                      <td>{job.title}</td>
                      <td>{job.company}</td>
                      <td>{job.location || 'Remote'}</td>
                      <td>{new Date(job.created_at).toLocaleDateString()}</td>
                      <td>{jobMatches}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-button" 
                            title="View"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button 
                            className="action-button" 
                            title="Edit"
                            onClick={() => navigate(`/edit-job/${job.id}`)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="action-button" 
                            title="Process Matches"
                            onClick={() => processJobMatches(job.id)}
                            disabled={processingMatches}
                          >
                            <i className="fas fa-cogs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Matching Tab */}
      {activeTab === 'matching' && (
        <div className="admin-card">
          <div className="admin-header">
            <div className="admin-title">Candidate Matching</div>
          </div>
          
          {/* Matching Controls */}
          <div className="matching-controls">
            <div className="form-group">
              <label>Matching Method</label>
              <select 
                value={matchingMethod} 
                onChange={(e) => setMatchingMethod(e.target.value)}
                className="form-control"
              >
                <option value="rule-based">Rule-Based Matching</option>
                <option value="sbert">SBERT + Cosine Similarity</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Select Job for Matching</label>
              <select 
                value={selectedJob} 
                onChange={(e) => setSelectedJob(e.target.value)}
                className="form-control"
              >
                <option value="">Select a job</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={() => processJobMatches(selectedJob)}
              disabled={!selectedJob || processingMatches}
            >
              {processingMatches ? 'Processing...' : 'Run Matching Process'}
            </button>
          </div>
          
          {/* Filters */}
          <div className="filters">
            <div className="filter-group">
              <label htmlFor="jobFilter">Job Position</label>
              <select 
                id="jobFilter" 
                name="jobId"
                className="form-control"
                value={filters.jobId}
                onChange={handleFilterChange}
              >
                <option value="">All Jobs</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="matchFilter">Match Score</label>
              <select 
                id="matchFilter" 
                name="matchScore"
                className="form-control"
                value={filters.matchScore}
                onChange={handleFilterChange}
              >
                <option value="">All Scores</option>
                <option value="high">High Match (80%+)</option>
                <option value="medium">Medium Match (60-79%)</option>
                <option value="low">Low Match (&lt;60%)</option>
              </select>
            </div>
          </div>
          
          {/* Results Table */}
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job</th>
                <th>Match Score</th>
                <th>Matching Method</th>
                <th>Matched On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredRankings().map(ranking => {
                const candidateName = `${ranking.profiles?.first_name || ''} ${ranking.profiles?.last_name || ''}`.trim();
                const jobTitle = ranking.job_posts?.title || '';
                const method = ranking.details ? 
                  (typeof ranking.details === 'string' ? 
                    JSON.parse(ranking.details).method : 
                    ranking.details.method) : 'rule-based';
                
                return (
                  <tr key={ranking.id}>
                    <td>{candidateName}</td>
                    <td>{jobTitle}</td>
                    <td>
                      <span className={`match-score ${
                        ranking.score >= 80 ? 'high' : 
                        ranking.score >= 60 ? 'medium' : 'low'
                      }`}>
                        {ranking.score}%
                      </span>
                    </td>
                    <td>{method.toUpperCase()}</td>
                    <td>{new Date(ranking.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-button" 
                          title="View Details"
                          onClick={() => navigate(`/candidate/${ranking.user_id}`)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="action-button" 
                          title="View Resume"
                        >
                          <i className="fas fa-file-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="admin-card">
          <div className="admin-header">
            <div className="admin-title">All Candidates</div>
          </div>
          
          <table className="candidate-list">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Experience</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => (
                <tr key={candidate.id}>
                  <td>{`${candidate.first_name || ''} ${candidate.last_name || ''}`}</td>
                  <td>{candidate.email || ''}</td>
                  <td>{candidate.phone || 'N/A'}</td>
                  <td>{candidate.yearsOfExperience || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-button" 
                        title="View Profile"
                      >
                        <i className="fas fa-user"></i>
                      </button>
                      <button 
                        className="action-button" 
                        title="Process Matches"
                        onClick={() => processCandidateMatches(candidate.id)}
                        disabled={processingMatches}
                      >
                        <i className="fas fa-cogs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <Reports />
      )}
    </div>
  );
};

export default AdminPanel;