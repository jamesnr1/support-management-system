import React from 'react';

export const SkeletonCard = () => (
  <div style={{
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    animation: 'pulse 1.5s ease-in-out infinite'
  }}>
    <div style={{
      height: '20px',
      background: 'var(--bg-tertiary)',
      borderRadius: '4px',
      marginBottom: '0.5rem',
      width: '60%'
    }}></div>
    <div style={{
      height: '16px',
      background: 'var(--bg-tertiary)',
      borderRadius: '4px',
      marginBottom: '0.5rem',
      width: '80%'
    }}></div>
    <div style={{
      height: '16px',
      background: 'var(--bg-tertiary)',
      borderRadius: '4px',
      width: '40%'
    }}></div>
  </div>
);

export const LoadingSpinner = ({ size = 24, text = 'Loading...' }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '2rem',
    color: 'var(--text-secondary)'
  }}>
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid var(--border-color)',
        borderTop: '3px solid var(--accent-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
    {text && <span>{text}</span>}
  </div>
);

export const ProgressBar = ({ progress = 0, text = '' }) => (
  <div style={{ padding: '1rem' }}>
    {text && (
      <div style={{ 
        marginBottom: '0.5rem', 
        color: 'var(--text-secondary)', 
        fontSize: '0.9rem' 
      }}>
        {text}
      </div>
    )}
    <div style={{
      width: '100%',
      height: '8px',
      background: 'var(--bg-tertiary)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: 'var(--accent-primary)',
        transition: 'width 0.3s ease',
        borderRadius: '4px'
      }} />
    </div>
  </div>
);

// Add CSS animations
const styles = `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default { SkeletonCard, LoadingSpinner, ProgressBar };

