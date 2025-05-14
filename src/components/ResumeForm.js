import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import './ResumeForm.css';
import './Matching.css';

const ResumeForm = () => {
  const [user, setUser] = useState(null);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form data state
  const [formData, setFormData] = useState({
    // Education section
    education: [{ 
      institution: '', 
      degree: '', 
      field: '', 
      startDate: '', 
      endDate: '', 
      current: false 
    }],
    
    // Experience section
    experience: [{ 
      company: '', 
      position: '', 
      location: '', 
      startDate: '', 
      endDate: '', 
      current: false,
      description: '' 
    }],
    
    // Skills section - using a structured approach
    skills: {
      technical: [],
      languages: [],
      soft: []
    },
    
    // Predefined fields for better matching
    yearsOfExperience: '',
    preferredLocation: '',
    salaryExpectation: '',
    jobType: '',  // full-time, part-time, contract, etc.
    availableFrom: '',
    willingToRelocate: false
  });

  // Predefined skill options for better matching
  const skillOptions = {
    technical: [
      'JavaScript', 'React', 'Angular', 'Vue.js', 'HTML', 'CSS', 
      'TypeScript', 'Node.js', 'Express', 'Python', 'Django', 
      'Flask', 'Java', 'Spring', 'C#', '.NET', 'SQL', 'PostgreSQL', 
      'MongoDB', 'Redis', 'AWS', 'Azure', 'Google Cloud',
      'Docker', 'Kubernetes', 'Redux', 'UI/UX Design', 'Figma', 'Adobe XD'
    ],
    languages: [
      'English', 'Arabic', 'Spanish', 'French', 'German', 'Chinese', 
      'Japanese', 'Russian', 'Portuguese', 'Italian'
    ],
    soft: [
      'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 
      'Time Management', 'Creativity', 'Critical Thinking', 
      'Adaptability', 'Conflict Resolution', 'Emotional Intelligence'
    ]
  };

  // Experience options - align with JobForm
  const experienceOptions = [
    '0-1', '1-3', '3-5', '5-10', '10+'
  ];

  // Job type options
  const jobTypeOptions = [
    'Full-time', 'Part-time', 'Contract', 'Freelance', 
    'Remote', 'Internship', 'Hybrid'
  ];

  useEffect(() => {
    const fetchUserAndResume = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser(user);
          
          // Get resume data if exists
          const { data, error } = await supabase
            .from('resumes')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          // If resume data exists, populate the form
          if (data && !error) {
            setResume(data);
            
            // Parse the JSON data if stored as strings
            const parsedEducation = data.education ? 
              (typeof data.education === 'string' ? 
                JSON.parse(data.education) : data.education) : 
              formData.education;
              
            const parsedExperience = data.experience ? 
              (typeof data.experience === 'string' ? 
                JSON.parse(data.experience) : data.experience) : 
              formData.experience;
              
            const parsedSkills = data.skills ? 
              (typeof data.skills === 'string' ? 
                JSON.parse(data.skills) : data.skills) : 
              formData.skills;
              
            // Set form data with existing resume data
            setFormData({
              education: parsedEducation,
              experience: parsedExperience,
              skills: parsedSkills,
              yearsOfExperience: data.yearsOfExperience || '',
              preferredLocation: data.preferredLocation || '',
              salaryExpectation: data.salaryExpectation || '',
              jobType: data.jobType || '',
              availableFrom: data.availableFrom || '',
              willingToRelocate: data.willingToRelocate || false
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user and resume:', error.message);
        setErrorMessage('Failed to load resume data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndResume();
  }, [formData.education, formData.experience, formData.skills]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle other inputs
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle education field changes
  const handleEducationChange = (index, field, value) => {
    const updatedEducation = [...formData.education];
    
    if (field === 'current' && value === true) {
      updatedEducation[index].endDate = ''; // Clear end date if current is checked
    }
    
    updatedEducation[index][field] = value;
    
    setFormData(prev => ({
      ...prev,
      education: updatedEducation
    }));
  };

  // Add a new education entry
  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education, 
        { 
          institution: '', 
          degree: '', 
          field: '', 
          startDate: '', 
          endDate: '', 
          current: false 
        }
      ]
    }));
  };

  // Remove an education entry
  const removeEducation = (index) => {
    if (formData.education.length === 1) {
      return; // Keep at least one education field
    }
    
    const updatedEducation = formData.education.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      education: updatedEducation
    }));
  };

  // Handle experience field changes
  const handleExperienceChange = (index, field, value) => {
    const updatedExperience = [...formData.experience];
    
    if (field === 'current' && value === true) {
      updatedExperience[index].endDate = ''; // Clear end date if current is checked
    }
    
    updatedExperience[index][field] = value;
    
    setFormData(prev => ({
      ...prev,
      experience: updatedExperience
    }));
  };

  // Add a new experience entry
  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience, 
        { 
          company: '', 
          position: '', 
          location: '', 
          startDate: '', 
          endDate: '', 
          current: false,
          description: '' 
        }
      ]
    }));
  };

  // Remove an experience entry
  const removeExperience = (index) => {
    if (formData.experience.length === 1) {
      return; // Keep at least one experience field
    }
    
    const updatedExperience = formData.experience.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      experience: updatedExperience
    }));
  };

  // Handle skill selection
  const handleSkillToggle = (category, skill) => {
    setFormData(prev => {
      const currentSkills = [...prev.skills[category]];
      
      // If skill is already selected, remove it; otherwise add it
      if (currentSkills.includes(skill)) {
        return {
          ...prev,
          skills: {
            ...prev.skills,
            [category]: currentSkills.filter(s => s !== skill)
          }
        };
      } else {
        return {
          ...prev,
          skills: {
            ...prev.skills,
            [category]: [...currentSkills, skill]
          }
        };
      }
    });
  };

  // Add a custom skill
  const addCustomSkill = (category, customSkill) => {
    if (!customSkill.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: [...prev.skills[category], customSkill.trim()]
      }
    }));
    
    // Clear the input field
    document.getElementById(`custom-${category}-skill`).value = '';
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setSaving(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      const resumeData = {
        user_id: user.id,
        education: JSON.stringify(formData.education),
        experience: JSON.stringify(formData.experience),
        skills: JSON.stringify(formData.skills),
        yearsOfExperience: formData.yearsOfExperience,
        preferredLocation: formData.preferredLocation,
        salaryExpectation: formData.salaryExpectation,
        jobType: formData.jobType,
        availableFrom: formData.availableFrom,
        willingToRelocate: formData.willingToRelocate,
        updated_at: new Date()
      };
      
      let error;
      
      if (resume) {
        // Update existing resume
        const { error: updateError } = await supabase
          .from('resumes')
          .update(resumeData)
          .eq('id', resume.id);
          
        error = updateError;
      } else {
        // Create new resume
        const { error: insertError } = await supabase
          .from('resumes')
          .insert([{
            ...resumeData,
            created_at: new Date()
          }]);
          
        error = insertError;
      }
      
      if (error) throw error;
      
      setSuccessMessage('Resume saved successfully!');
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (error) {
      console.error('Error saving resume:', error.message);
      setErrorMessage(`Error saving resume: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading resume form...</div>;
  }

  if (!user) {
    return (
      <div className="not-logged-in">
        <p>Please log in to create or edit your resume.</p>
      </div>
    );
  }

  return (
    <div className="resume-form-container">
      <h2>Your Professional Profile</h2>
      <p>Complete this form to create a detailed profile that helps match you with the right jobs.</p>
      
      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}
      
      {errorMessage && (
        <div className="error-message">{errorMessage}</div>
      )}
      
      <form onSubmit={handleSubmit} className="resume-form">
        {/* General Information */}
        <div className="form-section">
          <h3>General Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="yearsOfExperience">Total Years of Experience</label>
              <select
                id="yearsOfExperience"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">Select experience</option>
                {experienceOptions.map(exp => (
                  <option key={exp} value={exp}>{exp} years</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="jobType">Preferred Job Type</label>
              <select
                id="jobType"
                name="jobType"
                value={formData.jobType}
                onChange={handleChange}
                className="form-control"
              >
                <option value="">Select job type</option>
                {jobTypeOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="preferredLocation">Preferred Location</label>
              <input
                id="preferredLocation"
                name="preferredLocation"
                type="text"
                value={formData.preferredLocation}
                onChange={handleChange}
                className="form-control"
                placeholder="City, Country or Remote"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="salaryExpectation">Salary Expectation (annually)</label>
              <input
                id="salaryExpectation"
                name="salaryExpectation"
                type="text"
                value={formData.salaryExpectation}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. $50,000 - $70,000"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="availableFrom">Available From</label>
              <input
                id="availableFrom"
                name="availableFrom"
                type="date"
                value={formData.availableFrom}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="willingToRelocate"
                  checked={formData.willingToRelocate}
                  onChange={handleChange}
                />
                Willing to Relocate
              </label>
            </div>
          </div>
        </div>
        
        {/* Education Section */}
        <div className="form-section">
          <h3>Education</h3>
          
          {formData.education.map((edu, index) => (
            <div key={index} className="education-entry">
              <h4>Education #{index + 1}</h4>
              
              {index > 0 && (
                <button 
                  type="button" 
                  className="remove-btn"
                  onClick={() => removeEducation(index)}
                >
                  Remove
                </button>
              )}
              
              <div className="form-row">
                <div className="form-group">
                  <label>Institution</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                    className="form-control"
                    placeholder="University or School Name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Degree</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                    className="form-control"
                    placeholder="e.g. Bachelor's, Master's, PhD"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Field of Study</label>
                <input
                  type="text"
                  value={edu.field}
                  onChange={(e) => handleEducationChange(index, 'field', e.target.value)}
                  className="form-control"
                  placeholder="e.g. Computer Science, Business Administration"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={edu.startDate}
                    onChange={(e) => handleEducationChange(index, 'startDate', e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={edu.endDate}
                    onChange={(e) => handleEducationChange(index, 'endDate', e.target.value)}
                    className="form-control"
                    disabled={edu.current}
                    required={!edu.current}
                  />
                </div>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={edu.current}
                    onChange={(e) => handleEducationChange(index, 'current', e.target.checked)}
                  />
                  Currently Studying
                </label>
              </div>
            </div>
          ))}
          
          <button 
            type="button" 
            className="add-btn"
            onClick={addEducation}
          >
            Add Education
          </button>
        </div>
        
        {/* Experience Section */}
        <div className="form-section">
          <h3>Work Experience</h3>
          
          {formData.experience.map((exp, index) => (
            <div key={index} className="experience-entry">
              <h4>Experience #{index + 1}</h4>
              
              {index > 0 && (
                <button 
                  type="button" 
                  className="remove-btn"
                  onClick={() => removeExperience(index)}
                >
                  Remove
                </button>
              )}
              
              <div className="form-row">
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                    className="form-control"
                    placeholder="Company Name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                    className="form-control"
                    placeholder="Job Title"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={exp.location}
                  onChange={(e) => handleExperienceChange(index, 'location', e.target.value)}
                  className="form-control"
                  placeholder="City, Country or Remote"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={exp.startDate}
                    onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={exp.endDate}
                    onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)}
                    className="form-control"
                    disabled={exp.current}
                    required={!exp.current}
                  />
                </div>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={exp.current}
                    onChange={(e) => handleExperienceChange(index, 'current', e.target.checked)}
                  />
                  Current Position
                </label>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={exp.description}
                  onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                  className="form-control"
                  placeholder="Describe your role, responsibilities, and achievements"
                  rows={4}
                ></textarea>
              </div>
            </div>
          ))}
          
          <button 
            type="button" 
            className="add-btn"
            onClick={addExperience}
          >
            Add Experience
          </button>
        </div>
        
        {/* Skills Section */}
        <div className="form-section">
          <h3>Skills</h3>
          
          {/* Technical Skills */}
          <div className="skills-category">
            <h4>Technical Skills</h4>
            
            <div className="skills-grid">
              {skillOptions.technical.map(skill => (
                <div key={skill} className="skill-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.skills.technical.includes(skill)}
                      onChange={() => handleSkillToggle('technical', skill)}
                    />
                    {skill}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="custom-skill-input">
              <input
                id="custom-technical-skill"
                type="text"
                placeholder="Add a custom technical skill"
                className="form-control"
              />
              <button
                type="button"
                onClick={() => addCustomSkill('technical', document.getElementById('custom-technical-skill').value)}
              >
                Add
              </button>
            </div>
            
            <div className="selected-skills">
              <h5>Selected Technical Skills:</h5>
              {formData.skills.technical.length > 0 ? (
                <div className="skill-tags">
                  {formData.skills.technical.map(skill => (
                    <span key={skill} className="skill-tag">
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => handleSkillToggle('technical', skill)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p>No technical skills selected yet.</p>
              )}
            </div>
          </div>
          
          {/* Languages */}
          <div className="skills-category">
            <h4>Languages</h4>
            
            <div className="skills-grid">
              {skillOptions.languages.map(skill => (
                <div key={skill} className="skill-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.skills.languages.includes(skill)}
                      onChange={() => handleSkillToggle('languages', skill)}
                    />
                    {skill}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="custom-skill-input">
              <input
                id="custom-languages-skill"
                type="text"
                placeholder="Add a custom language"
                className="form-control"
              />
              <button
                type="button"
                onClick={() => addCustomSkill('languages', document.getElementById('custom-languages-skill').value)}
              >
                Add
              </button>
            </div>
            
            <div className="selected-skills">
              <h5>Selected Languages:</h5>
              {formData.skills.languages.length > 0 ? (
                <div className="skill-tags">
                  {formData.skills.languages.map(skill => (
                    <span key={skill} className="skill-tag">
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => handleSkillToggle('languages', skill)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p>No languages selected yet.</p>
              )}
            </div>
          </div>
          
          {/* Soft Skills */}
          <div className="skills-category">
            <h4>Soft Skills</h4>
            
            <div className="skills-grid">
              {skillOptions.soft.map(skill => (
                <div key={skill} className="skill-option">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.skills.soft.includes(skill)}
                      onChange={() => handleSkillToggle('soft', skill)}
                    />
                    {skill}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="custom-skill-input">
              <input
                id="custom-soft-skill"
                type="text"
                placeholder="Add a custom soft skill"
                className="form-control"
              />
              <button
                type="button"
                onClick={() => addCustomSkill('soft', document.getElementById('custom-soft-skill').value)}
              >
                Add
              </button>
            </div>
            
            <div className="selected-skills">
              <h5>Selected Soft Skills:</h5>
              {formData.skills.soft.length > 0 ? (
                <div className="skill-tags">
                 {formData.skills.soft.map(skill => (
                    <span key={skill} className="skill-tag">
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => handleSkillToggle('soft', skill)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p>No soft skills selected yet.</p>
              )}
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Resume'}
        </button>
      </form>
    </div>
  );
};

export default ResumeForm;