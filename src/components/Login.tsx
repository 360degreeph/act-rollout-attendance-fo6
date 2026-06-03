import React, { useState } from 'react';
import { Lock, User, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'admin' && password === 'Dswd@123') {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-card" style={styles.card}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '68px', height: '68px', marginBottom: '0.25rem' }}>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/4/47/Department_of_Social_Welfare_and_Development_%28DSWD%29.svg" 
              alt="DSWD Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <h1 style={styles.title}>Kalahi-CIDSS PCRP</h1>
          <p style={styles.subtitle}>Enter your credentials to access the ACT Rollout Terminal</p>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={styles.inputWrapper}>
              <User size={16} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="Enter username"
                className="form-input"
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="Enter password"
                className="form-input"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn}>
            Access Terminal
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.15), transparent 40%)'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem 2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem'
  },
  header: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem'
  },
  iconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'rgba(59, 130, 246, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(59, 130, 246, 0.2)'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: 1.5
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem'
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute' as const,
    left: '1rem',
    color: 'var(--text-muted)'
  },
  input: {
    paddingLeft: '2.75rem'
  },
  submitBtn: {
    marginTop: '1rem',
    width: '100%',
    justifyContent: 'center'
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    textAlign: 'center' as const,
    fontWeight: 500
  }
};
