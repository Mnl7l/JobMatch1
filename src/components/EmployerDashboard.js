// src/components/EmployerDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import MatchingService from '../services/matchingService';
import { analyzeCandidate } from '../utils/openAIService';
import './EmployerDashboard.css';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [processingMatches, setProcessingMatches] = useState(false);
  const [error, setError] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [filters, setFilters] = useState({
    matchScore: '',
    skills: '',
    education: '',
    experience: ''
  });

  // Fetch user and job data on component mount
  useEffect(() => {
    const fetchUserAndJobs = async () => {
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
        
        // Redirect if not an employer
        if (profile.role !== 'employer') {
          navigate('/');
          return;
        }
        
        // Fetch jobs posted by this employer
        const { data: jobsData, error: jobsError } = await supabase
          .from('job_posts')
          .select('*')
          .eq('posted_by', user.id)
          .order('created_at', { ascending: false });
        
        if (jobsError) throw jobsError;
        
        setJobs(jobsData || []);
        
        // Select the first job by default
        if (jobsData && jobsData.length > 0) {
          setSelectedJob(jobsData[0]);
          // Load candidates for the first job
          loadCandidatesForJob(jobsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching user and jobs:', error.message);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndJobs();
  }, [navigate]);

  // Load candidates with match scores for a selected job
  const loadCandidatesForJob = async (jobId) => {
    try {
      setLoading(true);
      setCandidates([]);
      
      // Get applications and rankings for this job
      const { data: applications, error: applicationsError } = await supabase
        .from('applications')
        .select(`
          *,
          profile:user_id (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          resume:resume_id (
            id,
            skills,
            education,
            experience,
            professional_summary,
            yearsOfExperience,
            file_url
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      
      if (applicationsError) throw applicationsError;
      
      // Get rankings for candidates who haven't applied yet
      const { data: rankings, error: rankingsError } = await supabase
        .from('rankings')
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
            skills,
            education,
            experience,
            professional_summary,
            yearsOfExperience,
            file_url
          )
        `)
        .eq('job_id', jobId)
        .eq('status', 'pending') // Only get rankings for candidates who haven't applied
        .order('score', { ascending: false });
      
      if (rankingsError) throw rankingsError;
      
      // Process application data
      const processedApplications = applications.map(app => {
        // Parse resume skills if stored as string
        let skills = [];
        if (app.resume?.skills) {
          const skillsData = typeof app.resume.skills === 'string' 
            ? JSON.parse(app.resume.skills) 
            : app.resume.skills;
            
          // Combine all skill types
          skills = [
            ...(skillsData.technical || []),
            ...(skillsData.languages || []),
            ...(skillsData.soft || [])
          ];
        }
        
        return {
          id: app.id,
          type: 'application', // Mark as an application
          userId: app.user_id,
          name: `${app.profile?.first_name || ''} ${app.profile?.last_name || ''}`.trim(),
          email: app.profile?.email || '',
          phone: app.profile?.phone || '',
          matchScore: app.ai_match_score, // Use AI match score if available
          aiAnalysis: app.ai_analysis ? 
            (typeof app.ai_analysis === 'string' ? JSON.parse(app.ai_analysis) : app.ai_analysis) 
            : null,
          skills: skills,
          yearsOfExperience: app.resume?.yearsOfExperience || '',
          resumeId: app.resume?.id || null,
          resumeUrl: app.resume?.file_url || null,
          status: app.status || 'pending',
          appliedAt: app.created_at
        };
      });
      
      // Process ranking data for candidates who haven't applied
      const processedRankings = rankings.map(ranking => {
        // Parse resume skills if stored as string
        let skills = [];
        if (ranking.resumes?.skills) {
          const skillsData = typeof ranking.resumes.skills === 'string' 
            ? JSON.parse(ranking.resumes.skills) 
            : ranking.resumes.skills;
            
          // Combine all skill types
          skills = [
            ...(skillsData.technical || []),
            ...(skillsData.languages || []),
            ...(skillsData.soft || [])
          ];
        }
        
        // Parse score details if stored as string
        const scoreDetails = ranking.details 
          ? (typeof ranking.details === 'string' ? JSON.parse(ranking.details) : ranking.details) 
          : null;
        
        return {
          id: ranking.id,
          type: 'ranking', // Mark as a ranking
          userId: ranking.user_id,
          name: `${ranking.profiles?.first_name || ''} ${ranking.profiles?.last_name || ''}`.trim(),
          email: ranking.profiles?.email || '',
          phone: ranking.profiles?.phone || '',
          matchScore: ranking.score,
          scoreDetails: scoreDetails,
          skills: skills,
          yearsOfExperience: ranking.resumes?.yearsOfExperience || '',
          resumeId: ranking.resumes?.id || null,
          resumeUrl: ranking.resumes?.file_url || null,
          status: ranking.status || 'pending'
        };
      });
      
      // Combine and set all candidates
      setCandidates([...processedApplications, ...processedRankings]);
    } catch (error) {
      console.error('Error loading candidates:', error.message);
      setError('Failed to load candidate data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle job selection
  const handleJobSelect = (job) => {
    setSelectedJob(job);
    loadCandidatesForJob(job.id);
  };

  // Process matches for the selected job
  const processMatches = async () => {
    if (!selectedJob) return;
    
    try {
      setProcessingMatches(true);
      
      // Use the matching service to process all candidates
      await MatchingService.processJobMatches(selectedJob.id);
      
      // Reload candidates with updated scores
      loadCandidatesForJob(selectedJob.id);
    } catch (error) {
      console.error('Error processing matches:', error.message);
      setError('Failed to process matches. Please try again.');
    } finally {
      setProcessingMatches(false);
    }
  };

  // Run AI analysis for a single candidate
  const runAiAnalysisForCandidate = async (candidate) => {
    if (!selectedJob || !candidate.resumeId) return;
    
    try {
      // Get complete resume data
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', candidate.resumeId)
        .single();
      
      if (resumeError) throw resumeError;
      
      // Get complete job data
      const { data: jobData, error: jobError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', selectedJob.id)
        .single();
      
      if (jobError) throw jobError;
      
      // Prepare data for analysis
      const analysisData = {
        resume: {
          skills: resumeData.skills ? JSON.parse(resumeData.skills) : {},
          experience: resumeData.experience ? JSON.parse(resumeData.experience) : [],
          education: resumeData.education ? JSON.parse(resumeData.education) : [],
          professional_summary: resumeData.professional_summary || ''
        },
        job: {
          title: jobData.title,
          description: jobData.description,
          requirements: jobData.requirements,
          responsibilities: jobData.responsibilities,
          required_skills: jobData.required_skills || [],
          preferred_skills: jobData.preferred_skills || []
        }
      };
      
      // Call OpenAI to analyze
      const analysis = await analyzeCandidate(analysisData);
      
      // For applications, update the AI score and analysis
      if (candidate.type === 'application') {
        const { error: updateError } = await supabase
          .from('applications')
          .update({ 
            ai_match_score: analysis.matchPercentage,
            ai_analysis: JSON.stringify(analysis)
          })
          .eq('id', candidate.id);
          
        if (updateError) throw updateError;
      }
      
      // Update local state
      setCandidates(prev => prev.map(c => {
        if (c.id === candidate.id) {
          return {
            ...c,
            matchScore: analysis.matchPercentage,
            aiAnalysis: analysis
          };
        }
        return c;
      }));
      
      return analysis;
    } catch (error) {
      console.error('Error running AI analysis:', error);
      setError('Failed to analyze candidate. Please try again.');
      return null;
    }
  };

  // Run AI analysis for all candidates (in batches)
  const runAiAnalysisForAll = async () => {
    if (!selectedJob) return;
    
    try {
      setAiAnalyzing(true);
      
      // Only analyze applications that don't have an AI score yet
      const candidatesToAnalyze = candidates.filter(candidate => 
        candidate.type === 'application' && !candidate.aiAnalysis
      );
      
      if (candidatesToAnalyze.length === 0) {
        alert('All candidates have already been analyzed with AI.');
        setAiAnalyzing(false);
        return;
      }
      
      // Process candidates in batches to avoid overloading
      const batchSize = 3;
      const batches = Math.ceil(candidatesToAnalyze.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, candidatesToAnalyze.length);
        const batch = candidatesToAnalyze.slice(batchStart, batchEnd);
        
        // Process batch in parallel
        await Promise.all(batch.map(candidate => runAiAnalysisForCandidate(candidate)));
      }
      
      alert(`Successfully analyzed ${candidatesToAnalyze.length} candidates with AI.`);
    } catch (error) {
      console.error('Error analyzing candidates:', error);
      setError('Failed to analyze candidates with AI. Please try again.');
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Update candidate status
  const updateCandidateStatus = async (id, type, status) => {
    try {
      if (type === 'application') {
        const { error } = await supabase
          .from('applications')
          .update({ status })
          .eq('id', id);
        
        if (error) throw error;
      } else if (type === 'ranking') {
        const { error } = await supabase
          .from('rankings')
          .update({ status })
          .eq('id', id);
        
        if (error) throw error;
      }
      
      // Update local state
      setCandidates(prev => 
        prev.map(candidate => 
          candidate.id === id && candidate.type === type ? { ...candidate, status } : candidate
        )
      );
    } catch (error) {
      console.error('Error updating status:', error.message);
      setError('Failed to update candidate status. Please try again.');
    }
  };

  // Filter candidates based on selected filters
  const getFilteredCandidates = () => {
    return candidates.filter(candidate => {
      // Match score filter
      if (filters.matchScore && candidate.matchScore !== null) {
        const score = Number(candidate.matchScore);
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
      
      // Skills filter
      if (filters.skills && candidate.skills) {
        const hasSkill = candidate.skills.some(skill => 
          skill.toLowerCase().includes(filters.skills.toLowerCase())
        );
        if (!hasSkill) return false;
      }
      
      // Experience filter
      if (filters.experience && candidate.yearsOfExperience) {
        // Simple filtering by experience level
        if (filters.experience === 'entry' && candidate.yearsOfExperience !== '0-1') {
          return false;
        } else if (filters.experience === 'mid' && 
          (candidate.yearsOfExperience !== '1-3' && candidate.yearsOfExperience !== '3-5')) {
          return false;
        } else if (filters.experience === 'senior' && 
          (candidate.yearsOfExperience !== '5-10' && candidate.yearsOfExperience !== '10+')) {
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
      skills: '',
      education: '',
      experience: ''
    });
  };

  // Download candidate resume
  const downloadResume = async (candidateId) => {
    try {
      // Get resume record
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select('file_url')
        .eq('user_id', candidateId)
        .single();
      
      if (resumeError) throw resumeError;
      
      if (resumeData?.file_url) {
        // Open file URL in new tab
        window.open(resumeData.file_url, '_blank');
      } else {
        alert('No resume file available for this candidate.');
      }
    } catch (error) {
      console.error('Error downloading resume:', error.message);
      alert('Failed to download resume. Please try again.');
    }
  };

  // Export matches to CSV
  const exportToCSV = () => {
    if (!candidates.length) return;
    
    // Create CSV content
    const csvHeader = ['Name', 'Email', 'Phone', 'Match Score', 'Status'];
    const csvRows = candidates.map(candidate => [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.matchScore,
      candidate.status
    ]);
    
    const csvContent = [
      csvHeader.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `matches_${selectedJob?.title.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !candidates.length) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="employer-dashboard">
      <h2>Employer Dashboard</h2>
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <div className="dashboard-content">
        {/* Sidebar with posted jobs */}
        <div className="jobs-sidebar">
          <h3>Your Job Posts</h3>
          
          {jobs.length === 0 ? (
            <div className="no-jobs">
              <p>You haven't posted any jobs yet.</p>
              <button 
                className="create-job-btn"
                onClick={() => navigate('/post-job')}
              >
                Create a Job Post
              </button>
            </div>
          ) : (
            <>
              <ul className="job-list">
                {jobs.map(job => (
                  <li 
                    key={job.id} 
                    className={selectedJob?.id === job.id ? 'active' : ''}
                    onClick={() => handleJobSelect(job)}
                  >
                    <div className="job-list-item">
                      <h4>{job.title}</h4>
                      <p>{job.company}</p>
                      <span className="job-date">
                        Posted: {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              
              <button 
                className="create-job-btn"
                onClick={() => navigate('/post-job')}
              >
                Post Another Job
              </button>
            </>
          )}
        </div>
        
        {/* Main content showing candidates */}
        <div className="candidates-section">
          {selectedJob ? (
            <>
              <div className="candidates-header">
                <div>
                  <h3>Candidates for: {selectedJob.title}</h3>
                  <p>{candidates.length} candidates found</p>
                </div>
                
                <div className="actions">
                  <button 
                    className="refresh-btn"
                    onClick={processMatches}
                    disabled={processingMatches}
                  >
                    {processingMatches ? 'Processing...' : 'Update Matches'}
                  </button>
                  
                  {/* New AI Analysis Button */}
                  <button 
                    className="ai-analyze-btn"
                    onClick={runAiAnalysisForAll}
                    disabled={aiAnalyzing || !candidates.some(c => c.type === 'application')}
                  >
                    {aiAnalyzing ? 'AI Analyzing...' : 'Analyze All with AI'}
                  </button>
                  
                  {/* View All Candidates Button */}
                  <Link 
                    to={`/jobs/${selectedJob.id}/candidates`} 
                    className="view-candidates-button"
                  >
                    Advanced Candidate View
                  </Link>
                  
                  <button 
                    className="export-btn"
                    onClick={exportToCSV}
                    disabled={!candidates.length}
                  >
                    Export to CSV
                  </button>
                </div>
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
                  <label>Skills</label>
                  <input 
                    type="text" 
                    name="skills"
                    value={filters.skills}
                    onChange={handleFilterChange}
                    placeholder="Filter by skill"
                  />
                </div>
                
                <div className="filter-group">
                  <label>Experience</label>
                  <select 
                    name="experience" 
                    value={filters.experience}
                    onChange={handleFilterChange}
                  >
                    <option value="">All Experience</option>
                    <option value="entry">Entry Level (0-1 years)</option>
                    <option value="mid">Mid Level (1-5 years)</option>
                    <option value="senior">Senior Level (5+ years)</option>
                  </select>
                </div>
                
                <button 
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
              
              {/* Candidates list */}
              {candidates.length === 0 ? (
                <div className="no-candidates">
                  <p>No candidates found for this job.</p>
                  <p>Update matches to assess candidate-job compatibility.</p>
                </div>
              ) : (
                <div className="candidates-list">
                  {getFilteredCandidates().map(candidate => (
                    <div key={`${candidate.type}-${candidate.id}`} className="candidate-card">
                      <div className="candidate-header">
                        <h4>{candidate.name}</h4>
                        <div className={`match-score ${
                          candidate.matchScore >= 80 ? 'high' : 
                          candidate.matchScore >= 60 ? 'medium' : 
                          candidate.matchScore > 0 ? 'low' : 'none'
                        }`}>
                          {candidate.matchScore !== null ? `${candidate.matchScore}%` : 'No Score'}
                        </div>
                      </div>
                      
                      {/* Application badge */}
                      {candidate.type === 'application' && (
                        <div className="application-badge">
                          Applied {new Date(candidate.appliedAt).toLocaleDateString()}
                        </div>
                      )}
                      
                      <div className="candidate-details">
                        <div className="detail-group">
                          <span className="detail-label">Contact:</span>
                          <span className="detail-value">{candidate.email}</span>
                        </div>
                        
                        {candidate.phone && (
                          <div className="detail-group">
                            <span className="detail-label">Phone:</span>
                            <span className="detail-value">{candidate.phone}</span>
                          </div>
                        )}
                        
                        <div className="detail-group">
                          <span className="detail-label">Experience:</span>
                          <span className="detail-value">
                            {candidate.yearsOfExperience ? 
                              (() => {
                                switch(candidate.yearsOfExperience) {
                                  case '0-1': return 'Entry Level (0-1 years)';
                                  case '1-3': return 'Junior (1-3 years)';
                                  case '3-5': return 'Mid-Level (3-5 years)';
                                  case '5-10': return 'Senior (5-10 years)';
                                  case '10+': return 'Expert (10+ years)';
                                  default: return candidate.yearsOfExperience;
                                }
                              })() : 'Not specified'
                            }
                          </span>
                        </div>
                      </div>
                      
                      {candidate.skills.length > 0 && (
                        <div className="candidate-skills">
                          <h5>Skills</h5>
                          <div className="skills-tags">
                            {candidate.skills.slice(0, 5).map((skill, index) => (
                              <span key={index} className="skill-tag">{skill}</span>
                            ))}
                            {candidate.skills.length > 5 && (
                              <span className="more-skills">+{candidate.skills.length - 5} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Show either AI analysis or score details */}
                      {candidate.aiAnalysis ? (
                        <div className="ai-analysis-preview">
                          <h5>AI Analysis</h5>
                          <div className="analysis-summary">
                            {candidate.aiAnalysis.summary}
                          </div>
                          
                          <div className="skill-match-breakdown">
                            <div className="breakdown-item">
                              <div className="breakdown-label">Required Skills</div>
                              <div className="progress-bar">
                                <div 
                                  className="progress" 
                                  style={{ 
                                    width: `${candidate.aiAnalysis.requiredSkillsMatch}%`,
                                    backgroundColor: candidate.aiAnalysis.requiredSkillsMatch > 80 ? '#4CAF50' : 
                                                     candidate.aiAnalysis.requiredSkillsMatch > 60 ? '#FFC107' : '#F44336'
                                  }}
                                ></div>
                              </div>
                              <div className="breakdown-value">{candidate.aiAnalysis.requiredSkillsMatch}%</div>
                            </div>
                          </div>
                        </div>
                      ) : candidate.scoreDetails ? (
                        <div className="match-breakdown">
                          <h5>Match Breakdown</h5>
                          <div className="breakdown-bars">
                            {Object.entries(candidate.scoreDetails.skills).map(([type, data]) => (
                              <div key={type} className="breakdown-item">
                                <div className="breakdown-label">{type}</div>
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
                                  style={{ width: `${candidate.scoreDetails.experience.score}%` }}
                                ></div>
                              </div>
                              <div className="breakdown-value">{candidate.scoreDetails.experience.score}%</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="no-analysis">
                          <p>No detailed analysis available.</p>
                          {candidate.type === 'application' && (
                            <button 
                              className="analyze-candidate-btn"
                              onClick={() => runAiAnalysisForCandidate(candidate)}
                              disabled={aiAnalyzing}
                            >
                              Analyze with AI
                            </button>
                          )}
                        </div>
                      )}
                      
                      <div className="candidate-actions">
                        <div className="status-selector">
                          <label>Status:</label>
                          <select 
                            value={candidate.status}
                            onChange={(e) => updateCandidateStatus(candidate.id, candidate.type, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="interview">Interview</option>
                            <option value="hired">Hired</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        
                        <div className="action-buttons">
                          {/* Link to the new detailed candidate evaluation view */}
                          <Link 
                            to={`/candidates/${candidate.userId}?job=${selectedJob.id}`}
                            className="action-btn view-btn"
                          >
                            Detailed Evaluation
                          </Link>
                          
                          {candidate.resumeId && (
                            <button 
                              className="action-btn download-btn"
                              onClick={() => downloadResume(candidate.userId)}
                            >
                              Download CV
                            </button>
                          )}
                          
                          <button 
                            className="action-btn contact-btn"
                            onClick={() => window.location.href = `mailto:${candidate.email}`}
                          >
                            Contact
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-job-selected">
              <p>Select a job from the sidebar or create a new job post.</p>
              <button 
                className="create-job-btn"
                onClick={() => navigate('/post-job')}
              >
                Create a Job Post
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;