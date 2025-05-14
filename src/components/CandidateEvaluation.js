// src/components/CandidateEvaluation.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { analyzeCandidate } from '../services/openAIService';
import './CandidateEvaluation.css';

const CandidateEvaluation = ({ candidateId, jobPostingId }) => {
  const [candidate, setCandidate] = useState(null);
  const [resume, setResume] = useState(null);
  const [jobPosting, setJobPosting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch candidate and resume data
  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        setLoading(true);
        
        // Fetch candidate profile
        const { data: candidateData, error: candidateError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', candidateId)
          .single();
          
        if (candidateError) throw candidateError;
        setCandidate(candidateData);
        
        // Fetch candidate's resume
        const { data: resumeData, error: resumeError } = await supabase
          .from('resumes')
          .select('*')
          .eq('user_id', candidateId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (resumeError && resumeError.code !== 'PGRST116') throw resumeError;
        setResume(resumeData || null);
        
        // Fetch job posting details
        if (jobPostingId) {
          const { data: jobData, error: jobError } = await supabase
            .from('job_posts')
            .select('*')
            .eq('id', jobPostingId)
            .single();
            
          if (jobError) throw jobError;
          setJobPosting(jobData);
          
          // Automatically analyze if we have both resume and job posting
          if (resumeData && jobData) {
            performAIAnalysis(resumeData, jobData);
          }
        }
        
      } catch (error) {
        console.error('Error fetching candidate data:', error);
        setError('Failed to load candidate information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCandidateData();
  }, [candidateId, jobPostingId]);
  
  // Perform AI analysis
  const performAIAnalysis = async (resumeData, jobData) => {
    try {
      setAiLoading(true);
      
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
          required_skills: jobData.required_skills,
          preferred_skills: jobData.preferred_skills
        }
      };
      
      // Call OpenAI to analyze
      const analysis = await analyzeCandidate(analysisData);
      
      setAiAnalysis(analysis);
      
    } catch (error) {
      console.error('Error analyzing candidate:', error);
      setError('Failed to analyze candidate profile');
    } finally {
      setAiLoading(false);
    }
  };
  
  // Manual trigger for AI analysis
  const handleAnalyzeClick = () => {
    if (resume && jobPosting) {
      performAIAnalysis(resume, jobPosting);
    } else {
      setError('Cannot analyze: Missing resume or job posting data');
    }
  };

  if (loading) {
    return <div className="loading-container">Loading candidate information...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  if (!candidate) {
    return <div className="not-found-message">Candidate not found</div>;
  }

  return (
    <div className="candidate-evaluation-container">
      <div className="candidate-profile-section">
        <div className="candidate-header">
          <h2>{candidate.first_name} {candidate.last_name}</h2>
          {!aiAnalysis && !aiLoading && (
            <button 
              className="analyze-button"
              onClick={handleAnalyzeClick}
              disabled={!resume || !jobPosting}
            >
              Analyze Match with AI
            </button>
          )}
        </div>
        
        {/* Basic Candidate Info */}
        <div className="candidate-info">
          <div className="info-item">
            <span className="info-label">Email:</span>
            <span className="info-value">{candidate.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Phone:</span>
            <span className="info-value">{candidate.phone || 'Not provided'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Location:</span>
            <span className="info-value">{resume?.location || 'Not provided'}</span>
          </div>
          {resume?.yearsOfExperience && (
            <div className="info-item">
              <span className="info-label">Experience:</span>
              <span className="info-value">{resume.yearsOfExperience}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Analysis Section */}
      {aiLoading && (
        <div className="ai-loading">
          <div className="ai-spinner"></div>
          <p>AI is analyzing candidate compatibility...</p>
        </div>
      )}
      
      {aiAnalysis && (
        <div className="ai-analysis-section">
          <h3>AI Candidate Analysis</h3>
          
          {/* Match Score */}
          <div className="match-score-container">
            <div className="match-score-header">
              <h4>Overall Match Score</h4>
              <div className="match-percentage">
                <span>{aiAnalysis.matchPercentage}%</span>
              </div>
            </div>
            <div className="match-score-bar">
              <div 
                className="match-score-fill" 
                style={{ 
                  width: `${aiAnalysis.matchPercentage}%`,
                  backgroundColor: aiAnalysis.matchPercentage > 80 ? '#4CAF50' : 
                                    aiAnalysis.matchPercentage > 60 ? '#FFC107' : '#F44336'
                }}
              ></div>
            </div>
            <p className="match-summary">{aiAnalysis.summary}</p>
          </div>
          
          {/* Skill Match Analysis */}
          <div className="analysis-section">
            <h4>Skills Analysis</h4>
            <div className="skills-breakdown">
              <div className="skill-match-categories">
                <div className="skill-category">
                  <h5>Required Skills Match</h5>
                  <div className="skill-bar-container">
                    <div className="skill-bar">
                      <div 
                        className="skill-bar-fill" 
                        style={{ width: `${aiAnalysis.requiredSkillsMatch}%` }}
                      ></div>
                    </div>
                    <span className="skill-percentage">{aiAnalysis.requiredSkillsMatch}%</span>
                  </div>
                </div>
                
                <div className="skill-category">
                  <h5>Preferred Skills Match</h5>
                  <div className="skill-bar-container">
                    <div className="skill-bar">
                      <div 
                        className="skill-bar-fill" 
                        style={{ width: `${aiAnalysis.preferredSkillsMatch}%` }}
                      ></div>
                    </div>
                    <span className="skill-percentage">{aiAnalysis.preferredSkillsMatch}%</span>
                  </div>
                </div>
              </div>
              
              {/* Matching Skills */}
              <div className="matching-skills">
                <h5>Matching Skills</h5>
                <div className="skill-tags">
                  {aiAnalysis.matchingSkills.map((skill, index) => (
                    <span key={index} className="skill-tag matching">{skill}</span>
                  ))}
                </div>
              </div>
              
              {/* Missing Skills */}
              <div className="missing-skills">
                <h5>Missing Required Skills</h5>
                <div className="skill-tags">
                  {aiAnalysis.missingRequiredSkills.map((skill, index) => (
                    <span key={index} className="skill-tag missing">{skill}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Experience Analysis */}
          <div className="analysis-section">
            <h4>Experience Analysis</h4>
            <div className="experience-breakdown">
              <div className="experience-bar-container">
                <h5>Experience Relevance</h5>
                <div className="experience-bar">
                  <div 
                    className="experience-bar-fill" 
                    style={{ width: `${aiAnalysis.experienceRelevance}%` }}
                  ></div>
                </div>
                <span className="experience-percentage">{aiAnalysis.experienceRelevance}%</span>
              </div>
              <p className="experience-analysis">{aiAnalysis.experienceAnalysis}</p>
            </div>
          </div>
          
          {/* Insights and Recommendations */}
          <div className="analysis-section">
            <h4>Hiring Insights</h4>
            <div className="strengths-weaknesses">
              <div className="strengths">
                <h5>Candidate Strengths</h5>
                <ul>
                  {aiAnalysis.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div className="weaknesses">
                <h5>Potential Gaps</h5>
                <ul>
                  {aiAnalysis.weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Interview Recommendations */}
          <div className="analysis-section">
            <h4>Interview Recommendations</h4>
            <div className="interview-questions">
              <p className="recommendation-intro">Consider asking these questions to assess candidate fit:</p>
              <ul>
                {aiAnalysis.suggestedInterviewQuestions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Resume Section */}
      <div className="resume-section">
        <h3>Resume Details</h3>
        
        {resume ? (
          <div className="resume-content">
            {resume.professional_summary && (
              <div className="resume-section-item">
                <h4>Professional Summary</h4>
                <p>{resume.professional_summary}</p>
              </div>
            )}
            
            {resume.skills && (
              <div className="resume-section-item">
                <h4>Skills</h4>
                <div className="skills-container">
                  {JSON.parse(resume.skills).technical && (
                    <div className="skill-group">
                      <h5>Technical</h5>
                      <div className="skill-tags">
                        {JSON.parse(resume.skills).technical.map((skill, index) => (
                          <span key={index} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {JSON.parse(resume.skills).soft && (
                    <div className="skill-group">
                      <h5>Soft Skills</h5>
                      <div className="skill-tags">
                        {JSON.parse(resume.skills).soft.map((skill, index) => (
                          <span key={index} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {JSON.parse(resume.skills).languages && (
                    <div className="skill-group">
                      <h5>Languages</h5>
                      <div className="skill-tags">
                        {JSON.parse(resume.skills).languages.map((language, index) => (
                          <span key={index} className="skill-tag">{language}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {resume.experience && (
              <div className="resume-section-item">
                <h4>Experience</h4>
                <div className="experience-items">
                  {JSON.parse(resume.experience).map((exp, index) => (
                    <div key={index} className="experience-item">
                      <div className="experience-header">
                        <h5>{exp.position}</h5>
                        <span className="company-name">{exp.company}</span>
                      </div>
                      <div className="experience-period">
                        <span>{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                        {exp.location && <span className="experience-location">{exp.location}</span>}
                      </div>
                      {exp.description && <p className="experience-description">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {resume.education && (
              <div className="resume-section-item">
                <h4>Education</h4>
                <div className="education-items">
                  {JSON.parse(resume.education).map((edu, index) => (
                    <div key={index} className="education-item">
                      <div className="education-header">
                        <h5>{edu.degree} in {edu.field}</h5>
                        <span className="institution-name">{edu.institution}</span>
                      </div>
                      <div className="education-period">
                        <span>{edu.startDate} - {edu.endDate}</span>
                        {edu.gpa && <span className="education-gpa">GPA: {edu.gpa}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-resume-message">No resume information available.</div>
        )}
      </div>
    </div>
  );
};

export default CandidateEvaluation;