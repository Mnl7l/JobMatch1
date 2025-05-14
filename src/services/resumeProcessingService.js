// src/services/resumeProcessingService.js
import { supabase } from '../utils/supabaseClient';
import openAIService from '../utils/openAIService';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

class ResumeProcessingService {
  async extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const typedArray = new Uint8Array(event.target.result);
          const loadingTask = pdfjsLib.getDocument(typedArray);
          const pdf = await loadingTask.promise;
          
          let textContent = '';
          
          // Extract text from each page
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            textContent += strings.join(' ') + '\n';
          }
          
          resolve(textContent);
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = (error) => reject(error);
      fileReader.readAsArrayBuffer(file);
    });
  }
  
  async extractTextFromDOCX(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = (error) => reject(error);
      fileReader.readAsArrayBuffer(file);
    });
  }
  
  async extractTextFromFile(file) {
    const fileType = file.type;
    
    if (fileType === 'application/pdf') {
      return this.extractTextFromPDF(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword') {
      return this.extractTextFromDOCX(file);
    } else {
      throw new Error('Unsupported file format. Please upload a PDF or Word document.');
    }
  }
  
  async processResume(file, userId) {
    try {
      // Extract text from resume file
      const resumeText = await this.extractTextFromFile(file);
      
      // Analyze resume text with OpenAI
      const parsedResume = await openAIService.analyzeResume(resumeText);
      
      // Save original file to storage
      const filePath = `resumes/${userId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('resume-files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get file URL
      const { data: urlData } = supabase.storage
        .from('resume-files')
        .getPublicUrl(filePath);
      
      // Prepare resume data for database
      const resumeData = {
        user_id: userId,
        file_url: urlData.publicUrl,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        skills: JSON.stringify({
          technical: parsedResume.skills?.technical || [],
          languages: parsedResume.skills?.languages || [],
          soft: parsedResume.skills?.soft || []
        }),
        education: JSON.stringify(parsedResume.education || []),
        experience: JSON.stringify(parsedResume.experience || []),
        yearsOfExperience: parsedResume.yearsOfExperience || '',
        created_at: new Date()
      };
      
      // Save parsed resume data to database
      const { data, error } = await supabase
        .from('resumes')
        .insert([resumeData])
        .select();
      
      if (error) throw error;
      
      return data[0];
    } catch (error) {
      console.error('Error processing resume:', error);
      throw error;
    }
  }
}

// Create an instance of ResumeProcessingService
const resumeProcessingServiceInstance = new ResumeProcessingService();

// Export the instance as the default export
export default resumeProcessingServiceInstance;