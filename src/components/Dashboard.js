import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>AI-Powered Recruitment Solution</h1>
            <p>JobMatch streamlines the recruitment process by leveraging AI to automatically screen and rank candidates based on job requirements, saving time and reducing bias in the hiring process.</p>
            <div className="cta-buttons">
              <Link to="/upload" className="btn btn-light">Upload Resume</Link>
              <Link to="/post-job" className="btn btn-outline">Post a Job</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>How JobMatch Works</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <i className="fas fa-upload"></i>
              <h3>Upload Documents</h3>
              <p>Easily upload job descriptions and candidate resumes</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-robot"></i>
              <h3>AI Analysis</h3>
              <p>Our algorithms analyze and match candidates to jobs</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-chart-bar"></i>
              <h3>Ranking System</h3>
              <p>Get ranked candidate matches for each position</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-file-alt"></i>
              <h3>Detailed Reports</h3>
              <p>Generate reports to support hiring decisions</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container">
          <h2>Ready to Transform Your Recruitment?</h2>
          <p>Join thousands of companies using JobMatch to find their ideal candidates.</p>
          <Link to="/register" className="btn btn-primary">Get Started Today</Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;