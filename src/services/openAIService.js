// src/services/openAIService.js
import axios from 'axios';

/**
 * Analyzes a candidate's fit for a job posting using OpenAI
 * @param {Object} data - Object containing resume and job posting data
 * @returns {Promise<Object>} - Analysis results
 */
export const analyzeCandidate = async (data) => {
  try {
    // Ensure OpenAI API key is available
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key is missing. Set REACT_APP_OPENAI_API_KEY in your environment variables.');
      throw new Error('API key configuration missing');
    }

    // Configure the prompt for candidate evaluation
    const systemPrompt = `You are an AI recruiting assistant that analyzes job candidate profiles against job requirements.
    You will be provided with a candidate's resume data and a job posting. Evaluate how well the candidate matches the job requirements.
    Focus on skills, experience, education, and overall fit. Provide percentages for match criteria and actionable insights.
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
    }`;

    const userPrompt = `Please analyze this candidate for the following job position:
    
    CANDIDATE RESUME DATA:
    ${JSON.stringify(data.resume, null, 2)}
    
    JOB POSTING:
    ${JSON.stringify(data.job, null, 2)}
    
    Provide a detailed analysis of how well this candidate matches the job requirements.`;

    // Call OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo', // Or another appropriate model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3 // Lower temperature for more focused, objective analysis
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    // Parse the response
    const responseContent = response.data.choices[0].message.content;
    try {
      return JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.log('Raw response:', responseContent);
      
      // Return a formatted error with the raw response for debugging
      return { 
        error: 'Invalid API response format',
        rawResponse: responseContent,
        matchPercentage: 0,
        summary: "Could not analyze candidate properly. Please try again."
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Return a structured error response
    return {
      error: error.message || 'Failed to analyze candidate',
      matchPercentage: 0,
      summary: "An error occurred during candidate analysis."
    };
  }
};

/**
 * Analyzes resume text with OpenAI to extract structured information
 * @param {string} resumeText - Text content of the resume or raw data to analyze
 * @param {string} type - Type of analysis ("parse", "enhance", "improveExperience", etc.)
 * @returns {Promise<Object>} - Structured resume data or analysis
 */
export const getOpenAIAnalysis = async (resumeText, type = 'parse') => {
  try {
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key is missing');
      throw new Error('API key configuration missing');
    }
    
    // Configure prompt based on analysis type
    let systemPrompt = '';
    let userPrompt = '';
    
    switch (type) {
      case 'parse':
        systemPrompt = `You are an AI assistant specialized in parsing resumes. 
        Extract structured information from the provided resume text. 
        Format your response as a JSON object with the following structure:
        {
          "personalInfo": {
            "fullName": string,
            "email": string,
            "phone": string,
            "location": string
          },
          "professionalSummary": string,
          "skills": {
            "technical": [string],
            "soft": [string],
            "languages": [string]
          },
          "experience": [
            {
              "company": string,
              "position": string,
              "location": string,
              "startDate": string,
              "endDate": string,
              "current": boolean,
              "description": string
            }
          ],
          "education": [
            {
              "institution": string,
              "degree": string,
              "field": string,
              "startDate": string,
              "endDate": string,
              "gpa": string
            }
          ],
          "yearsOfExperience": string
        }`;
        userPrompt = `Parse the following resume text:\n\n${resumeText}`;
        break;
        
      case 'enhance':
        systemPrompt = `You are an AI assistant specialized in enhancing resume content.
        Analyze the provided resume data and suggest improvements for better impact and ATS optimization.
        Format your response as a JSON object with the following structure:
        {
          "enhancedSummary": string,
          "skillSuggestions": {
            "technical": [string],
            "soft": [string]
          },
          "experienceImprovements": [
            {
              "index": number,
              "improvedDescription": string
            }
          ]
        }`;
        userPrompt = `Enhance the following resume data:\n\n${resumeText}`;
        break;
        
      case 'improveExperience':
        systemPrompt = `You are an AI assistant specialized in enhancing resume work experience descriptions.
        Rewrite the provided job description to be more impactful, achievement-focused, and ATS-friendly.
        Use strong action verbs, quantify achievements when possible, and focus on relevant skills and accomplishments.
        Your response should only contain the improved description as a string.`;
        userPrompt = `Improve this work experience description for a ${JSON.parse(resumeText).position} role at ${JSON.parse(resumeText).company}:\n\n${JSON.parse(resumeText).description}`;
        break;
        
      case 'jobMarketInsights':
        systemPrompt = `You are an AI assistant providing job market insights based on skills and experience.
        Analyze the provided skills and experience level to provide insights about job market demand,
        salary expectations, and career improvement recommendations.
        Format your response as a JSON object with the following structure:
        {
          "demandScore": number,
          "demandAnalysis": string,
          "salaryRange": string,
          "salaryAnalysis": string,
          "recommendations": [string],
          "trendingSkills": [string]
        }`;
        userPrompt = `Provide job market insights for a candidate with these skills and experience:\n\n${resumeText}`;
        break;
        
      default:
        systemPrompt = `You are an AI assistant analyzing resume data.`;
        userPrompt = `Analyze the following resume data:\n\n${resumeText}`;
    }
    
    // Call OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
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
    
    const responseContent = response.data.choices[0].message.content;
    
    // Return response as parsed JSON for most types, or as raw string for specific types
    if (type === 'improveExperience') {
      return { improvedDescription: responseContent.trim() };
    } else {
      try {
        return JSON.parse(responseContent);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.log('Raw response:', responseContent);
        
        return {
          error: 'Invalid API response format',
          rawResponse: responseContent
        };
      }
    }
  } catch (error) {
    console.error('Error in getOpenAIAnalysis:', error);
    throw error;
  }
};

/**
 * Check if the required API configs are set
 * @returns {boolean} - Whether the API is properly configured
 */
export const isOpenAIConfigured = () => {
  return !!process.env.REACT_APP_OPENAI_API_KEY;
};

// Create a default export with all functions
const openAIService = {
  analyzeCandidate,
  getOpenAIAnalysis,
  isOpenAIConfigured
};

export default openAIService;