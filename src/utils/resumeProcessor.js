// src/utils/resumeProcessor.js
import { supabase } from './supabaseClient';
import axios from 'axios';
import * as pdfjs from 'pdfjs-dist';

// Set worker path for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Extracts text content from a PDF or Word document
 * @param {File} file - The uploaded file
 * @returns {Promise<string>} - Extracted text content
 */
export const extractTextFromFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        let text = '';
        const fileType = file.type;
        
        if (fileType === 'application/pdf') {
          // For PDF files, use PDF.js
          const typedArray = new Uint8Array(event.target.result);
          try {
            const pdf = await pdfjs.getDocument(typedArray).promise;
            let finalText = '';
            
            // Extract text from each page
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              finalText += pageText + '\n\n';
            }
            
            text = finalText;
          } catch (pdfError) {
            console.error('PDF parsing error:', pdfError);
            // Fallback if PDF.js fails
            text = `[Could not parse PDF content from ${file.name}. Error: ${pdfError.message}]`;
          }
        } else if (fileType.includes('word') || fileType.includes('document')) {
          // For DOC/DOCX files, use a simple text extraction
          // In a real app, you would use mammoth.js or similar
          text = await event.target.result;
        } else {
          // For plain text files
          text = event.target.result;
        }
        
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    // Read as text for simple formats, or as ArrayBuffer for binary formats like PDF
    if (file.type === 'application/pdf') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
};

/**
 * Saves the uploaded resume file to Supabase storage
 * @param {File} file - The resume file
 * @param {string} userId - The user's ID
 * @returns {Promise<string>} - The public URL of the stored file
 */
export const saveResumeFile = async (file, userId) => {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `public/${userId}/${fileName}`;
    
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error saving resume file:', error);
    throw error;
  }
};

/**
 * Analyze resume text with OpenAI to extract structured information
 * @param {string} resumeText - Text content of the resume
 * @returns {Promise<Object>} - Structured resume data
 */
export const analyzeResumeWithAI = async (resumeText) => {
  try {
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing');
    }
    
    const systemPrompt = `You are an AI assistant specialized in parsing resumes. 
    Extract structured information from the provided resume text. 
    Focus on extracting skills, education, work experience, and personal information.
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
      "yearsOfExperience": string (estimated years of experience based on work history)
    }`;
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse the following resume: ${resumeText}` }
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
    return JSON.parse(responseContent);
  } catch (error) {
    console.error('Error analyzing resume with AI:', error);
    throw error;
  }
};

/**
 * Match a candidate resume to a job posting using OpenAI
 * @param {Object} resumeData - Structured resume data
 * @param {Object} jobData - Job posting data
 * @returns {Promise<Object>} - Match analysis
 */
export const matchResumeToJob = async (resumeData, jobData) => {
  try {
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing');
    }
    
    const systemPrompt = `You are an AI recruitment assistant that evaluates how well a candidate's resume matches a job posting.
    Analyze the candidate resume and job description provided.
    Score the match based on:
    1. Skills match (required and preferred skills)
    2. Experience relevance
    3. Education fit
    4. Overall suitability
    
    Format your response as a JSON object with the following structure:
    {
      "matchPercentage": number (0-100, overall match score),
      "summary": string (1-2 sentence evaluation),
      "requiredSkillsMatch": number (0-100, percentage of required skills matched),
      "preferredSkillsMatch": number (0-100, percentage of preferred skills matched),
      "matchingSkills": [string] (list of skills the candidate has that match the job),
      "missingRequiredSkills": [string] (list of required skills the candidate lacks),
      "experienceRelevance": number (0-100, how relevant the experience is),
      "experienceAnalysis": string (brief analysis of experience),
      "strengths": [string] (3-5 candidate strengths for this role),
      "weaknesses": [string] (3-5 areas where the candidate might not be a fit),
      "suggestedInterviewQuestions": [string] (3-5 tailored interview questions)
    }`;
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Match this candidate to the job:\nRESUME DATA: ${JSON.stringify(resumeData)}\nJOB POSTING: ${JSON.stringify(jobData)}` }
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
    return JSON.parse(responseContent);
  } catch (error) {
    console.error('Error matching resume to job:', error);
    throw error;
  }
};

/**
 * Process a resume upload, extract text, analyze with AI, and save to database
 * @param {File} file - The resume file
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Processing results with AI analysis
 */
export const processResumeUpload = async (file, userId) => {
  try {
    // Extract text from file
    const resumeText = await extractTextFromFile(file);
    
    // Save file to storage
    const fileUrl = await saveResumeFile(file, userId);
    
    // Analyze with OpenAI
    const parsedResume = await analyzeResumeWithAI(resumeText);
    
    // Save to database
    const { data, error } = await supabase
      .from('resumes')
      .insert([
        {
          user_id: userId,
          file_url: fileUrl,
          original_filename: file.name,
          professional_summary: parsedResume.professionalSummary || '',
          skills: JSON.stringify(parsedResume.skills || {}),
          experience: JSON.stringify(parsedResume.experience || []),
          education: JSON.stringify(parsedResume.education || []),
          yearsOfExperience: parsedResume.yearsOfExperience || '',
          created_at: new Date()
        }
      ])
      .select();
    
    if (error) throw error;
    
    return {
      resumeData: data[0],
      parsedResume,
      success: true
    };
  } catch (error) {
    console.error('Error processing resume upload:', error);
    return {
      error: error.message,
      success: false
    };
  }
};

// Export all functions as a default object
const resumeProcessor = {
  extractTextFromFile,
  saveResumeFile,
  analyzeResumeWithAI,
  matchResumeToJob,
  processResumeUpload
};

export default resumeProcessor;