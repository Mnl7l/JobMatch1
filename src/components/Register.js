// src/components/Register.js - Modified version with clear account type selection

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp, getCurrentUser } from '../utils/auth';
import './Login.css'; // Reuse login styles

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'job_seeker' // Default role
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { user } = await getCurrentUser();
      if (user) {
        navigate('/'); // Redirect if already logged in
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = (role) => {
    setFormData(prev => ({
      ...prev,
      role
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Register user
      const { error } = await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: formData.role
      });
      
      if (error) throw error;
      
      // Success message and redirect
      alert('Registration successful! Please check your email for confirmation.');
      navigate('/Login');
      
    } catch (error) {
      console.error('Error registering:', error.message);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Create a JobMatch Account</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {/* Improved Account Type Selection */}
        <div className="role-selection">
          <h4>I am a:</h4>
          <div className="account-type">
            <div 
              className={`account-type-option ${formData.role === 'job_seeker' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('job_seeker')}
            >
              <i className="fas fa-user"></i>
              <h5>Job Seeker</h5>
              <p>Looking for opportunities</p>
              {/* Add radio button for accessibility */}
              <input 
                type="radio" 
                name="role" 
                value="job_seeker" 
                checked={formData.role === 'job_seeker'} 
                onChange={() => handleRoleSelect('job_seeker')}
                className="role-radio"
              />
            </div>
            
            <div 
              className={`account-type-option ${formData.role === 'employer' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('employer')}
            >
              <i className="fas fa-building"></i>
              <h5>Employer</h5>
              <p>Hiring talent</p>
              {/* Add radio button for accessibility */}
              <input 
                type="radio" 
                name="role" 
                value="employer" 
                checked={formData.role === 'employer'} 
                onChange={() => handleRoleSelect('employer')}
                className="role-radio"
              />
            </div>
          </div>
        </div>
        
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
          </div>
          
          <div className="form-group terms">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">
              I agree to JobMatch's <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
            </label>
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <p className="auth-link">
          Already have an account? <Link to="/Login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;