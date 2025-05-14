// src/components/MatchDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import './MatchDetails.css';

const MatchDetails = () => {
  const { jobId } = useParams();
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [job, setJob] = useState(null);
  // Removed unused resume state
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('You must be logged in to view match details');
          setLoading(false);
          return;
        }
        
        // First, try to get match from resume_job_matches (custom matches)
        const { data: customMatch, error: customMatchError } = await supabase
          .from('resume_job_matches')
          .select('*')
          .eq('user_id', user.id)
          .eq('job_id', jobId)
          .single();
        
        if (!customMatchError && customMatch) {
          // Get match details from custom match
          setMatchData({
            type: 'custom',
            score: customMatch.match_score,
            details: typeof customMatch.match_details === 'string' 
              ? JSON.parse(customMatch.match_details) 
              : customMatch.match_details,
            createdAt: customMatch.created_at
          });
        } else {
          // Try to get match from rankings table (auto-generated matches)
          const { data: ranking, error: rankingError } = await supabase
            .from('rankings')
            .select('*')
            .eq('user_id', user.id)
            .eq('job_id', jobId)
            .single();
          
          if (!rankingError && ranking) {
            // Get match details from ranking
            setMatchData({
              type: 'ranking',
              score: ranking.score,
              details: typeof ranking.details === 'string' 
                ? JSON.parse(ranking.details) 
                : ranking.details,
              createdAt: ranking.created_at
            });
          } else {
            setError('Match details not found');
            setLoading(false);
            return;
          }
        }
        
        // Get job details
        const { data: jobData, error: jobError } = await supabase
          .from('job_posts')
          .select('*')
          .eq('id', jobId)
          .single();
        
        if (jobError) throw jobError;
        setJob(jobData);
        
        // Removed unused resume fetching logic
        
      } catch (error) {
        console.error('Error fetching match details:', error);
        setError('Failed to load match details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchDetails();
  }, [jobId]);

  if (loading) {
    return (
      <div className="match-details-loading">
        <div className="spinner"></div>
        <p>Loading match details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-details-error">
        <h2>Error</h2>
        <p>{error}</p>
        <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
      </div>
    );
  }

  if (!matchData || !job) {
    return (
      <div className="match-details-error">
        <h2>Match Not Found</h2>
        <p>We couldn't find the match details you're looking for.</p>
        <Link to="/dashboard" className="back-link">Back to Dashboard</Link>
      </div>
    );
  }

  // Format required skills
  const requiredSkills = job.required_skills 
    ? (typeof job.required_skills === 'string' ? JSON.parse(job.required_skills) : job.required_skills) 
    : [];
    
  // Format preferred skills
  const preferredSkills = job.preferred_skills 
    ? (typeof job.preferred_skills === 'string' ? JSON.parse(job.preferred_skills) : job.preferred_skills) 
    : [];
  
  // Extract data from matchData.details
  const {
    matchPercentage = matchData.score,
    summary = "Match analysis based on your resume and job requirements.",
    requiredSkillsMatch = 0,
    preferredSkillsMatch = 0,
    matchingSkills = [],
    missingRequiredSkills = [],
    experienceRelevance = 0,
    experienceAnalysis = "Experience analysis not available.",
    strengths = [],
    weaknesses = [],
    suggestedInterviewQuestions = []
  } = matchData.details || {};

  return (
    <div className="match-details-container">
      <div className="match-details-header">
        <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
        <h1>Match Analysis</h1>
      </div>
      
      <div className="match-overview">
        <div className="job-info">
          <h2>{job.title}</h2>
          <div className="company-name">{job.company}</div>
          <div className="job-meta">
            {job.location && <span className="job-location">{job.location}</span>}
            {job.job_type && <span className="job-type">{job.job_type}</span>}
          </div>
          <Link to={`/jobs/${job.id}`} className="view-job-link">View Full Job Description</Link>
        </div>
        
        <div className="match-score-container">
          <div 
            className="match-score-circle"
            style={{
              backgroundColor: 
                matchPercentage >= 80 ? '#38a169' : 
                matchPercentage >= 60 ? '#dd6b20' : '#e53e3e'
            }}
          >
            {matchPercentage}%
          </div>
          <div className="match-score-label">Match Score</div>
        </div>
      </div>
      
      <div className="match-summary">
        <h3>Match Summary</h3>
        <p>{summary}</p>
      </div>
      
      <div className="match-details-grid">
        <div className="match-details-card skills-analysis">
          <h3>Skills Analysis</h3>
          
          <div className="skills-metrics">
            <div className="skills-metric">
              <div className="metric-label">Required Skills Match</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${requiredSkillsMatch}%`,
                    backgroundColor: 
                      requiredSkillsMatch >= 80 ? '#38a169' : 
                      requiredSkillsMatch >= 60 ? '#dd6b20' : '#e53e3e'
                  }}
                ></div>
              </div>
              <div className="metric-value">{requiredSkillsMatch}%</div>
            </div>
            
            <div className="skills-metric">
              <div className="metric-label">Preferred Skills Match</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${preferredSkillsMatch}%`,
                    backgroundColor: 
                      preferredSkillsMatch >= 80 ? '#38a169' : 
                      preferredSkillsMatch >= 60 ? '#dd6b20' : '#e53e3e'
                  }}
                ></div>
              </div>
              <div className="metric-value">{preferredSkillsMatch}%</div>
            </div>
          </div>
          
          <div className="skills-breakdown">
            <div className="matching-skills">
              <h4>Matching Skills</h4>
              <div className="skills-tags">
                {matchingSkills.map((skill, index) => (
                  <span key={index} className="skill-tag matching">{skill}</span>
                ))}
                {matchingSkills.length === 0 && (
                  <p className="no-skills-message">No matching skills identified.</p>
                )}
              </div>
            </div>
            
            <div className="missing-skills">
              <h4>Missing Skills</h4>
              <div className="skills-tags">
                {missingRequiredSkills.map((skill, index) => (
                  <span key={index} className="skill-tag missing">{skill}</span>
                ))}
                {missingRequiredSkills.length === 0 && (
                  <p className="no-skills-message">No missing required skills!</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="skills-recommendation">
            <h4>Skills Recommendation</h4>
            <p>
              {missingRequiredSkills.length > 0 
                ? `Consider acquiring or highlighting these skills to improve your match: ${missingRequiredSkills.join(', ')}` 
                : 'Your skills align well with this job! Continue developing your existing skillset to stay competitive.'}
            </p>
          </div>
        </div>
        
        <div className="match-details-card experience-analysis">
          <h3>Experience Analysis</h3>
          
          <div className="experience-metric">
            <div className="metric-label">Experience Relevance</div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${experienceRelevance}%`,
                  backgroundColor: 
                    experienceRelevance >= 80 ? '#38a169' : 
                    experienceRelevance >= 60 ? '#dd6b20' : '#e53e3e'
                }}
              ></div>
            </div>
            <div className="metric-value">{experienceRelevance}%</div>
          </div>
          
          <div className="experience-analysis-content">
            <p>{experienceAnalysis}</p>
          </div>
        </div>
        
        <div className="match-details-card strengths-weaknesses">
          <h3>Strengths & Areas for Improvement</h3>
          
          <div className="strengths-section">
            <h4>Your Strengths</h4>
            <ul className="strengths-list">
              {strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
              {strengths.length === 0 && (
                <li className="no-data-message">No specific strengths identified.</li>
              )}
            </ul>
          </div>
          
          <div className="weaknesses-section">
            <h4>Areas for Improvement</h4>
            <ul className="weaknesses-list">
              {weaknesses.map((weakness, index) => (
                <li key={index}>{weakness}</li>
              ))}
              {weaknesses.length === 0 && (
                <li className="no-data-message">No specific areas for improvement identified.</li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="match-details-card interview-prep">
          <h3>Interview Preparation</h3>
          
          <p className="interview-prep-intro">
            Based on this job's requirements and your background, prepare for these potential interview questions:
          </p>
          
          <ul className="interview-questions-list">
            {suggestedInterviewQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
            {suggestedInterviewQuestions.length === 0 && (
              <li className="no-data-message">No suggested interview questions available.</li>
            )}
          </ul>
        </div>
      </div>
      
      <div className="match-details-card job-requirements">
        <h3>Job Requirements</h3>
        
        <div className="requirements-grid">
          <div className="required-skills">
            <h4>Required Skills</h4>
            <div className="skills-tags">
              {requiredSkills.map((skill, index) => (
                <span 
                  key={index} 
                  className={`skill-tag ${matchingSkills.includes(skill) ? 'matching' : 'neutral'}`}
                >
                  {skill}
                </span>
              ))}
              {requiredSkills.length === 0 && (
                <p className="no-skills-message">No required skills specified.</p>
              )}
            </div>
          </div>
          
          <div className="preferred-skills">
            <h4>Preferred Skills</h4>
            <div className="skills-tags">
              {preferredSkills.map((skill, index) => (
                <span 
                  key={index} 
                  className={`skill-tag ${matchingSkills.includes(skill) ? 'matching' : 'neutral'}`}
                >
                  {skill}
                </span>
              ))}
              {preferredSkills.length === 0 && (
                <p className="no-skills-message">No preferred skills specified.</p>
              )}
            </div>
          </div>
        </div>
        
        {job.requirements && (
          <div className="job-description">
            <h4>Job Description</h4>
            <div className="job-description-content">
              {job.requirements}
            </div>
          </div>
        )}
      </div>
      
      <div className="match-actions">
        <Link to={`/jobs/${job.id}`} className="apply-btn">View Job & Apply</Link>
        <Link to="/resume-upload" className="update-resume-btn">Update Your Resume</Link>
      </div>
    </div>
  );
};

export default MatchDetails;