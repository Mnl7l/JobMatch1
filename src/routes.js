// src/routes.js - Add the Profile route
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Logintemp';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import Upload from './components/ResumeUpload';
import About from './components/About';
import JobForm from './components/JobForm';
import JobDetails from './components/JobDetails';
import Jobs from './components/Jobs';
import Profile from './components/Profile'; // Add this import
import NotFound from './components/NotFound';
import { useParams } from 'react-router-dom';
import CandidateList from './components/CandidateList';
import CandidateEvaluation from './components/CandidateEvaluation';
const AppRoutes = ({ session }) => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/Login" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/:id" element={<JobDetails />} />
       <Route path="/jobs/:jobId/candidates" element={<CandidateList jobPostingId={useParams().jobId} />} />
  <Route path="/candidates/:candidateId" element={<CandidateEvaluation candidateId={useParams().candidateId} />} />

      {/* Protected routes - require authentication */}
      <Route 
        path="/admin" 
        element={session ? <AdminPanel /> : <Navigate to="/login" state={{ from: '/admin' }} replace />} 
      />
      <Route 
        path="/upload" 
        element={session ? <Upload /> : <Navigate to="/login" state={{ from: '/upload' }} replace />} 
      />
      <Route 
        path="/post-job" 
        element={session ? <JobForm /> : <Navigate to="/login" state={{ from: '/post-job' }} replace />} 
      />
      <Route 
        path="/profile" 
        element={session ? <Profile /> : <Navigate to="/login" state={{ from: '/profile' }} replace />} 
      />
      <Route 
        path="/edit-job/:id" 
        element={session ? <JobForm isEditMode={true} /> : <Navigate to="/login" replace />} 
      />

      {/* 404 route */}
      <Route path="" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;