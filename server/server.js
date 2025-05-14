// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
// Import route files
const resumeRoutes = require('./routes/resume');
const jobRoutes = require('./routes/job');

// Routes
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);


// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Password reset route - Direct implementation without email verification
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and new password are required' 
      });
    }
    
    // First, get the user by email
    const { data: user, error: getUserError } = await supabase.auth.admin
      .listUsers({ 
        filters: { email: email }
      });
    
    if (getUserError || !user || user.users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const userId = user.users[0].id;
    
    // Update password using Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );
    
    if (updateError) {
      return res.status(500).json({ 
        success: false, 
        message: updateError.message 
      });
    }
    
    return res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Server error during password reset:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Default route
app.get('/', (req, res) => {
  res.send('JobMatch API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});