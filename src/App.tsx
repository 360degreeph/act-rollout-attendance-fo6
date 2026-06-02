import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { QRScanner } from './components/QRScanner';
import { LogsList } from './components/LogsList';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { SheetsService, type Student, type AttendanceLog } from './services/sheetsService';
import { Sparkles, Calendar, UserCheck, Camera } from 'lucide-react';

function App() {
  const [currentPage, setCurrentPage] = useState<'scanner' | 'dashboard' | 'settings'>('scanner');
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [syncMode, setSyncMode] = useState<'simulation' | 'sheets'>('simulation');
  const [scriptUrl, setScriptUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [liveTime, setLiveTime] = useState(new Date());

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load configuration and data on initial mount
  useEffect(() => {
    // 1. Initialize offline local storage files
    SheetsService.initializeLocalData();
    
    // 2. Load mode and script Url
    const savedMode = SheetsService.getMode();
    const savedUrl = SheetsService.getScriptUrl();
    
    setSyncMode(savedMode);
    setScriptUrl(savedUrl);

    // 3. Load core logs and student profiles
    refreshAllData();
  }, []);

  // Fetch data from current active backend (Sheets API or offline simulator)
  const refreshAllData = async () => {
    setIsSyncing(true);
    setErrorMsg('');
    try {
      const data = await SheetsService.fetchData();
      setStudents(data.students);
      setLogs(data.logs);
    } catch (err) {
      console.error('Failed to sync dataset:', err);
      setErrorMsg('Could not sync with Google Sheets backend. Falling back to local offline database.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Perform student/staff scan check-in/out
  const handleScanSuccess = async (studentId: string): Promise<AttendanceLog> => {
    setIsSyncing(true);
    try {
      const log = await SheetsService.scanStudent(studentId);
      
      // Pull dataset to keep state synchronously updated across views
      const refreshedData = await SheetsService.fetchData();
      setStudents(refreshedData.students);
      setLogs(refreshedData.logs);
      
      return log;
    } catch (err) {
      console.error('Scan logging failed:', err);
      throw err; // bubble up to show in scanner error badge
    } finally {
      setIsSyncing(false);
    }
  };

  // Register a new staff student
  const handleRegisterStudent = async (student: Student) => {
    setIsSyncing(true);
    try {
      await SheetsService.registerStudent(student);
      await refreshAllData();
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger quick scan from dashboard roster list
  const handleQuickScan = async (studentId: string) => {
    try {
      await handleScanSuccess(studentId);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Reset database locally
  const handleResetDb = () => {
    SheetsService.resetLocalDatabase();
    refreshAllData();
  };

  // Format today's date label
  const getTodayFormattedDate = () => {
    return liveTime.toLocaleDateString([], {
      timeZone: 'Asia/Manila',
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLiveTimeFormatted = () => {
    return liveTime.toLocaleTimeString([], {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="app-container">
      {/* Universal Sticky Header Navigation */}
      <Navigation
        currentPage={currentPage}
        setPage={setCurrentPage}
        syncMode={syncMode}
        isSyncing={isSyncing}
        onRefresh={refreshAllData}
      />

      {/* Main View Area */}
      <main className="main-content">
        {/* Dynamic Page Headers */}
        <header className="page-header">
          <div>
            <h1 className="page-title">
              {currentPage === 'scanner' && (
                <>
                  <Sparkles size={28} color="#3b82f6" />
                  <span>Attendance Terminal</span>
                </>
              )}
              {currentPage === 'dashboard' && (
                <>
                  <UserCheck size={28} color="#06b6d4" />
                  <span>System Analytics Dashboard</span>
                </>
              )}
              {currentPage === 'settings' && (
                <>
                  <Sparkles size={28} color="#f59e0b" />
                  <span>Control & API Settings</span>
                </>
              )}
            </h1>
            <p className="page-subtitle">
              {currentPage === 'scanner' && "Launch the high-speed camera scanner terminal window to log staff check-ins and outs"}
              {currentPage === 'dashboard' && "Live tracking metrics, peak session times, and registration rosters"}
              {currentPage === 'settings' && "Configure connection to your Google Sheets spreadsheet and register profiles"}
            </p>
          </div>

          <div style={styles.dateBadge}>
            <Calendar size={14} color="var(--text-secondary)" />
            <span>{getTodayFormattedDate()}</span>
            <span style={{ margin: '0 4px', color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span style={{ color: '#10b981', minWidth: '85px', textAlign: 'center' }}>{getLiveTimeFormatted()}</span>
          </div>
        </header>

        {/* Global Connection Error Notice */}
        {errorMsg && (
          <div style={styles.globalError}>
            <span>⚠️ {errorMsg}</span>
            <button onClick={refreshAllData} style={styles.errorRetry}>Retry Sync</button>
          </div>
        )}

        {/* Dynamic Page Rendering */}
        <div style={{ position: 'relative' }}>
          {currentPage === 'scanner' && (
            <div style={styles.scannerPageContainer}>
              {/* Full Width Glowing Banner Launcher */}
              <div className="glass-card" style={styles.bannerCard}>
                <div style={styles.bannerLeft}>
                  <div style={styles.indicatorContainer}>
                    <div style={styles.activePulseDot} />
                    <span style={styles.bannerStatusText}>TERMINAL ACTIVE</span>
                  </div>
                  <h2 style={styles.bannerTitle}>Scan Terminal Gate</h2>
                  <p style={styles.bannerText}>Launch the high-speed live QR camera pop-up window to begin registering staff check-ins and check-outs.</p>
                </div>
                
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="btn btn-primary"
                  style={styles.launchBtn}
                >
                  <Camera size={18} />
                  <span>Launch Live Scanner</span>
                </button>
              </div>

              {/* Running logs list taking up full-width below */}
              <LogsList logs={logs} />

              {/* Popup modal scanner window */}
              <QRScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScanSuccess={handleScanSuccess}
              />
            </div>
          )}

          {currentPage === 'dashboard' && (
            <Dashboard
              students={students}
              logs={logs}
              onQuickScan={handleQuickScan}
            />
          )}

          {currentPage === 'settings' && (
            <Settings
              syncMode={syncMode}
              setSyncMode={setSyncMode}
              scriptUrl={scriptUrl}
              setScriptUrl={setScriptUrl}
              onRefreshData={refreshAllData}
              onRegisterStudent={handleRegisterStudent}
              onResetDb={handleResetDb}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const styles = {
  dateBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '6px 12px',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#ffffff'
  },
  globalError: {
    background: 'var(--color-danger-bg)',
    border: '1px solid var(--color-danger-border)',
    color: 'var(--color-danger)',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    marginBottom: '2.5rem',
    fontSize: '0.85rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  errorRetry: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid var(--color-danger-border)',
    color: '#ef4444',
    padding: '2px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  
  // Custom Styles for pop-up launcher layout
  scannerPageContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem'
  },
  bannerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '1.5rem',
    padding: '2rem',
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25), inset 0 0 20px rgba(59, 130, 246, 0.03)'
  },
  bannerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    maxWidth: '560px'
  },
  indicatorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    alignSelf: 'flex-start'
  },
  activePulseDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#10b981',
    borderRadius: '50%',
    boxShadow: '0 0 10px #10b981',
    animation: 'pulse 1.8s infinite ease-in-out'
  },
  bannerStatusText: {
    fontSize: '0.68rem',
    fontWeight: 800,
    color: '#10b981',
    letterSpacing: '0.08em'
  },
  bannerTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-title)'
  },
  bannerText: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5'
  },
  launchBtn: {
    padding: '1rem 2rem',
    fontSize: '1.05rem',
    borderRadius: '14px',
    minWidth: '220px'
  }
};

export default App;
