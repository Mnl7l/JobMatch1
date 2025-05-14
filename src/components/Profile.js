import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser(user);
          
          // Fetch user profile
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          
          setProfile(data);
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            bio: data.bio || '',
            location: data.location || '',
            linkedin_url: data.linkedin_url || '',
            github_url: data.github_url || '',
            portfolio_url: data.portfolio_url || ''
          });

          // Fetch user's resumes
          await fetchResumes(user.id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error.message);
        setMessage('Error loading profile data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const fetchResumes = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Log each resume's URL for debugging
      console.log('Fetched resumes:', data);
      data?.forEach(resume => {
        console.log('Resume ID:', resume.id);
        console.log('Resume URL:', resume.file_url);
        console.log('Resume file_path:', resume.file_path);
      });
      
      setResumes(data || []);
    } catch (error) {
      console.error('Error fetching resumes:', error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => ({ ...prev, ...formData }));
      setEditing(false);
      setMessage('Profile updated successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error.message);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResumeView = async (resume) => {
    try {
      console.log('Attempting to view resume:', resume);
      
      // First, try to get a fresh signed URL if we have the file path
      if (resume.file_path) {
        console.log('Using file_path:', resume.file_path);
        const { data: signedUrlData, error } = await supabase.storage
          .from('resume-files')
          .createSignedUrl(resume.file_path, 3600); // 1 hour expiry
        
        if (!error && signedUrlData?.signedUrl) {
          console.log('Opening signed URL:', signedUrlData.signedUrl);
          window.open(signedUrlData.signedUrl, '_blank');
          return;
        }
        
        console.log('Signed URL error:', error);
      }
      
      // Fallback to stored URL
      if (resume.file_url) {
        console.log('Opening stored URL:', resume.file_url);
        window.open(resume.file_url, '_blank');
      } else {
        setMessage('Resume file URL not found.');
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
      setMessage('Error viewing resume. Please try again.');
    }
  };

  const handleResumeDelete = async (resumeId, fileUrl, filePath) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      // Try to delete using file_path first
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('resume-files')
          .remove([filePath]);

        if (storageError) {
          console.error('Error deleting file by path:', storageError);
        }
      } else if (fileUrl) {
        // Extract file path from URL as fallback
        const extractedPath = fileUrl.split('resume-files/')[1];
        if (extractedPath) {
          const { error: storageError } = await supabase.storage
            .from('resume-files')
            .remove([extractedPath]);

          if (storageError) {
            console.error('Error deleting file by URL:', storageError);
            // Continue with database deletion even if storage deletion fails
          }
        }
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (dbError) throw dbError;

      // Update local state
      setResumes(resumes.filter(resume => resume.id !== resumeId));
      setMessage('Resume deleted successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting resume:', error.message);
      setMessage('Error deleting resume. Please try again.');
    }
  };

  const cancelEdit = () => {
    // Reset form data to original profile values
    setFormData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      location: profile.location || '',
      linkedin_url: profile.linkedin_url || '',
      github_url: profile.github_url || '',
      portfolio_url: profile.portfolio_url || ''
    });
    setEditing(false);
    setMessage('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>User Profile</h2>
        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
      
      {user ? (
        <div className="profile-content">
          {/* Account Information - Read Only */}
          <div className="profile-section">
            <h3>Account Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Email</label>
                <p>{user.email}</p>
              </div>
              <div className="info-item">
                <label>Role</label>
                <p>{profile ? (profile.role === 'job_seeker' ? 'Job Seeker' : 'Employer') : 'Not specified'}</p>
              </div>
              <div className="info-item">
                <label>Last Sign In</label>
                <p>{new Date(user.last_sign_in_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Personal Information - Editable */}
          <div className="profile-section">
            <div className="section-header">
              <h3>Personal Information</h3>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="btn btn-outline">
                  <i className="fas fa-edit"></i> Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button onClick={cancelEdit} className="btn btn-outline">
                    Cancel
                  </button>
                  <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="City, Country"
                    />
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    className="form-control"
                    rows="4"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="form-section">
                  <h4>Social Links</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>LinkedIn URL</label>
                      <input
                        type="url"
                        name="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="form-group">
                      <label>GitHub URL</label>
                      <input
                        type="url"
                        name="github_url"
                        value={formData.github_url}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Portfolio URL</label>
                      <input
                        type="url"
                        name="portfolio_url"
                        value={formData.portfolio_url}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <label>Name</label>
                  <p>{profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Not provided' : 'Not provided'}</p>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <p>{profile?.phone || 'Not provided'}</p>
                </div>
                <div className="info-item">
                  <label>Location</label>
                  <p>{profile?.location || 'Not provided'}</p>
                </div>
                {profile?.bio && (
                  <div className="info-item full-width">
                    <label>Bio</label>
                    <p>{profile.bio}</p>
                  </div>
                )}
                {(profile?.linkedin_url || profile?.github_url || profile?.portfolio_url) && (
                  <div className="info-item full-width">
                    <label>Social Links</label>
                    <div className="social-links">
                      {profile?.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="social-link">
                          <i className="fab fa-linkedin"></i> LinkedIn
                        </a>
                      )}
                      {profile?.github_url && (
                        <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="social-link">
                          <i className="fab fa-github"></i> GitHub
                        </a>
                      )}
                      {profile?.portfolio_url && (
                        <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="social-link">
                          <i className="fas fa-globe"></i> Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resume Management Section */}
          <div className="profile-section">
            <div className="section-header">
              <h3>My Resumes</h3>
              <a href="/upload" className="btn btn-primary">
                <i className="fas fa-plus"></i> Upload New Resume
              </a>
            </div>
            
            {resumes.length > 0 ? (
              <div className="resumes-list">
                {resumes.map((resume) => (
                  <div key={resume.id} className="resume-item">
                    <div className="resume-info">
                      <div className="resume-icon">
                        <i className="fas fa-file-alt"></i>
                      </div>
                      <div className="resume-details">
                        <h4>{resume.file_name || `Resume ${resume.id.slice(0, 8)}`}</h4>
                        <p>Uploaded on {new Date(resume.created_at).toLocaleDateString()}</p>
                        <small>{formatFileSize(resume.file_size || 0)}</small>
                      </div>
                    </div>
                    <div className="resume-actions">
                      <button 
                        onClick={() => handleResumeView(resume)}
                        className="btn btn-outline"
                      >
                        <i className="fas fa-eye"></i> View
                      </button>
                      <button 
                        onClick={() => handleResumeDelete(resume.id, resume.file_url, resume.file_path)}
                        className="btn btn-danger"
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-resumes">
                <p>You haven't uploaded any resumes yet.</p>
                <a href="/upload" className="btn btn-primary">
                  <i className="fas fa-upload"></i> Upload Your First Resume
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="not-logged-in">
          <p>Please log in to view your profile.</p>
        </div>
      )}
    </div>
  );
};

export default Profile;