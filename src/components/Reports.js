// src/components/Reports.js - Completely avoiding Supabase's automatic join syntax
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import './Reports.css';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    jobId: '',
    startDate: '',
    endDate: '',
    minMatchScore: '',
    department: '',
    jobType: ''
  });
  const [availableJobs, setAvailableJobs] = useState([]);
  const [exportFormat, setExportFormat] = useState('csv');
  
  useEffect(() => {
    fetchAvailableJobs();
  }, []);
  
  const fetchAvailableJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get all jobs posted by the current employer
      const { data, error } = await supabase
        .from('job_posts')
        .select('id, title, department, job_type')
        .eq('posted_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAvailableJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error.message);
    }
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Step 1: Get employer's jobs with basic fields only
      const { data: jobs, error: jobsError } = await supabase
        .from('job_posts')
        .select('id, title, company, department, job_type, posted_by, created_at')
        .eq('posted_by', user.id);
      
      if (jobsError) throw jobsError;
      
      if (!jobs || jobs.length === 0) {
        setError('No jobs found for this employer.');
        setLoading(false);
        return;
      }
      
      // Step 2: Get rankings for these jobs
      const jobIds = jobs.map(job => job.id);
      const { data: allRankings, error: rankingsError } = await supabase
        .from('rankings')
        .select('id, job_id, user_id, score, status, created_at, details')
        .in('job_id', jobIds);
      
      if (rankingsError) throw rankingsError;
      
      if (!allRankings || allRankings.length === 0) {
        setError('No candidate rankings found for your jobs.');
        setLoading(false);
        return;
      }
      
      // Apply job filter if specified
      let filteredRankings = allRankings;
      if (filters.jobId) {
        filteredRankings = allRankings.filter(r => r.job_id === filters.jobId);
      }
      
      // Apply match score filter
      if (filters.minMatchScore) {
        filteredRankings = filteredRankings.filter(r => r.score >= parseInt(filters.minMatchScore));
      }
      
      // Step 3: Get profile information for unique candidates
      const userIds = [...new Set(filteredRankings.map(r => r.user_id))];
      
      if (userIds.length === 0) {
        setError('No candidates match your criteria.');
        setLoading(false);
        return;
      }
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Step 4: Get resume information for these candidates
      const { data: resumes, error: resumesError } = await supabase
        .from('resumes')
        .select('user_id, education, experience, skills, yearsOfExperience')
        .in('user_id', userIds);
      
      if (resumesError) throw resumesError;
      
      // Step 5: Combine all data manually
      const enrichedRankings = filteredRankings.map(ranking => {
        const job = jobs.find(j => j.id === ranking.job_id);
        const profile = profiles.find(p => p.id === ranking.user_id);
        const resume = resumes.find(r => r.user_id === ranking.user_id);
        
        return {
          ...ranking,
          job_posts: job,
          profiles: profile,
          resumes: resume,
          candidateName: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown',
          jobTitle: job ? job.title : 'Unknown'
        };
      });
      
      // Step 6: Apply additional filters
      let finalRankings = enrichedRankings;
      
      // Filter by date range
      if (filters.startDate || filters.endDate) {
        finalRankings = finalRankings.filter(ranking => {
          const rankingDate = new Date(ranking.created_at);
          const startDate = filters.startDate ? new Date(filters.startDate) : null;
          const endDate = filters.endDate ? new Date(filters.endDate) : null;
          
          if (startDate && rankingDate < startDate) return false;
          if (endDate && rankingDate > endDate) return false;
          return true;
        });
      }
      
      // Filter by department and job type
      if (filters.department || filters.jobType) {
        finalRankings = finalRankings.filter(ranking => {
          if (filters.department && ranking.job_posts?.department !== filters.department) return false;
          if (filters.jobType && ranking.job_posts?.job_type !== filters.jobType) return false;
          return true;
        });
      }
      
      // Step 7: Generate statistics
      const stats = {
        totalCandidates: finalRankings.length,
        highMatchCandidates: finalRankings.filter(r => r.score >= 80).length,
        mediumMatchCandidates: finalRankings.filter(r => r.score >= 60 && r.score < 80).length,
        lowMatchCandidates: finalRankings.filter(r => r.score < 60).length,
        averageMatchScore: finalRankings.length > 0 ? 
          Math.round(finalRankings.reduce((sum, r) => sum + r.score, 0) / finalRankings.length) : 0,
        
        // Top candidates by score
        topCandidates: [...finalRankings]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10),
        
        // Job breakdown
        jobBreakdown: generateJobBreakdown(finalRankings),
        
        // Skill analysis
        skillAnalysis: analyzeSkills(finalRankings),
        
        // Experience level analysis
        experienceAnalysis: analyzeExperience(finalRankings),
        
        // Education level analysis
        educationAnalysis: analyzeEducation(finalRankings)
      };
      
      setReportData({
        ...stats,
        filters: { ...filters },
        generatedAt: new Date().toISOString(),
        candidateDetails: finalRankings
      });
      
    } catch (error) {
      console.error('Error generating report:', error);
      setError(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const generateJobBreakdown = (rankings) => {
    const breakdown = {};
    
    rankings.forEach(ranking => {
      const jobId = ranking.job_id;
      if (!breakdown[jobId]) {
        breakdown[jobId] = {
          jobTitle: ranking.job_posts?.title || 'Unknown',
          totalCandidates: 0,
          averageScore: 0,
          highMatches: 0,
          mediumMatches: 0,
          lowMatches: 0
        };
      }
      
      breakdown[jobId].totalCandidates++;
      breakdown[jobId].averageScore += ranking.score;
      
      if (ranking.score >= 80) breakdown[jobId].highMatches++;
      else if (ranking.score >= 60) breakdown[jobId].mediumMatches++;
      else breakdown[jobId].lowMatches++;
    });
    
    return Object.values(breakdown).map(job => ({
      ...job,
      averageScore: Math.round(job.averageScore / job.totalCandidates)
    }));
  };
  
  const analyzeSkills = (rankings) => {
    const skillCounts = {
      technical: {},
      languages: {},
      soft: {}
    };
    
    rankings.forEach(ranking => {
      if (ranking.resumes?.skills) {
        try {
          const skills = typeof ranking.resumes.skills === 'string' ? 
            JSON.parse(ranking.resumes.skills) : ranking.resumes.skills;
          
          ['technical', 'languages', 'soft'].forEach(category => {
            if (skills[category] && Array.isArray(skills[category])) {
              skills[category].forEach(skill => {
                if (!skillCounts[category][skill]) {
                  skillCounts[category][skill] = 0;
                }
                skillCounts[category][skill]++;
              });
            }
          });
        } catch (e) {
          console.error('Error parsing skills:', e);
        }
      }
    });
    
    // Get top 10 skills for each category
    const topSkills = {};
    Object.keys(skillCounts).forEach(category => {
      topSkills[category] = Object.entries(skillCounts[category])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));
    });
    
    return topSkills;
  };
  
  const analyzeExperience = (rankings) => {
    const experienceCounts = {
      '0-1': 0,
      '1-3': 0,
      '3-5': 0,
      '5-10': 0,
      '10+': 0,
      'unknown': 0
    };
    
    rankings.forEach(ranking => {
      if (ranking.resumes?.yearsOfExperience) {
        const experience = ranking.resumes.yearsOfExperience;
        if (experienceCounts[experience] !== undefined) {
          experienceCounts[experience]++;
        } else {
          experienceCounts['unknown']++;
        }
      } else {
        experienceCounts['unknown']++;
      }
    });
    
    return Object.entries(experienceCounts).map(([level, count]) => ({ level, count }));
  };
  
  const analyzeEducation = (rankings) => {
    const educationCounts = {
      'high_school': 0,
      'associate': 0,
      'bachelor': 0,
      'master': 0,
      'phd': 0,
      'unknown': 0
    };
    
    rankings.forEach(ranking => {
      if (ranking.resumes?.education) {
        try {
          const education = typeof ranking.resumes.education === 'string' ? 
            JSON.parse(ranking.resumes.education) : ranking.resumes.education;
          
          // Find highest education level
          let highestLevel = 'unknown';
          if (Array.isArray(education)) {
            education.forEach(edu => {
              const degree = (edu.degree || '').toLowerCase();
              if (degree.includes('phd') || degree.includes('doctorate')) {
                highestLevel = 'phd';
              } else if (degree.includes('master') && highestLevel !== 'phd') {
                highestLevel = 'master';
              } else if (degree.includes('bachelor') && !['phd', 'master'].includes(highestLevel)) {
                highestLevel = 'bachelor';
              } else if (degree.includes('associate') && !['phd', 'master', 'bachelor'].includes(highestLevel)) {
                highestLevel = 'associate';
              }
            });
          }
          
          if (educationCounts[highestLevel] !== undefined) {
            educationCounts[highestLevel]++;
          } else {
            educationCounts['unknown']++;
          }
        } catch (e) {
          console.error('Error parsing education:', e);
          educationCounts['unknown']++;
        }
      } else {
        educationCounts['unknown']++;
      }
    });
    
    return Object.entries(educationCounts).map(([level, count]) => ({ level, count }));
  };
  
  const exportReport = () => {
    if (!reportData) return;
    
    if (exportFormat === 'csv') {
      exportToCSV();
    } else if (exportFormat === 'pdf') {
      exportToPDF();
    }
  };
  
  const exportToCSV = () => {
    const csvData = [
      // Headers
      ['Candidate Name', 'Email', 'Job Title', 'Match Score', 'Experience Level', 'Education']
    ];
    
    // Add candidate data
    reportData.candidateDetails.forEach(candidate => {
      csvData.push([
        candidate.candidateName,
        candidate.profiles?.email || '',
        candidate.jobTitle,
        candidate.score,
        candidate.resumes?.yearsOfExperience || '',
        getHighestEducation(candidate.resumes?.education)
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvData.map(row => row.map(cell => 
      // Escape commas and quotes in CSV
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"')) 
        ? `"${cell.replace(/"/g, '""')}"` 
        : cell
    ).join(',')).join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `recruitment_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const exportToPDF = () => {
    const content = `
Recruitment Report
Generated on: ${new Date(reportData.generatedAt).toLocaleString()}

Summary Statistics:
- Total Candidates: ${reportData.totalCandidates}
- Average Match Score: ${reportData.averageMatchScore}%
- High Matches (80%+): ${reportData.highMatchCandidates}
- Medium Matches (60-79%): ${reportData.mediumMatchCandidates}
- Low Matches (<60%): ${reportData.lowMatchCandidates}

Top Candidates:
${reportData.topCandidates.map(c => 
  `- ${c.candidateName} (${c.jobTitle}): ${c.score}%`
).join('\n')}

Job Breakdown:
${reportData.jobBreakdown.map(job => 
  `- ${job.jobTitle}: ${job.totalCandidates} candidates, Average: ${job.averageScore}%`
).join('\n')}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recruitment_report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  const getHighestEducation = (education) => {
    if (!education) return 'Unknown';
    
    let educationArray;
    try {
      educationArray = typeof education === 'string' ? 
        JSON.parse(education) : education;
    } catch (e) {
      return 'Unknown';
    }
    
    if (!Array.isArray(educationArray)) return 'Unknown';
    
    let highestLevel = 'Unknown';
    educationArray.forEach(edu => {
      const degree = (edu.degree || '').toLowerCase();
      if (degree.includes('phd') || degree.includes('doctorate')) {
        highestLevel = 'PhD';
      } else if (degree.includes('master') && highestLevel !== 'PhD') {
        highestLevel = 'Master\'s';
      } else if (degree.includes('bachelor') && !['PhD', 'Master\'s'].includes(highestLevel)) {
        highestLevel = 'Bachelor\'s';
      } else if (degree.includes('associate') && !['PhD', 'Master\'s', 'Bachelor\'s'].includes(highestLevel)) {
        highestLevel = 'Associate';
      }
    });
    
    return highestLevel;
  };
  
  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Recruitment Reports</h2>
        <p>Generate comprehensive reports on your recruitment process and candidate matching.</p>
      </div>
      
      {/* Filters Section */}
      <div className="filters-section">
        <h3>Report Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="jobId">Specific Job (Optional)</label>
            <select id="jobId" name="jobId" value={filters.jobId} onChange={handleFilterChange}>
              <option value="">All Jobs</option>
              {availableJobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="minMatchScore">Minimum Match Score</label>
            <input
              type="number"
              id="minMatchScore"
              name="minMatchScore"
              min="0"
              max="100"
              value={filters.minMatchScore}
              onChange={handleFilterChange}
              placeholder="e.g., 60"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="department">Department</label>
            <input
              type="text"
              id="department"
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              placeholder="e.g., Engineering"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="jobType">Job Type</label>
            <select id="jobType" name="jobType" value={filters.jobType} onChange={handleFilterChange}>
              <option value="">All Types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        
        <div className="filters-actions">
          <button onClick={generateReport} disabled={loading} className="generate-report-btn">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}
      
      {/* Report Results */}
      {reportData && (
        <div className="report-results">
          {/* Export Options */}
          <div className="export-section">
            <h3>Export Report</h3>
            <div className="export-options">
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                <option value="csv">CSV Format</option>
                <option value="pdf">PDF Format</option>
              </select>
              <button onClick={exportReport} className="export-btn">
                Export Report
              </button>
            </div>
          </div>
          
          {/* Summary Statistics */}
          <div className="report-section">
            <h3>Summary Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{reportData.totalCandidates}</div>
                <div className="stat-label">Total Candidates</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{reportData.averageMatchScore}%</div>
                <div className="stat-label">Average Match Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{reportData.highMatchCandidates}</div>
                <div className="stat-label">High Matches (80%+)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{reportData.mediumMatchCandidates}</div>
                <div className="stat-label">Medium Matches (60-79%)</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{reportData.lowMatchCandidates}</div>
                <div className="stat-label">Low Matches (&lt;60%)</div>
              </div>
            </div>
          </div>
          
          {/* Top Candidates */}
          <div className="report-section">
            <h3>Top Candidates</h3>
            <div className="candidates-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Job</th>
                    <th>Match Score</th>
                    <th>Experience</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topCandidates.map((candidate, index) => (
                    <tr key={candidate.id}>
                      <td>{index + 1}</td>
                      <td>{candidate.candidateName}</td>
                      <td>{candidate.jobTitle}</td>
                      <td>
                        <span className={`match-score ${
                          candidate.score >= 80 ? 'high' : 
                          candidate.score >= 60 ? 'medium' : 'low'
                        }`}>
                          {candidate.score}%
                        </span>
                      </td>
                      <td>{candidate.resumes?.yearsOfExperience || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Job Breakdown */}
          <div className="report-section">
            <h3>Job Breakdown</h3>
            <div className="jobs-breakdown">
              {reportData.jobBreakdown.map((job, index) => (
                <div key={index} className="job-breakdown-card">
                  <h4>{job.jobTitle}</h4>
                  <div className="job-stats">
                    <div className="job-stat">
                      <span className="stat-label">Total Candidates:</span>
                      <span className="stat-value">{job.totalCandidates}</span>
                    </div>
                    <div className="job-stat">
                      <span className="stat-label">Average Score:</span>
                      <span className="stat-value">{job.averageScore}%</span>
                    </div>
                    <div className="job-stat">
                      <span className="stat-label">High Matches:</span>
                      <span className="stat-value">{job.highMatches}</span>
                    </div>
                    <div className="job-stat">
                      <span className="stat-label">Medium Matches:</span>
                      <span className="stat-value">{job.mediumMatches}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Skills Analysis */}
          <div className="report-section">
            <h3>Most Common Skills</h3>
            <div className="skills-analysis">
              {['technical', 'soft', 'languages'].map(category => (
                <div key={category} className="skill-category">
                  <h4>{category.charAt(0).toUpperCase() + category.slice(1)} Skills</h4>
                  <div className="skill-bars">
                    {reportData.skillAnalysis[category]?.map((skill, index) => (
                      <div key={index} className="skill-bar">
                        <div className="skill-name">{skill.skill}</div>
                        <div className="bar-container">
                          <div 
                            className="bar" 
                            style={{ 
                              width: `${Math.min(100, (skill.count / reportData.totalCandidates) * 100)}%` 
                            }}
                          ></div>
                          <span className="skill-count">{skill.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Experience and Education Analysis */}
          <div className="report-section">
            <div className="analysis-row">
              <div className="analysis-section">
                <h3>Experience Distribution</h3>
                <div className="distribution-chart">
                  {reportData.experienceAnalysis.map((item, index) => (
                    <div key={index} className="distribution-item">
                      <div className="distribution-label">{item.level}</div>
                      <div className="distribution-bar">
                        <div 
                          className="bar" 
                          style={{ 
                            width: `${Math.min(100, (item.count / reportData.totalCandidates) * 100)}%` 
                          }}
                        ></div>
                        <span className="distribution-count">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="analysis-section">
                <h3>Education Distribution</h3>
                <div className="distribution-chart">
                  {reportData.educationAnalysis.map((item, index) => (
                    <div key={index} className="distribution-item">
                      <div className="distribution-label">
                        {item.level.replace('_', ' ').charAt(0).toUpperCase() + item.level.slice(1)}
                      </div>
                      <div className="distribution-bar">
                        <div 
                          className="bar" 
                          style={{ 
                            width: `${Math.min(100, (item.count / reportData.totalCandidates) * 100)}%` 
                          }}
                        ></div>
                        <span className="distribution-count">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;