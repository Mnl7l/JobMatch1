// src/components/Analytics.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    jobsByType: [],
    applicationsByStatus: [],
    matchScoreDistribution: [],
    totalJobs: 0,
    totalApplications: 0,
    averageMatchScore: 0
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Fetch jobs
        const { data: jobs, error: jobsError } = await supabase
          .from('job_posts')
          .select('*');
        
        if (jobsError) throw jobsError;
        
        // Fetch rankings (match scores)
        const { data: rankings, error: rankingsError } = await supabase
          .from('rankings')
          .select('*');
        
        if (rankingsError) throw rankingsError;
        
        // Calculate job types distribution
        const jobTypes = {};
        jobs.forEach(job => {
          const type = job.job_type || 'other';
          jobTypes[type] = (jobTypes[type] || 0) + 1;
        });
        
        const jobsByType = Object.keys(jobTypes).map(type => ({
          name: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
          count: jobTypes[type]
        }));
        
        // Calculate match score distribution
        const scores = {
          'High (80-100)': 0,
          'Medium (50-79)': 0,
          'Low (0-49)': 0
        };
        
        let totalScore = 0;
        
        rankings.forEach(ranking => {
          totalScore += ranking.score;
          
          if (ranking.score >= 80) {
            scores['High (80-100)']++;
          } else if (ranking.score >= 50) {
            scores['Medium (50-79)']++;
          } else {
            scores['Low (0-49)']++;
          }
        });
        
        const matchScoreDistribution = Object.keys(scores).map(range => ({
          name: range,
          value: scores[range]
        }));
        
        // Mock application status data (replace with real data when available)
        const applicationsByStatus = [
          { name: 'Pending', value: 30 },
          { name: 'Reviewed', value: 45 },
          { name: 'Interviewed', value: 20 },
          { name: 'Hired', value: 5 }
        ];
        
        // Calculate statistics
        const totalJobs = jobs.length;
        const totalApplications = rankings.length;
        const averageMatchScore = totalApplications > 0 
          ? Math.round(totalScore / totalApplications) 
          : 0;
        
        // Set all statistics
        setStats({
          jobsByType,
          applicationsByStatus,
          matchScoreDistribution,
          totalJobs,
          totalApplications,
          averageMatchScore
        });
        
      } catch (error) {
        console.error('Error fetching analytics data:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="analytics-container">
      <h2>Analytics Dashboard</h2>
      
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalJobs}</div>
          <div className="stat-label">Total Jobs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalApplications}</div>
          <div className="stat-label">Total Applications</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.averageMatchScore}%</div>
          <div className="stat-label">Average Match Score</div>
        </div>
      </div>
      
      <div className="analytics-grid">
        {/* Job Types Chart */}
        <div className="chart-container">
          <h3>Jobs by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stats.jobsByType}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#1e6091" name="Number of Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Application Status Chart */}
        <div className="chart-container">
          <h3>Applications by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.applicationsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {stats.applicationsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Match Score Distribution Chart */}
        <div className="chart-container">
          <h3>Match Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.matchScoreDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {stats.matchScoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;