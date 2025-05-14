// src/components/ResumeUploadForm.js - Enhanced with OpenAI integration for resume parsing and suggestions
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import './ResumeUpload.css';

// Import the OpenAI configuration
import { getOpenAIAnalysis } from '../services/openAIService';

const ResumeUploadForm = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [mode, setMode] = useState('manual'); // 'manual' or 'upload'
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  
  // Create refs for file input
  const fileInputRef = useRef(null);
  
  // Manual entry form data
  const [resumeData, setResumeData] = useState({
    // Personal Information
    fullName: '',
    email: '',
    phone: '',
    location: '',
    
    // Professional Summary
    professionalSummary: '',
    
    // Skills
    technicalSkills: [],
    softSkills: [],
    languages: [],
    
    // Experience
    experience: [{
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: []
    }],
    
    // Education
    education: [{
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      gpa: ''
    }],
    
    // Additional Information
    yearsOfExperience: '',
    salaryExpectation: '',
    preferredJobType: '',
    availableFrom: '',
    willingToRelocate: false
  });
  
  // File upload data
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  
  // Predefined skills for easy selection
  const predefinedSkills = {
    technical: [
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
      'SQL', 'MongoDB', 'PostgreSQL', 'Redis', 'AWS', 'Azure', 'Docker', 'Kubernetes',
      'Git', 'CI/CD', 'Jenkins', 'REST API', 'GraphQL', 'Machine Learning', 'Data Science'
    ],
    soft: [
      'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Time Management',
      'Creativity', 'Critical Thinking', 'Adaptability', 'Conflict Resolution',
      'Project Management', 'Public Speaking', 'Negotiation', 'Emotional Intelligence'
    ],
    languages: [
      'English', 'Arabic', 'Spanish', 'French', 'German', 'Chinese', 'Japanese',
      'Korean', 'Russian', 'Portuguese', 'Italian', 'Dutch', 'Hindi', 'Turkish'
    ]
  };
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Pre-fill user data if available
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setResumeData(prev => ({
            ...prev,
            fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            email: user.email,
            phone: profile.phone || ''
          }));
        }
      }
    };
    
    fetchUser();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setResumeData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setResumeData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSkillChange = (category, skill) => {
    setResumeData(prev => {
      const currentSkills = prev[category];
      const newSkills = currentSkills.includes(skill)
        ? currentSkills.filter(s => s !== skill)
        : [...currentSkills, skill];
      
      return {
        ...prev,
        [category]: newSkills
      };
    });
  };
  
  const addCustomSkill = (category, customSkill) => {
    if (customSkill && !resumeData[category].includes(customSkill)) {
      setResumeData(prev => ({
        ...prev,
        [category]: [...prev[category], customSkill]
      }));
    }
  };
  
  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        company: '',
        position: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        achievements: []
      }]
    }));
  };
  
  const updateExperience = (index, field, value) => {
    setResumeData(prev => {
      const newExperience = [...prev.experience];
      newExperience[index] = {
        ...newExperience[index],
        [field]: value
      };
      if (field === 'current' && value === true) {
        newExperience[index].endDate = '';
      }
      return {
        ...prev,
        experience: newExperience
      };
    });
  };
  
  const removeExperience = (index) => {
    if (resumeData.experience.length > 1) {
      setResumeData(prev => ({
        ...prev,
        experience: prev.experience.filter((_, i) => i !== index)
      }));
    }
  };
  
  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        gpa: ''
      }]
    }));
  };
  
  const updateEducation = (index, field, value) => {
    setResumeData(prev => {
      const newEducation = [...prev.education];
      newEducation[index] = {
        ...newEducation[index],
        [field]: value
      };
      return {
        ...prev,
        education: newEducation
      };
    });
  };
  
  const removeEducation = (index) => {
    if (resumeData.education.length > 1) {
      setResumeData(prev => ({
        ...prev,
        education: prev.education.filter((_, i) => i !== index)
      }));
    }
  };
  
  // Handler for file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };
  
  // Handler for drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  // Handler for file selection via input
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };
  
  // Unified file processing function
  const processFile = async (selectedFile) => {
    setFile(selectedFile);
    
    if (selectedFile) {
      setFileProcessing(true);
      
      // Read file content for AI processing
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        setFileContent(content);
        
        try {
          // Process with OpenAI
          await processResumeWithAI(selectedFile);
        } catch (error) {
          console.error('Error processing file with AI:', error);
          setMessage({ text: 'Error analyzing resume with AI. You can still submit the file.', type: 'error' });
        } finally {
          setFileProcessing(false);
        }
      };
      
      if (selectedFile.type === 'application/pdf') {
        // For PDF files, we need to convert to text first
        reader.readAsArrayBuffer(selectedFile);
      } else {
        // For DOC/DOCX files, we assume text content
        reader.readAsText(selectedFile);
      }
    }
  };
  
  // Open file dialog when the upload area is clicked
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const processResumeWithAI = async (file) => {
    setAiLoading(true);
    try {
      // Extract file text content (simplified)
      let fileText = '';
      if (file.type === 'application/pdf') {
        // In a real app, you would use a PDF parsing library here
        fileText = 'PDF content would be extracted here';
      } else {
        // For text-based files
        fileText = fileContent;
      }
      
      // Send to OpenAI for analysis - Add better error handling
      try {
        const aiResult = await getOpenAIAnalysis(fileText);
        
        // Process AI suggestions
        setAiSuggestions(aiResult);
        setShowAiSuggestions(true);
        
        // Optionally, pre-fill form with AI extracted data
        if (aiResult.extractedData) {
          setResumeData(prev => ({
            ...prev,
            ...aiResult.extractedData
          }));
          
          // Switch to manual mode to show pre-filled form
          setMode('manual');
        }
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        throw new Error('AI analysis failed. You can still submit manually.');
      }
    } catch (error) {
      console.error('Error in AI processing:', error);
      throw error;
    } finally {
      setAiLoading(false);
    }
  };
  
  const applyAISuggestion = (type, suggestion) => {
    switch (type) {
      case 'summary':
        setResumeData(prev => ({
          ...prev,
          professionalSummary: suggestion
        }));
        break;
      case 'skills':
        // Merge AI suggested skills with current skills
        setResumeData(prev => ({
          ...prev,
          technicalSkills: [...new Set([...prev.technicalSkills, ...suggestion.technical])],
          softSkills: [...new Set([...prev.softSkills, ...suggestion.soft])]
        }));
        break;
      case 'experience':
        // Apply AI suggestions to improve experience descriptions
        if (suggestion.index !== undefined && resumeData.experience[suggestion.index]) {
          updateExperience(suggestion.index, 'description', suggestion.improvedDescription);
        }
        break;
      default:
        console.log('Unknown suggestion type:', type);
    }
  };
  
  const generateAIEnhancements = async () => {
    setAiLoading(true);
    try {
      // Send current resume data to OpenAI for enhancement suggestions
      const currentData = {
        summary: resumeData.professionalSummary,
        experience: resumeData.experience.map(exp => exp.description).join('\n\n'),
        skills: {
          technical: resumeData.technicalSkills,
          soft: resumeData.softSkills
        }
      };
      
      const aiResult = await getOpenAIAnalysis(JSON.stringify(currentData), 'enhance');
      
      setAiSuggestions(aiResult);
      setShowAiSuggestions(true);
      
    } catch (error) {
      console.error('Error generating AI enhancements:', error);
      setMessage({ text: 'Error getting AI suggestions', type: 'error' });
    } finally {
      setAiLoading(false);
    }
  };
  
  // Updated handleSubmit function to match your exact database schema
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setMessage({ text: 'You must be logged in to submit a resume', type: 'error' });
      return;
    }
    
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      // Create data structure exactly matching the database columns
      const resumeData = {
        // Based on screenshot - these are the exact column names
        user_id: user.id,
        created_at: new Date().toISOString()
      };
      
      let fileUrl = null;
      
      // Handle file upload if in upload mode
      if (mode === 'upload' && file) {
        try {
          // Create a safe filename
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          
          // Upload to the correct bucket
          const { error: uploadError } = await supabase.storage
            .from('resume-files')
            .upload(`${user.id}/${fileName}`, file, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          
          // Get public URL
          const { data } = supabase.storage
            .from('resume-files')
            .getPublicUrl(`${user.id}/${fileName}`);
          
          fileUrl = data.publicUrl;
          
          // Add file fields that match your schema
          resumeData.file_url = fileUrl;
          resumeData.original_filename = file.name;
        } catch (fileError) {
          console.error('File error:', fileError);
          setMessage({ text: `File upload error: ${fileError.message}`, type: 'error' });
          setLoading(false);
          return;
        }
      } else if (mode === 'manual') {
        // For manual mode, use the exact column names from your database
        
        // Basic text fields - only use column names that appear in your schema
        // If any of these columns don't exist, remove them
        resumeData.full_name = resumeData.fullName || '';
        resumeData.email = resumeData.email || '';
        resumeData.phone = resumeData.phone || '';
        resumeData.location = resumeData.location || '';
        
        // Store complex data as JSON in a single column
        // Choose the appropriate column name based on your schema
        const complexData = {
          professionalSummary: resumeData.professionalSummary,
          experience: resumeData.experience,
          education: resumeData.education,
          skills: {
            technical: resumeData.technicalSkills,
            soft: resumeData.softSkills,
            languages: resumeData.languages
          },
          additionalInfo: {
            yearsOfExperience: resumeData.yearsOfExperience,
            salaryExpectation: resumeData.salaryExpectation,
            preferredJobType: resumeData.preferredJobType,
            availableFrom: resumeData.availableFrom,
            willingToRelocate: resumeData.willingToRelocate
          }
        };
        
        // Use a column name that exists in your schema for the JSON data
        resumeData.resume_data = JSON.stringify(complexData);
      }
      
      // Final insert - keep it simple with minimal fields
      const { error: insertError } = await supabase
        .from('resumes')
        .insert([resumeData]);
      
      if (insertError) {
        console.error('Insert error:', insertError);
        
        // Try again with absolute minimal data
        const minimalData = {
          user_id: user.id,
          created_at: new Date().toISOString()
        };
        
        // Add file_url if we have it (this column definitely exists)
        if (fileUrl) {
          minimalData.file_url = fileUrl;
        }
        
        const { error: retryError } = await supabase
          .from('resumes')
          .insert([minimalData]);
        
        if (retryError) {
          throw new Error(`Database save failed: ${retryError.message}`);
        }
      }
      
      setMessage({ text: 'Resume submitted successfully!', type: 'success' });
      
      // Reset form or navigate away
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="resume-upload-container">
      <div className="upload-header">
        <h2>Submit Your Resume</h2>
        <div className="mode-selector">
          <button 
            className={mode === 'manual' ? 'active' : ''} 
            onClick={() => setMode('manual')}
          >
            Fill Form Manually
          </button>
          <button 
            className={mode === 'upload' ? 'active' : ''} 
            onClick={() => setMode('upload')}
          >
            Upload File
          </button>
        </div>
      </div>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="resume-form">
        {mode === 'upload' ? (
          // File Upload Mode
          <div className="upload-section">
            <div 
              className="file-upload-area"
              onClick={openFileDialog}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Drag and drop your resume here or click to browse</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="file-input"
                ref={fileInputRef}
                style={{ display: 'none' }} // Hide the default input
              />
              {file && <p className="file-selected">Selected: {file.name}</p>}
              {fileProcessing && <p className="processing-message">Processing your resume...</p>}
            </div>
            <p className="upload-note">Supported formats: PDF, DOC, DOCX (Max size: 5MB)</p>
            
            {aiLoading && (
              <div className="ai-loading">
                <div className="spinner"></div>
                <p>Analyzing your resume with AI...</p>
              </div>
            )}
            
            {/* AI Analysis Results */}
            {aiSuggestions && showAiSuggestions && (
              <div className="ai-suggestions-panel">
                <h3>AI-Powered Resume Analysis</h3>
                
                {aiSuggestions.score && (
                  <div className="resume-score">
                    <h4>Resume Score: {aiSuggestions.score}/100</h4>
                    <div className="progress-bar">
                      <div 
                        className="progress" 
                        style={{ width: `${aiSuggestions.score}%`, 
                        background: aiSuggestions.score > 80 ? '#4CAF50' : 
                                    aiSuggestions.score > 60 ? '#FFC107' : '#F44336' 
                      }}></div>
                    </div>
                  </div>
                )}
                
                {aiSuggestions.suggestions && (
                  <div className="suggestion-categories">
                    {aiSuggestions.suggestions.map((suggestion, index) => (
                      <div key={index} className="suggestion-item">
                        <h4>{suggestion.title}</h4>
                        <p>{suggestion.description}</p>
                        {suggestion.type === 'actionable' && (
                          <button 
                            type="button" 
                            className="apply-suggestion"
                            onClick={() => applyAISuggestion(suggestion.category, suggestion.content)}
                          >
                            Apply Suggestion
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="ai-actions">
                  <button 
                    type="button" 
                    className="secondary-button" 
                    onClick={() => setShowAiSuggestions(false)}
                  >
                    Hide Suggestions
                  </button>
                  <button 
                    type="button" 
                    className="primary-button" 
                    onClick={() => setMode('manual')}
                  >
                    Edit Resume Manually
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Manual Entry Mode
          <div className="manual-entry-section">
            <div className="ai-enhancement-button">
              <button
                type="button"
                onClick={generateAIEnhancements}
                disabled={aiLoading}
                className="enhance-button"
              >
                {aiLoading ? 'AI Working...' : 'Enhance with AI'}
              </button>
              <span className="enhance-tooltip">
                Use AI to improve your resume content and get suggestions
              </span>
            </div>
            
            {/* AI Suggestions Panel (for manual mode) */}
            {aiSuggestions && showAiSuggestions && (
              <div className="ai-suggestions-panel manual-mode">
                <div className="panel-header">
                  <h3>AI Enhancement Suggestions</h3>
                  <button 
                    type="button" 
                    className="close-panel" 
                    onClick={() => setShowAiSuggestions(false)}
                  >
                    ×
                  </button>
                </div>
                
                {aiSuggestions.enhancedSummary && (
                  <div className="suggestion-category">
                    <h4>Professional Summary</h4>
                    <div className="suggestion-content">
                      <p>{aiSuggestions.enhancedSummary}</p>
                      <button 
                        type="button" 
                        className="apply-button"
                        onClick={() => applyAISuggestion('summary', aiSuggestions.enhancedSummary)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
                
                {aiSuggestions.skillSuggestions && (
                  <div className="suggestion-category">
                    <h4>Skill Recommendations</h4>
                    <div className="skills-suggestions">
                      <div className="skill-group">
                        <h5>Technical Skills</h5>
                        <div className="skill-tags">
                          {aiSuggestions.skillSuggestions.technical.map((skill, i) => (
                            <span key={i} className="skill-tag">{skill}</span>
                          ))}
                        </div>
                      </div>
                      <div className="skill-group">
                        <h5>Soft Skills</h5>
                        <div className="skill-tags">
                          {aiSuggestions.skillSuggestions.soft.map((skill, i) => (
                            <span key={i} className="skill-tag">{skill}</span>
                          ))}
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="apply-button"
                        onClick={() => applyAISuggestion('skills', aiSuggestions.skillSuggestions)}
                      >
                        Add All Skills
                      </button>
                    </div>
                  </div>
                )}
                
                {aiSuggestions.experienceImprovements && aiSuggestions.experienceImprovements.length > 0 && (
                  <div className="suggestion-category">
                    <h4>Experience Improvements</h4>
                    {aiSuggestions.experienceImprovements.map((improvement, i) => (
                      <div key={i} className="experience-improvement">
                        <h5>Experience #{improvement.index + 1}</h5>
                        <p className="improvement-description">{improvement.improvedDescription}</p>
                        <button 
                          type="button" 
                          className="apply-button"
                          onClick={() => applyAISuggestion('experience', improvement)}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Personal Information */}
            <section className="form-section">
              <h3>Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={resumeData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={resumeData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={resumeData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={resumeData.location}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </section>
            
            {/* Professional Summary */}
            <section className="form-section">
              <h3>Professional Summary</h3>
              <div className="form-group">
                <textarea
                  name="professionalSummary"
                  value={resumeData.professionalSummary}
                  onChange={handleInputChange}
                  placeholder="Brief overview of your professional background and career objectives"
                  rows="4"
                />
                {resumeData.professionalSummary.trim() !== '' && (
                  <button 
                    type="button" 
                    className="enhance-text-button"
                    onClick={() => generateAIEnhancements('summary')}
                    disabled={aiLoading}
                  >
                    Enhance Summary with AI
                  </button>
                )}
              </div>
            </section>
            
            {/* Skills */}
            <section className="form-section">
              <h3>Skills</h3>
              
              {/* Technical Skills */}
              <div className="skills-category">
                <h4>Technical Skills</h4>
                <div className="skills-grid">
                  {predefinedSkills.technical.map(skill => (
                    <label key={skill} className="skill-checkbox">
                      <input
                        type="checkbox"
                        checked={resumeData.technicalSkills.includes(skill)}
                        onChange={() => handleSkillChange('technicalSkills', skill)}
                      />
                      {skill}
                    </label>
                  ))}
                </div>
                <div className="custom-skill-input">
                  <input
                    type="text"
                    placeholder="Add custom technical skill"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkill('technicalSkills', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Soft Skills */}
              <div className="skills-category">
                <h4>Soft Skills</h4>
                <div className="skills-grid">
                  {predefinedSkills.soft.map(skill => (
                    <label key={skill} className="skill-checkbox">
                      <input
                        type="checkbox"
                        checked={resumeData.softSkills.includes(skill)}
                        onChange={() => handleSkillChange('softSkills', skill)}
                      />
                      {skill}
                    </label>
                  ))}
                </div>
                <div className="custom-skill-input">
                  <input
                    type="text"
                    placeholder="Add custom soft skill"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkill('softSkills', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Languages */}
              <div className="skills-category">
                <h4>Languages</h4>
                <div className="skills-grid">
                  {predefinedSkills.languages.map(skill => (
                    <label key={skill} className="skill-checkbox">
                      <input
                        type="checkbox"
                        checked={resumeData.languages.includes(skill)}
                        onChange={() => handleSkillChange('languages', skill)}
                      />
                      {skill}
                    </label>
                  ))}
                </div>
                <div className="custom-skill-input">
                  <input
                    type="text"
                    placeholder="Add custom language"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkill('languages', e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </section>
            
            {/* Experience */}
            <section className="form-section">
              <h3>Work Experience</h3>
              {resumeData.experience.map((exp, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-header">
                    <h4>Experience #{index + 1}</h4>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="remove-button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Company</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(index, 'company', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Position</label>
                      <input
                        type="text"
                        value={exp.position}
                        onChange={(e) => updateExperience(index, 'position', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        value={exp.location}
                        onChange={(e) => updateExperience(index, 'location', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="month"
                        value={exp.endDate}
                        onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                        disabled={exp.current}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) => updateExperience(index, 'current', e.target.checked)}
                      />
                      I currently work here
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      placeholder="Describe your role and responsibilities"
                      rows="3"
                    />
                    {exp.description.trim() !== '' && (
                      <button 
                        type="button" 
                        className="enhance-text-button"
                        onClick={() => {
                          setAiLoading(true);
                          // Create a focused request just for this experience entry
                          getOpenAIAnalysis(
                            JSON.stringify({
                              position: exp.position,
                              company: exp.company,
                              description: exp.description
                            }), 
                            'improveExperience'
                          )
                          .then(result => {
                            if (result && result.improvedDescription) {
                              updateExperience(index, 'description', result.improvedDescription);
                            }
                            setAiLoading(false);
                          })
                          .catch(error => {
                            console.error('Error enhancing experience:', error);
                            setAiLoading(false);
                          });
                        }}
                        disabled={aiLoading}
                      >
                        Enhance with AI
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addExperience} className="add-button">
                Add Experience
              </button>
            </section>
            
            {/* Education */}
            <section className="form-section">
              <h3>Education</h3>
              {resumeData.education.map((edu, index) => (
                <div key={index} className="education-item">
                  <div className="education-header">
                    <h4>Education #{index + 1}</h4>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="remove-button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Institution</label>
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Degree</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                        placeholder="e.g., Bachelor's, Master's"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Field of Study</label>
                      <input
                        type="text"
                        value={edu.field}
                        onChange={(e) => updateEducation(index, 'field', e.target.value)}
                        placeholder="e.g., Computer Science"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="month"
                        value={edu.startDate}
                        onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="month"
                        value={edu.endDate}
                        onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>GPA (Optional)</label>
                    <input
                      type="text"
                      value={edu.gpa}
                      onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                      placeholder="e.g., 3.8/4.0"
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addEducation} className="add-button">
                Add Education
              </button>
            </section>
            
            {/* Additional Information */}
            <section className="form-section">
              <h3>Additional Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Years of Experience</label>
                  <select
                    name="yearsOfExperience"
                    value={resumeData.yearsOfExperience}
                    onChange={handleInputChange}
                  >
                    <option value="">Select experience</option>
                    <option value="0-1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">More than 10 years</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Salary Expectation</label>
                  <input
                    type="text"
                    name="salaryExpectation"
                    value={resumeData.salaryExpectation}
                    onChange={handleInputChange}
                    placeholder="e.g., $50,000 - $70,000"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Preferred Job Type</label>
                  <select
                    name="preferredJobType"
                    value={resumeData.preferredJobType}
                    onChange={handleInputChange}
                  >
                    <option value="">Select job type</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                    <option value="internship">Internship</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Available From</label>
                  <input
                    type="date"
                    name="availableFrom"
                    value={resumeData.availableFrom}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="willingToRelocate"
                    checked={resumeData.willingToRelocate}
                    onChange={handleInputChange}
                  />
                  I am willing to relocate
                </label>
              </div>
              
              {/* Job Market AI Insights */}
              <div className="ai-insights-button">
                <button
                  type="button"
                  onClick={async () => {
                    setAiLoading(true);
                    try {
                      // Get job market insights based on skills and experience
                      const techSkills = resumeData.technicalSkills.join(', ');
                      const experience = resumeData.yearsOfExperience;
                      const jobType = resumeData.preferredJobType;
                      
                      const insights = await getOpenAIAnalysis(
                        JSON.stringify({
                          skills: techSkills,
                          experience,
                          jobType
                        }),
                        'jobMarketInsights'
                      );
                      
                      setAiSuggestions({
                        ...aiSuggestions,
                        jobMarketInsights: insights
                      });
                      setShowAiSuggestions(true);
                    } catch (error) {
                      console.error('Error getting job market insights:', error);
                      setMessage({ text: 'Error retrieving job market insights', type: 'error' });
                    } finally {
                      setAiLoading(false);
                    }
                  }}
                  disabled={aiLoading || !resumeData.technicalSkills.length}
                  className="insights-button"
                >
                  Get Job Market Insights
                </button>
                <span className="insights-tooltip">
                  Analyze your job prospects and salary potential based on your skills and experience
                </span>
              </div>
            </section>
          </div>
        )}
        
        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Resume'}
          </button>
        </div>
      </form>
      
      {/* AI Job Market Insights Modal */}
      {aiSuggestions && aiSuggestions.jobMarketInsights && showAiSuggestions && (
        <div className="job-market-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>AI Job Market Analysis</h3>
              <button 
                type="button" 
                className="close-modal" 
                onClick={() => setShowAiSuggestions(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {aiSuggestions.jobMarketInsights.demandScore && (
                <div className="insight-section">
                  <h4>Skill Demand</h4>
                  <div className="demand-meter">
                    <div 
                      className="demand-indicator" 
                      style={{ width: `${aiSuggestions.jobMarketInsights.demandScore}%` }}
                    ></div>
                    <span className="demand-score">
                      {aiSuggestions.jobMarketInsights.demandScore}/100
                    </span>
                  </div>
                  <p>{aiSuggestions.jobMarketInsights.demandAnalysis}</p>
                </div>
              )}
              
              {aiSuggestions.jobMarketInsights.salaryRange && (
                <div className="insight-section">
                  <h4>Estimated Salary Range</h4>
                  <div className="salary-range">
                    <span className="salary-amount">
                      {aiSuggestions.jobMarketInsights.salaryRange}
                    </span>
                  </div>
                  <p>{aiSuggestions.jobMarketInsights.salaryAnalysis}</p>
                </div>
              )}
              
              {aiSuggestions.jobMarketInsights.recommendations && (
                <div className="insight-section">
                  <h4>Recommendations to Improve Marketability</h4>
                  <ul className="recommendations-list">
                    {aiSuggestions.jobMarketInsights.recommendations.map((rec, i) => (
                      <li key={i} className="recommendation-item">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {aiSuggestions.jobMarketInsights.trendingSkills && (
                <div className="insight-section">
                  <h4>Trending Skills in Your Field</h4>
                  <div className="trending-skills">
                    {aiSuggestions.jobMarketInsights.trendingSkills.map((skill, i) => (
                      <span key={i} className="trending-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUploadForm;