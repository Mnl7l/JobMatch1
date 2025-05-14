// src/components/Header.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import './Header.css';

const Header = ({ session }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If session is provided as prop, use it
    if (session?.user) {
      // Load user profile
      const loadProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
            
        if (error) {
          console.error('Error loading profile:', error.message);
        } else {
          setUser(session.user);
          setProfile(data);
        }
      };
      
      loadProfile();
    } else {
      // Otherwise check auth status directly
      const checkAuthStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser(user);
          
          // Fetch user profile
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
              
          if (error) {
            console.error('Error fetching profile:', error.message);
          } else {
            setProfile(data);
          }
        }
      };
      
      checkAuthStatus();
    }
  }, [session]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  // Determine active link
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Check if user is an employer
  const isEmployer = profile?.role === 'employer';

  return (
    <header className="header">
      <div className="container">
        <nav className="navbar">
          <div className="logo">
            <Link to="/">
              <img src="/assets/images/JobMatch1.jpg" alt="JobMatch Logo" />
            </Link>
          </div>
          
          <ul className="nav-links">
            <li><Link to="/" className={isActive('/')}>Home</Link></li>
            
            {/* Show different navigation based on user role */}
            {isEmployer ? (
              <>
                <li><Link to="/admin" className={isActive('/admin')}>Admin Panel</Link></li>
                <li><Link to="/post-job" className={isActive('/post-job')}>Post a Job</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/jobs" className={isActive('/jobs')}>Find Jobs</Link></li>
                <li><Link to="/upload" className={isActive('/upload')}>Upload Resume</Link></li>
              </>
            )}
            
            <li><Link to="/about" className={isActive('/about')}>About</Link></li>
          </ul>
          
          <div className="auth-buttons">
            {user ? (
              <>
                <Link to="/profile" className="btn btn-outline">
                  <i className="fas fa-user"></i> {profile ? `${profile.first_name} ${profile.last_name}` : user.email}
                </Link>
                <button onClick={handleLogout} className="btn btn-primary">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className={`btn btn-outline ${isActive('/login')}`}>Login</Link>
                <Link to="/register" className={`btn btn-primary ${isActive('/register')}`}>Sign Up</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;