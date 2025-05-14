import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { signIn, getCurrentUser } from '../utils/auth';
import { supabase } from '../utils/supabaseClient';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'job_seeker' // Default selected role
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from location state if available
  const from = location.state?.from || '/';

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

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Sign in with email and password
      const { error: signInError } = await signIn(formData.email, formData.password);
      
      if (signInError) throw signInError;
      
      // Get user profile to check role
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Authentication failed');
      
      // Fetch user profile from the database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Verify that the selected role matches the stored role
      if (profile.role !== formData.role) {
        // Sign out the user since role doesn't match
        await supabase.auth.signOut();
        throw new Error(`You cannot log in as a ${formData.role}. Your account was registered as a ${profile.role}.`);
      }
      
      // Navigate to appropriate page based on role
      if (profile.role === 'employer') {
        navigate('/admin');
      } else {
        navigate(from);
      }
      
    } catch (error) {
      console.error('Error logging in:', error.message);
      setError(error.message || 'Failed to log in');
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Log In to JobMatch</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {/* Role Selection */}
        <div className="role-selection">
          <h4>Log in as:</h4>
          <div className="account-type">
            <div 
              className={`account-type-option ${formData.role === 'job_seeker' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('job_seeker')}
            >
              <i className="fas fa-user"></i>
              <h5>Job Seeker</h5>
              <p>Looking for opportunities</p>
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
        
        <form onSubmit={handleLogin}>
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group remember-forgot">
            <div className="remember-me">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Remember me</label>
            </div>
            <div className="forgot-password">
              <Link to="/reset-password">Forgot Password?</Link>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="auth-divider">
          <span>OR</span>
        </div>
        
        <div className="social-login">
          <button className="social-btn google" title="Log in with Google">
            <i className="fab fa-google"></i>
          </button>
          <button className="social-btn facebook" title="Log in with Facebook">
            <i className="fab fa-facebook-f"></i>
          </button>
          <button className="social-btn linkedin" title="Log in with LinkedIn">
            <i className="fab fa-linkedin-in"></i>
          </button>
        </div>
        
        <p className="auth-link">
          Don't have an account? <Link to="/register">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;