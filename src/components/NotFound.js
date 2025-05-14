// src/components/NotFound.js
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-container">
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">Go to Home</Link>
        <Link to="/admin" className="btn btn-outline">Go to Dashboard</Link>
      </div>
    </div>
  );
};

export default NotFound;