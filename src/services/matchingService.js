// src/services/matchingService.js - Enhanced with OpenAI integration
import { supabase } from '../utils/supabaseClient';
import { analyzeCandidate } from '../services/openAIService';

class EnhancedMatchingService {
  // ... [previous code remains the same] ...

  /**
   * NEW METHOD: Analyze all applications for a job posting with enhanced AI
   * @param {string} jobId - Job ID
   * @returns {Promise<Array>} Array of analysis results
   */
  static async analyzeAllApplicationsForJob(jobId) {
    try {
      // Get all applications for this job
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          *,
          resume:resume_id (*),
          profile:user_id (id, first_name, last_name, email)
        `)
        .eq('job_id', jobId);
      
      if (error) throw error;
      
      if (!applications || applications.length === 0) {
        return { processed: 0, message: 'No applications found for this job' };
      }
      
      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('job_posts')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (jobError) throw jobError;
      
      // Process in batches to avoid rate limiting
      const batchSize = 3;
      const batches = Math.ceil(applications.length / batchSize);
      
      const results = [];
      
      for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, applications.length);
        const batch = applications.slice(batchStart, batchEnd);
        
        // Process applications in parallel within this batch
        const batchPromises = batch.map(async (application) => {
          try {
            // Skip if already analyzed
            if (application.ai_analysis && application.ai_match_score) {
              return {
                applicationId: application.id,
                candidateName: `${application.profile?.first_name || ''} ${application.profile?.last_name || ''}`.trim(),
                matchPercentage: application.ai_match_score,
                status: 'already_analyzed'
              };
            }
            
            // Verify resume data
            if (!application.resume) {
              return {
                applicationId: application.id,
                candidateName: `${application.profile?.first_name || ''} ${application.profile?.last_name || ''}`.trim(),
                error: 'No resume data available',
                status: 'error'
              };
            }
            
            // Prepare data for analysis
            const analysisData = {
              resume: {
                skills: application.resume.skills ? JSON.parse(application.resume.skills) : {},
                experience: application.resume.experience ? JSON.parse(application.resume.experience) : [],
                education: application.resume.education ? JSON.parse(application.resume.education) : [],
                professional_summary: application.resume.professional_summary || ''
              },
              job: {
                title: job.title,
                description: job.description,
                requirements: job.requirements,
                responsibilities: job.responsibilities,
                required_skills: job.required_skills,
                preferred_skills: job.preferred_skills
              }
            };
            
            // Call OpenAI for analysis
            const analysis = await analyzeCandidate(analysisData);
            
            // Update application with results
            const { error: updateError } = await supabase
              .from('applications')
              .update({
                ai_match_score: analysis.matchPercentage,
                ai_analysis: JSON.stringify(analysis)
              })
              .eq('id', application.id);
            
            if (updateError) throw updateError;
            
            return {
              applicationId: application.id,
              candidateName: `${application.profile?.first_name || ''} ${application.profile?.last_name || ''}`.trim(),
              matchPercentage: analysis.matchPercentage,
              status: 'analyzed'
            };
          } catch (error) {
            console.error(`Error analyzing application ${application.id}:`, error);
            return {
              applicationId: application.id,
              candidateName: `${application.profile?.first_name || ''} ${application.profile?.last_name || ''}`.trim(),
              error: error.message,
              status: 'error'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add a small delay between batches to avoid API rate limits
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        processed: results.length,
        successful: results.filter(r => r.status === 'analyzed' || r.status === 'already_analyzed').length,
        failed: results.filter(r => r.status === 'error').length,
        results
      };
    } catch (error) {
      console.error('Error analyzing applications for job:', error);
      throw error;
    }
  }
  
  /**
   * NEW METHOD: Get AI analysis summary for a job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Summary of AI analysis results
   */
  static async getAIAnalysisSummaryForJob(jobId) {
    try {
      // Get all applications with AI analysis for this job
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          id,
          ai_match_score,
          ai_analysis,
          user_id,
          profile:user_id (id, first_name, last_name, email),
          created_at,
          status
        `)
        .eq('job_id', jobId)
        .not('ai_match_score', 'is', null);
      
      if (error) throw error;
      
      if (!applications || applications.length === 0) {
        return {
          analyzed_count: 0,
          average_match_score: 0,
          top_candidates: [],
          message: 'No AI-analyzed applications found for this job'
        };
      }
      
      // Calculate statistics
      const analyzedCount = applications.length;
      const totalScore = applications.reduce((sum, app) => sum + app.ai_match_score, 0);
      const averageScore = Math.round(totalScore / analyzedCount);
      
      // Get top 5 candidates by match score
      const topCandidates = applications
        .sort((a, b) => b.ai_match_score - a.ai_match_score)
        .slice(0, 5)
        .map(app => ({
          id: app.id,
          userId: app.user_id,
          name: `${app.profile?.first_name || ''} ${app.profile?.last_name || ''}`.trim(),
          email: app.profile?.email,
          matchScore: app.ai_match_score,
          appliedAt: app.created_at,
          status: app.status,
          analysis: app.ai_analysis ? JSON.parse(app.ai_analysis) : null
        }));
      
      // Count by score range
      const highScoreCount = applications.filter(app => app.ai_match_score >= 80).length;
      const mediumScoreCount = applications.filter(app => app.ai_match_score >= 60 && app.ai_match_score < 80).length;
      const lowScoreCount = applications.filter(app => app.ai_match_score < 60).length;
      
      // Find common strengths and gaps among top candidates
      const strengthsMap = new Map();
      const gapsMap = new Map();
      
      topCandidates.forEach(candidate => {
        if (!candidate.analysis || !candidate.analysis.strengths || !candidate.analysis.weaknesses) return;
        
        candidate.analysis.strengths.forEach(strength => {
          strengthsMap.set(strength, (strengthsMap.get(strength) || 0) + 1);
        });
        
        candidate.analysis.weaknesses.forEach(gap => {
          gapsMap.set(gap, (gapsMap.get(gap) || 0) + 1);
        });
      });
      
      // Sort by frequency
      const commonStrengths = Array.from(strengthsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([strength]) => strength);
        
      const commonGaps = Array.from(gapsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([gap]) => gap);
      
      return {
        analyzed_count: analyzedCount,
        average_match_score: averageScore,
        score_distribution: {
          high: highScoreCount,
          medium: mediumScoreCount,
          low: lowScoreCount
        },
        top_candidates: topCandidates,
        common_strengths: commonStrengths,
        common_gaps: commonGaps
      };
    } catch (error) {
      console.error('Error getting AI analysis summary:', error);
      throw error;
    }
  }
  
  /**
   * NEW METHOD: Compare two candidates with AI
   * @param {string} jobId - Job ID
   * @param {string} candidate1Id - First candidate ID
   * @param {string} candidate2Id - Second candidate ID
   * @returns {Promise<Object>} Comparison results
   */
  static async compareCandidatesWithAI(jobId, candidate1Id, candidate2Id) {
    try {
      // Get applications for both candidates
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          *,
          profile:user_id (id, first_name, last_name, email),
          ai_match_score,
          ai_analysis
        `)
        .eq('job_id', jobId)
        .in('user_id', [candidate1Id, candidate2Id]);
      
      if (error) throw error;
      
      if (!applications || applications.length < 2) {
        throw new Error('Could not find applications for both candidates');
      }
      
      // Ensure both applications have AI analysis
      for (const app of applications) {
        if (!app.ai_analysis || !app.ai_match_score) {
          // Run analysis if missing
          await this.analyzeApplicationWithAI(app.id);
        }
      }
      
      // Get fresh application data with analysis
      const { data: updatedApplications, error: refreshError } = await supabase
        .from('applications')
        .select(`
          *,
          profile:user_id (id, first_name, last_name, email),
          ai_match_score,
          ai_analysis
        `)
        .eq('job_id', jobId)
        .in('user_id', [candidate1Id, candidate2Id]);
      
      if (refreshError) throw refreshError;
      
      // Map candidates
      const candidate1 = updatedApplications.find(app => app.user_id === candidate1Id);
      const candidate2 = updatedApplications.find(app => app.user_id === candidate2Id);
      
      if (!candidate1.ai_analysis || !candidate2.ai_analysis) {
        throw new Error('AI analysis not available for one or both candidates');
      }
      
      // Parse AI analysis
      const analysis1 = typeof candidate1.ai_analysis === 'string' 
        ? JSON.parse(candidate1.ai_analysis) 
        : candidate1.ai_analysis;
        
      const analysis2 = typeof candidate2.ai_analysis === 'string' 
        ? JSON.parse(candidate2.ai_analysis) 
        : candidate2.ai_analysis;
      
      // Structure comparison data
      const comparison = {
        job_id: jobId,
        candidates: {
          candidate1: {
            id: candidate1Id,
            name: `${candidate1.profile?.first_name || ''} ${candidate1.profile?.last_name || ''}`.trim(),
            matchScore: candidate1.ai_match_score,
            strengths: analysis1.strengths || [],
            weaknesses: analysis1.weaknesses || [],
            requiredSkillsMatch: analysis1.requiredSkillsMatch || 0,
            preferredSkillsMatch: analysis1.preferredSkillsMatch || 0,
            experienceRelevance: analysis1.experienceRelevance || 0,
            matchingSummary: analysis1.summary || ''
          },
          candidate2: {
            id: candidate2Id,
            name: `${candidate2.profile?.first_name || ''} ${candidate2.profile?.last_name || ''}`.trim(),
            matchScore: candidate2.ai_match_score,
            strengths: analysis2.strengths || [],
            weaknesses: analysis2.weaknesses || [],
            requiredSkillsMatch: analysis2.requiredSkillsMatch || 0,
            preferredSkillsMatch: analysis2.preferredSkillsMatch || 0,
            experienceRelevance: analysis2.experienceRelevance || 0,
            matchingSummary: analysis2.summary || ''
          }
        },
        comparison: {
          overallDifference: Math.abs(candidate1.ai_match_score - candidate2.ai_match_score),
          leadingCandidate: candidate1.ai_match_score > candidate2.ai_match_score ? 'candidate1' : 'candidate2',
          skillsComparison: {
            requiredSkillsDifference: Math.abs(
              (analysis1.requiredSkillsMatch || 0) - (analysis2.requiredSkillsMatch || 0)
            ),
            preferredSkillsDifference: Math.abs(
              (analysis1.preferredSkillsMatch || 0) - (analysis2.preferredSkillsMatch || 0)
            ),
            requiredSkillsLeader: (analysis1.requiredSkillsMatch || 0) > (analysis2.requiredSkillsMatch || 0) 
              ? 'candidate1' : 'candidate2',
            preferredSkillsLeader: (analysis1.preferredSkillsMatch || 0) > (analysis2.preferredSkillsMatch || 0) 
              ? 'candidate1' : 'candidate2'
          },
          experienceComparison: {
            experienceDifference: Math.abs(
              (analysis1.experienceRelevance || 0) - (analysis2.experienceRelevance || 0)
            ),
            experienceLeader: (analysis1.experienceRelevance || 0) > (analysis2.experienceRelevance || 0) 
              ? 'candidate1' : 'candidate2'
          },
          uniqueStrengths: {
            candidate1: analysis1.strengths?.filter(s => !analysis2.strengths?.includes(s)) || [],
            candidate2: analysis2.strengths?.filter(s => !analysis1.strengths?.includes(s)) || []
          },
          sharedStrengths: analysis1.strengths?.filter(s => analysis2.strengths?.includes(s)) || []
        }
      };
      
      return comparison;
    } catch (error) {
      console.error('Error comparing candidates:', error);
      throw error;
    }
  }
}

export default EnhancedMatchingService;