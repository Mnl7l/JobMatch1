// src/services/resumeMatchingService.js
import { supabase } from '../utils/supabaseClient';
import axios from 'axios';

/**
 * Service for matching resumes to jobs using OpenAI's GPT
 */
class ResumeMatchingService {
  /**
   * Process a resume file and extract structured data using OpenAI
   * @param {File} file - The resume file (PDF, DOCX, TXT)
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - The processed resume data and match scores
   */
  static async processResume(file, userId) {
    try {
      // First upload the file to storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `resumes/${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get the public URL for the file
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);
      
      // Extract text from the file
      const extractedText = await this.extractTextFromFile(file);
      
      // Use OpenAI to parse resume data
      const resumeData = await this.parseResumeWithAI(extractedText);
      
      // Save the parsed resume data to the database
      const { data: savedResume, error: saveError } = await supabase
        .from('resumes')
        .insert([{
          user_id: userId,
          file_url: publicUrl,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          original_filename: file.name,
          skills: resumeData.skills,
          education: resumeData.education,
          experience: resumeData.experience,
          professional_summary: resumeData.summary,
          yearsOfExperience: resumeData.yearsOfExperience,
          created_at: new Date()
        }])
        .select();
      
      if (saveError) throw saveError;
      
      return {
        resumeId: savedResume[0].id,
        resumeData: resumeData,
        fileUrl: publicUrl
      };
    } catch (error) {
      console.error('Error processing resume:', error);
      throw error;
    }
  }
  
  /**
   * Extract text content from various file types
   * @param {File} file - The file to extract text from
   * @returns {Promise<string>} - The extracted text
   */
  static async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const fileType = file.type;
          if (fileType === 'application/pdf') {
            // For PDFs, we would normally use a PDF parsing library
            // This is a placeholder - in a real app you'd use pdf.js or similar
            resolve("PDF content extraction would happen here");
            // Implement PDF extraction logic
          } else if (fileType.includes('word') || fileType.includes('docx')) {
            // For Word docs, we would use a Word parsing library
            // This is a placeholder - in a real app you'd use mammoth.js or similar
            resolve("Word document content extraction would happen here");
            // Implement Word doc extraction logic
          } else if (fileType === 'text/plain') {
            // For plain text files
            resolve(event.target.result);
          } else {
            // Try to extract as text for other formats
            resolve(event.target.result);
          }
          
          // For demonstration, just use the file name as example text
          // In a real scenario, we would have proper text extraction
          resolve(`Sample resume content for ${file.name}. 
          This would be the actual text content extracted from the document.
          It would include education history, work experience, skills, etc.`);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      
      // Read as text if it's a text file, otherwise as binary
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }
  
  /**
   * Use OpenAI to parse resume text into structured data
   * @param {string} resumeText - The text extracted from the resume
   * @returns {Promise<Object>} - Structured resume data
   */
  static async parseResumeWithAI(resumeText) {
    try {
      const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an expert resume parser. Extract the following information from the resume text:
              1. Contact information (name, email, phone)
              2. Professional summary
              3. Skills (technical, soft, languages)
              4. Education history
              5. Work experience
              6. Years of experience (estimate total years)
              
              Format the output as a clean JSON object with the following structure:
              {
                "contactInfo": { "name": "", "email": "", "phone": "" },
                "summary": "",
                "skills": { "technical": [], "soft": [], "languages": [] },
                "education": [{ "institution": "", "degree": "", "field": "", "startDate": "", "endDate": "", "current": false }],
                "experience": [{ "company": "", "position": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],
                "yearsOfExperience": ""
              }`
            },
            {
              role: 'user',
              content: resumeText
            }
          ],
          temperature: 0.2
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );
      
      const generatedContent = response.data.choices[0].message.content;
      
      // Extract the JSON object from the response
      try {
        // Try to parse the response as a JSON object
        return JSON.parse(generatedContent);
      } catch (parseError) {
        console.error('Error parsing OpenAI response as JSON:', parseError);
        
        // If parsing fails, extract the JSON block from the text
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Error parsing extracted JSON block:', e);
          }
        }
        
        // Return a fallback structure if all else fails
        return {
          contactInfo: { name: "", email: "", phone: "" },
          summary: "Failed to parse resume",
          skills: { technical: [], soft: [], languages: [] },
          education: [],
          experience: [],
          yearsOfExperience: ""
        };
      }
    } catch (error) {
      console.error('Error parsing resume with OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Match a resume to a job using OpenAI analysis
   * @param {Object} resumeData - Structured resume data
   * @param {Object} jobData - Structured job data
   * @returns {Promise<Object>} - Match analysis result
   */
  static async matchResumeToJob(resumeData, jobData) {
    try {
      const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an AI recruiting assistant that analyzes job candidate profiles against job requirements.
              You will be provided with a candidate's resume data and a job posting.
              Evaluate how well the candidate matches the job requirements.
              
              Format your response as a JSON object with the following schema:
              {
                "matchPercentage": number (0-100, overall match score),
                "summary": string (brief 1-2 sentence evaluation),
                "requiredSkillsMatch": number (0-100, percentage of required skills the candidate has),
                "preferredSkillsMatch": number (0-100, percentage of preferred skills the candidate has),
                "matchingSkills": [string] (list of the candidate's skills that match the job requirements),
                "missingRequiredSkills": [string] (list of required skills the candidate is missing),
                "experienceRelevance": number (0-100, how relevant the candidate's experience is to the job),
                "experienceAnalysis": string (brief analysis of the candidate's experience),
                "strengths": [string] (list of 3-5 candidate strengths for this role),
                "weaknesses": [string] (list of 3-5 areas where the candidate might not align with the role),
                "suggestedInterviewQuestions": [string] (list of 3-5 tailored interview questions to assess fit)
              }`
            },
            {
              role: 'user',
              content: `
              CANDIDATE RESUME DATA:
              ${JSON.stringify(resumeData, null, 2)}
              
              JOB DESCRIPTION:
              ${JSON.stringify(jobData, null, 2)}
              
              Provide a detailed analysis of how well this candidate matches the job requirements.
              `
            }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );
      
      const generatedContent = response.data.choices[0].message.content;
      
      // Extract the JSON object from the response
      try {
        return JSON.parse(generatedContent);
      } catch (parseError) {
        console.error('Error parsing OpenAI response as JSON:', parseError);
        
        // If parsing fails, extract the JSON block from the text
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Error parsing extracted JSON block:', e);
          }
        }
        
        // Return a fallback structure if all else fails
        return {
          matchPercentage: 0,
          summary: "Failed to analyze match",
          requiredSkillsMatch: 0,
          preferredSkillsMatch: 0,
          matchingSkills: [],
          missingRequiredSkills: [],
          experienceRelevance: 0,
          experienceAnalysis: "Analysis failed",
          strengths: [],
          weaknesses: [],
          suggestedInterviewQuestions: []
        };
      }
    } catch (error) {
      console.error('Error matching resume to job with OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Save match result to the database
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   * @param {Object} matchResult - The result of the matching process
   * @returns {Promise<Object>} - Saved match data
   */
  static async saveMatchResult(userId, jobId, matchResult) {
    try {
      // Check if a match already exists
      const { data: existingMatch } = await supabase
        .from('rankings')
        .select('id')
        .eq('user_id', userId)
        .eq('job_id', jobId)
        .single();
      
      if (existingMatch) {
        // Update existing match
        const { data, error } = await supabase
          .from('rankings')
          .update({
            score: matchResult.matchPercentage,
            details: JSON.stringify(matchResult),
            updated_at: new Date()
          })
          .eq('id', existingMatch.id)
          .select();
        
        if (error) throw error;
        return data[0];
      } else {
        // Create new match
        const { data, error } = await supabase
          .from('rankings')
          .insert([{
            user_id: userId,
            job_id: jobId,
            score: matchResult.matchPercentage,
            details: JSON.stringify(matchResult),
            status: 'pending',
            created_at: new Date()
          }])
          .select();
        
        if (error) throw error;
        return data[0];
      }
    } catch (error) {
      console.error('Error saving match result:', error);
      throw error;
    }
  }
  
  /**
   * Get suggestions to improve resume for a specific job
   * @param {Object} resumeData - Structured resume data
   * @param {Object} jobData - Structured job data
   * @param {Object} matchResult - Current match result
   * @returns {Promise<Object>} - Resume improvement suggestions
   */
  static async getResumeImprovementSuggestions(resumeData, jobData, matchResult) {
    try {
      const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an expert resume consultant. Analyze the candidate's resume against the job requirements
              and provide actionable suggestions to improve the match. Focus especially on the missing skills and experience gaps.
              
              Format your response as a JSON object with the following schema:
              {
                "summaryOfGaps": string (overall summary of key gaps),
                "skillSuggestions": [string] (list of specific skills to add or emphasize),
                "experienceSuggestions": [string] (list of ways to better highlight or acquire relevant experience),
                "resumeFormattingSuggestions": [string] (list of recommendations for better resume formatting),
                "keywordSuggestions": [string] (list of job-specific keywords to include),
                "improvementPriorities": [string] (list of suggestions in order of importance)
              }`
            },
            {
              role: 'user',
              content: `
              CANDIDATE RESUME DATA:
              ${JSON.stringify(resumeData, null, 2)}
              
              JOB DESCRIPTION:
              ${JSON.stringify(jobData, null, 2)}
              
              CURRENT MATCH ANALYSIS:
              ${JSON.stringify(matchResult, null, 2)}
              
              Provide detailed, actionable suggestions to improve this resume for better matching with the job description.
              `
            }
          ],
          temperature: 0.5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          }
        }
      );
      
      const generatedContent = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(generatedContent);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        
        // Extract JSON if possible
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Error parsing extracted JSON block:', e);
          }
        }
        
        // Return a fallback structure
        return {
          summaryOfGaps: "Could not analyze improvements",
          skillSuggestions: [],
          experienceSuggestions: [],
          resumeFormattingSuggestions: [],
          keywordSuggestions: [],
          improvementPriorities: []
        };
      }
    } catch (error) {
      console.error('Error getting resume improvement suggestions:', error);
      throw error;
    }
  }
}

export default ResumeMatchingService;