import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../utils/auth';
import './Login.css'; // Reuse login styles

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await resetPassword(email);
      
      if (error) throw error;
      
      setEmailSent(true);
      
    } catch (error) {
      console.error('Error requesting password reset:', error.message);
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <h2>Reset Your Password</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {emailSent ? (
          <div className="success-message">
            <p>Password reset instructions sent!</p>
            <p>Please check your email for a link to reset your password.</p>
          </div>
        ) : (
          <form onSubmit={handleResetRequest}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <p className="form-helper">Enter your email address and we'll send you a link to reset your password.</p>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-button" 
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </form>
        )}
        
        <p className="auth-link">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;