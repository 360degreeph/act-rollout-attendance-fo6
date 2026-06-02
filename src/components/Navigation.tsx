import React from 'react';
import { QrCode, LayoutDashboard, Settings as SettingsIcon, Link2, RefreshCw } from 'lucide-react';

interface NavigationProps {
  currentPage: 'scanner' | 'dashboard' | 'settings';
  setPage: (page: 'scanner' | 'dashboard' | 'settings') => void;
  syncMode: 'simulation' | 'sheets';
  isSyncing: boolean;
  onRefresh: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  setPage,
  syncMode,
  isSyncing,
  onRefresh
}) => {
  return (
    <nav style={styles.nav}>
      <div style={styles.navContainer}>
        {/* Brand Logo & Name */}
        <div style={styles.brand} onClick={() => setPage('scanner')}>
          <div style={styles.logoWrapper}>
            <QrCode size={24} color="#3b82f6" />
          </div>
          <span style={styles.brandText}>ACT Rollout</span>
          <span style={styles.brandSubtext}>June 4-11, 2026 - Field Office VI</span>
        </div>

        {/* Tab Buttons */}
        <div style={styles.tabsList}>
          <button
            onClick={() => setPage('scanner')}
            style={{
              ...styles.tabButton,
              ...(currentPage === 'scanner' ? styles.tabButtonActive : {})
            }}
          >
            <QrCode size={18} />
            <span>Scanner & Logs</span>
            {currentPage === 'scanner' && <div style={styles.activeIndicator} />}
          </button>

          <button
            onClick={() => setPage('dashboard')}
            style={{
              ...styles.tabButton,
              ...(currentPage === 'dashboard' ? styles.tabButtonActive : {})
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
            {currentPage === 'dashboard' && <div style={styles.activeIndicator} />}
          </button>

          <button
            onClick={() => setPage('settings')}
            style={{
              ...styles.tabButton,
              ...(currentPage === 'settings' ? styles.tabButtonActive : {})
            }}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
            {currentPage === 'settings' && <div style={styles.activeIndicator} />}
          </button>
        </div>

        {/* Connection Status Indicator & Refresh */}
        <div style={styles.statusSection}>
          <button 
            onClick={onRefresh} 
            style={styles.refreshButton}
            disabled={isSyncing}
            title="Force synchronization"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} style={{
              animation: isSyncing ? 'spin 1.5s linear infinite' : 'none',
              transformOrigin: 'center'
            }} />
          </button>

          {syncMode === 'sheets' ? (
            <div style={styles.statusBadgeSheets}>
              <div style={styles.statusDotActive} />
              <Link2 size={12} />
              <span>Google Sheets</span>
            </div>
          ) : (
            <div style={styles.statusBadgeSim}>
              <div style={styles.statusDotWarning} />
              <span>Simulation</span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Inline CSS for granular UI layouts
const styles = {
  nav: {
    background: 'rgba(11, 15, 25, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 90,
    width: '100%'
  },
  navContainer: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0.85rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '1rem'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    cursor: 'pointer',
    userSelect: 'none' as const
  },
  logoWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.1)'
  },
  brandText: {
    fontSize: '1.25rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#ffffff',
    fontFamily: 'var(--font-title)'
  },
  brandSubtext: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#6b7280',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '2px 8px',
    borderRadius: '6px',
    marginLeft: '2px'
  },
  tabsList: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.25)',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.03)'
  },
  tabButton: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    position: 'relative' as const,
    transition: 'all 0.25s ease'
  },
  tabButtonActive: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#ffffff',
  },
  activeIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    left: '20%',
    right: '20%',
    height: '2px',
    background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
    borderRadius: '2px'
  },
  statusSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  refreshButton: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    color: '#9ca3af',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  statusBadgeSheets: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    color: '#10b981',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.02em'
  },
  statusBadgeSim: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    color: '#f59e0b',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.02em'
  },
  statusDotActive: {
    width: '6px',
    height: '6px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
    boxShadow: '0 0 8px #10b981',
    animation: 'pulse 1.8s infinite ease-in-out'
  },
  statusDotWarning: {
    width: '6px',
    height: '6px',
    backgroundColor: '#f59e0b',
    borderRadius: '50%',
    boxShadow: '0 0 8px #f59e0b',
    animation: 'pulse 1.8s infinite ease-in-out'
  }
};
