// src/components/CandidateList.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Link } from 'react-router-dom';
import { analyzeCandidate } from '../services/openAIService';
import './CandidateList.css';

const CandidateList = ({ jobPostingId }) => {
  const [candidates, setCandidates] = useState([]);
  const [jobPosting, setJobPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('applicationDate');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Fetch job posting and candidates data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch job posting
        if (jobPostingId) {
          const { data: jobData, error: jobError } = await supabase
            .from('job_postings')
            .select('*')
            .eq('id', jobPostingId)
            .single();
            
          if (jobError) throw jobError;
          setJobPosting(jobData);
          
          // Fetch applications for this job
          const { data: applicationsData, error: applicationsError } = await supabase
            .from('applications')
            .select(`
              *,
              profile:user_id (id, first_name, last_name, email, phone),
              resume:resume_id (*)
            `)
            .eq('job_posting_id', jobPostingId);
            
          if (applicationsError) throw applicationsError;
          
          // Format candidates data
          const formattedCandidates = applicationsData.map(application => ({
            applicationId: application.id,
            applicationDate: application.created_at,
            status: application.status,
            aiMatchScore: application.ai_match_score || null,
            userId: application.user_id,
            resumeId: application.resume_id,
            name: `${application.profile.first_name} ${application.profile.last_name}`,
            email: application.profile.email,
            phone: application.profile.phone,
            resume: application.resume,
            coverLetter: application.cover_letter
          }));
          
          setCandidates(formattedCandidates);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load candidates');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [jobPostingId]);
  
  // Analyze all candidates who don't have a match score
  const analyzeAllCandidates = async () => {
    try {
      setAnalyzing(true);
      
      const candidatesToAnalyze = candidates.filter(candidate => 
        candidate.aiMatchScore === null && candidate.resume
      );
      
      if (candidatesToAnalyze.length === 0) {
        alert('All candidates already have AI match scores.');
        setAnalyzing(false);
        return;
      }
      
      // Process candidates in batches to avoid overloading
      const batchSize = 3;
      const batches = Math.ceil(candidatesToAnalyze.length / batchSize);
      
      const updatedCandidates = [...candidates];
      
      for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, candidatesToAnalyze.length);
        const batch = candidatesToAnalyze.slice(batchStart, batchEnd);
        
        // Process batch in parallel
        await Promise.all(batch.map(async (candidate) => {
          try {
            // Prepare data for analysis
            const analysisData = {
              resume: {
                skills: candidate.resume.skills ? JSON.parse(candidate.resume.skills) : {},
                experience: candidate.resume.experience ? JSON.parse(candidate.resume.experience) : [],
                education: candidate.resume.education ? JSON.parse(candidate.resume.education) : [],
                professional_summary: candidate.resume.professional_summary || ''
              },
              job: {
                title: jobPosting.title,
                description: jobPosting.description,
                requirements: jobPosting.requirements,
                responsibilities: jobPosting.responsibilities,
                required_skills: jobPosting.required_skills,
                preferred_skills: jobPosting.preferred_skills
              }
            };
            
            // Call OpenAI to analyze
            const analysis = await analyzeCandidate(analysisData);
            
            // Update match score in database
            const { error: updateError } = await supabase
              .from('applications')
              .update({ 
                ai_match_score: analysis.matchPercentage,
                ai_analysis: JSON.stringify(analysis)
              })
              .eq('id', candidate.applicationId);
              
            if (updateError) throw updateError;
            
            // Update local state
            const candidateIndex = updatedCandidates.findIndex(c => c.applicationId === candidate.applicationId);
            if (candidateIndex >= 0) {
              updatedCandidates[candidateIndex] = {
                ...updatedCandidates[candidateIndex],
                aiMatchScore: analysis.matchPercentage
              };
            }
          } catch (error) {
            console.error(`Error analyzing candidate ${candidate.name}:`, error);
          }
        }));
        
        // Update state after each batch
        setCandidates(updatedCandidates);
      }
    } catch (error) {
      console.error('Error analyzing candidates:', error);
      setError('Failed to analyze candidates');
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Sort candidates
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (sortBy === 'applicationDate') {
      return sortDirection === 'asc' 
        ? new Date(a.applicationDate) - new Date(b.applicationDate)
        : new Date(b.applicationDate) - new Date(a.applicationDate);
    } else if (sortBy === 'name') {
      return sortDirection === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortBy === 'matchScore') {
      // Put candidates without scores at the bottom
      if (a.aiMatchScore === null && b.aiMatchScore === null) return 0;
      if (a.aiMatchScore === null) return 1;
      if (b.aiMatchScore === null) return -1;
      
      return sortDirection === 'asc'
        ? a.aiMatchScore - b.aiMatchScore
        : b.aiMatchScore - a.aiMatchScore;
    }
    return 0;
  });
  
  // Handle sort change
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortBy(field);
      setSortDirection('desc');
    }
  };
  
  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortBy === field) {
      return sortDirection === 'asc' ? '↑' : '↓';
    }
    return '';
  };
  
  if (loading) {
    return <div className="loading-container">Loading candidates...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!jobPosting) {
    return <div className="not-found-message">Job posting not found</div>;
  }

  return (
    <div className="candidate-list-container">
      <div className="job-header">
        <h2>{jobPosting.title}</h2>
        <div className="analyze-all-container">
          <button 
            className="analyze-all-button"
            onClick={analyzeAllCandidates}
            disabled={analyzing}
          >
            {analyzing ? 'Analyzing...' : 'Analyze All Candidates with AI'}
          </button>
          <span className="candidates-count">{candidates.length} candidates</span>
        </div>
      </div>
      
      {candidates.length === 0 ? (
        <div className="no-candidates-message">No applications received yet.</div>
      ) : (
        <div className="candidates-table-container">
          <table className="candidates-table">
            <thead>
              <tr>
                <th 
                  className={sortBy === 'name' ? 'active-sort' : ''}
                  onClick={() => handleSort('name')}
                >
                  Candidate {getSortIndicator('name')}
                </th>
                <th>Contact</th>
                <th 
                  className={sortBy === 'applicationDate' ? 'active-sort' : ''}
                  onClick={() => handleSort('applicationDate')}
                >
                  Applied {getSortIndicator('applicationDate')}
                </th>
                <th 
                  className={`match-score-column ${sortBy === 'matchScore' ? 'active-sort' : ''}`}
                  onClick={() => handleSort('matchScore')}
                >
                  AI Match {getSortIndicator('matchScore')}
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCandidates.map(candidate => (
                <tr key={candidate.applicationId}>
                  <td className="candidate-name-cell">
                    <div className="candidate-name">{candidate.name}</div>
                  </td>
                  <td className="contact-cell">
                    <div className="contact-info">
                      <div className="email">{candidate.email}</div>
                      {candidate.phone && <div className="phone">{candidate.phone}</div>}
                    </div>
                  </td>
                  <td className="date-cell">
                    {new Date(candidate.applicationDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="match-score-cell">
                    {candidate.aiMatchScore !== null ? (
                      <div className="match-score">
                        <div 
                          className="match-indicator" 
                          style={{ 
                            backgroundColor: candidate.aiMatchScore > 80 ? '#4CAF50' : 
                                           candidate.aiMatchScore > 60 ? '#FFC107' : '#F44336'
                          }}
                        ></div>
                        <span>{candidate.aiMatchScore}%</span>
                      </div>
                    ) : (
                      <span className="no-score">Not analyzed</span>
                    )}
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge status-${candidate.status.toLowerCase()}`}>
                      {candidate.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <Link 
                      to={`/candidates/${candidate.userId}?job=${jobPostingId}`}
                      className="view-button"
                    >
                      View Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CandidateList;