// Improved Footer.js with better organization
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section footer-brand">
          <div className="footer-logo">
            <Link to="/">
              <img src="/asset/images/JobMatch1.jpg" alt="JobMatch Logo" />
            </Link>
          </div>
          <p className="tagline">
            Connecting the right people with the right jobs
          </p>
          <div className="social-links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-instagram"></i>
            </a>
          </div>
        </div>

        <div className="footer-section">
          <h3>For Job Seekers</h3>
          <ul>
            <li><Link to="/jobs">Browse Jobs</Link></li>
            <li><Link to="/upload">Upload Resume</Link></li>
            <li><Link to="/profile">My Profile</Link></li>
            <li><Link to="/applied-jobs">My Applications</Link></li>
            <li><Link to="/career-resources">Career Resources</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>For Employers</h3>
          <ul>
            <li><Link to="/post-job">Post a Job</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li><Link to="/manage-jobs">Manage Jobs</Link></li>
            <li><Link to="/view-resumes">View Resumes</Link></li>
            <li><Link to="/employer-resources">Employer Resources</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Company</h3>
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/careers">Careers</Link></li>
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/press">Press</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Support</h3>
          <ul>
            <li><Link to="/help">Help Center</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/cookies">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>&copy; 2025 JobMatch. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/sitemap">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;