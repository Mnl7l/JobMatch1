// src/App.js
import { useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient';
import Header from './components/Header';
import Footer from './components/Footer';
import AppRoutes from './routes';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    console.log('App component mounted');
    
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Get initial session
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        console.log('Session retrieved:', data.session ? 'Active session' : 'No active session');
        setSession(data.session);
        
        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            console.log('Auth state changed:', _event);
            setSession(session);
          }
        );
        
        return () => {
          console.log('Cleaning up auth listener');
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing app:', error.message);
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading JobMatch...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header session={session} />
      
      <main className="main-content">
        <AppRoutes session={session} />
      </main>
      
      <Footer />
    </div>
  );
}

export default App;