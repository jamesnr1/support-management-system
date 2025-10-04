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
      background: '#2D2B28'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #3E3B37, #3E3B37)',
        border: '2px solid #D4A574',
        borderRadius: '12px',
        padding: '3rem',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{
          color: '#D4A574',
          textAlign: 'center',
          marginBottom: '2rem',
          fontSize: '1.8rem',
          textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
        }}>
          Support Management System
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#E8DDD4',
              fontWeight: '500'
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
                borderRadius: '4px',
                border: '1px solid #4A4641',
                background: '#2D2B28',
                color: '#E8DDD4',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#E8DDD4',
              fontWeight: '500'
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
                borderRadius: '4px',
                border: '1px solid #4A4641',
                background: '#2D2B28',
                color: '#E8DDD4',
                fontSize: '1rem'
              }}
            />
          </div>
          
          {error && (
            <div style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              background: 'rgba(184, 126, 126, 0.2)',
              border: '1px solid #B87E7E',
              borderRadius: '4px',
              color: '#B87E7E',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#D4A574',
              color: '#2D2B28',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#E5C199'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#D4A574'}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
