import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Simple check against environment variables
    const validUsername = process.env.REACT_APP_USERNAME || 'admin';
    const validPassword = process.env.REACT_APP_PASSWORD || 'password';
    
    if (username === validUsername && password === validPassword) {
      localStorage.setItem('isAuthenticated', 'true');
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--primary-bg)'
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '3rem',
        boxShadow: '0 8px 24px var(--shadow)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{
          color: 'var(--accent)',
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '1.8rem',
          fontWeight: '500',
          letterSpacing: '0.5px'
        }}>
          Support Management System
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-secondary)',
              fontWeight: '500',
              fontSize: '0.95rem'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-secondary)',
              fontWeight: '500',
              fontSize: '0.95rem'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            />
          </div>
          
          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: 'rgba(139, 90, 60, 0.1)',
              border: '1px solid #8b5a3c',
              borderRadius: '8px',
              color: '#8b5a3c',
              textAlign: 'center',
              fontSize: '0.95rem'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
