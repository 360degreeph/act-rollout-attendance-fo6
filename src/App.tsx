import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { QRScanner } from './components/QRScanner';
import { LogsList } from './components/LogsList';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { SheetsService, type Student, type AttendanceLog } from './services/sheetsService';
import { Sparkles, Calendar, UserCheck, Camera, CreditCard } from 'lucide-react';

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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('act_auth_token') === 'verified';
  });
  
  const [globalToast, setGlobalToast] = useState<{
    show: boolean;
    studentId: string;
    studentName: string;
    status: 'IN' | 'OUT';
    timestamp: string;
    position?: string;
    office?: string;
  } | null>(null);

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

  // Perform student/staff scan check-in/out optimistically for ZERO-latency UI
  const handleScanSuccess = async (studentId: string): Promise<AttendanceLog> => {
    const cleanId = studentId.trim();
    
    // 1. Find Staff Optimistically
    const scanLower = cleanId.toLowerCase();
    const existingStudent = students.find(s => 
      s.studentId.toLowerCase() === scanLower || 
      (s.qrcode && s.qrcode.toLowerCase() === scanLower) || 
      (s.rfid && s.rfid.toLowerCase() === scanLower)
    );

    const staffId = existingStudent ? existingStudent.studentId : cleanId;
    const staffName = existingStudent ? existingStudent.name : `Staff (${cleanId})`;
    const position = existingStudent ? existingStudent.position : 'Auto-Registered';
    const sex = existingStudent ? existingStudent.sex : 'Unknown';
    const office = existingStudent ? existingStudent.office : 'Office';
    const qrcode = existingStudent ? existingStudent.qrcode : cleanId;

    // 2. Determine IN/OUT optimistically
    const todayManila = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    let lastStatus = 'OUT';
    
    // Search local logs for the latest status TODAY
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (log.studentId.toLowerCase() === staffId.toLowerCase()) {
        const logDateManila = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(log.timestamp));
        if (logDateManila === todayManila) {
          lastStatus = log.status;
        }
        break; // we found the most recent log for this person
      }
    }

    const newStatus = lastStatus === 'IN' ? 'OUT' : 'IN';
    const timestamp = new Date().toISOString();

    const optimisticLog: AttendanceLog = {
      timestamp,
      studentId: staffId,
      studentName: staffName,
      status: newStatus as 'IN' | 'OUT',
      department: office,
      position,
      sex,
      office,
      qrcode
    };

    // 3. Apply Optimistic Updates to UI instantly
    setLogs(prev => [optimisticLog, ...prev]);
    if (!existingStudent) {
      setStudents(prev => [{
        studentId: staffId,
        name: staffName,
        department: office,
        email: '',
        position,
        sex,
        office,
        qrcode
      }, ...prev]);
    }

    // 4. Background Sync (Fire-and-forget)
    setIsSyncing(true);
    SheetsService.scanStudent(cleanId)
      .catch(err => {
        console.error('Background sync failed:', err);
        setErrorMsg('Sync delayed. Will reconnect soon. ' + (err instanceof Error ? err.message : String(err)));
      })
      .finally(() => setIsSyncing(false));

    return optimisticLog;
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

  // Trigger quick scan from dashboard roster list or RFID input
  const handleQuickScan = async (studentId: string) => {
    try {
      const log = await handleScanSuccess(studentId);
      if (log) {
        playBeep(log.status);
        setGlobalToast({
          show: true,
          studentId: log.studentId,
          studentName: log.studentName,
          status: log.status,
          timestamp: new Date(log.timestamp).toLocaleTimeString([], { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          position: log.position,
          office: log.office
        });
        
        setTimeout(() => {
          setGlobalToast(prev => prev && prev.studentId === log.studentId ? { ...prev, show: false } : prev);
        }, 2000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Audio Synthesizer Beep (Pure Web Audio API)
  const playBeep = (status: 'IN' | 'OUT') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (status === 'IN') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // High pitch
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        oscillator.stop(audioCtx.currentTime + 0.15);
        
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(800, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
          osc2.stop(audioCtx.currentTime + 0.15);
        }, 100);
      } else {
        // Lower pitch double beep for OUT
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.stop(audioCtx.currentTime + 0.2);
        
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(300, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc2.stop(audioCtx.currentTime + 0.3);
        }, 150);
      }
    } catch (e) {
      // Audio not supported or blocked, ignore
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

  const handleLoginSuccess = () => {
    localStorage.setItem('act_auth_token', 'verified');
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} />;
  }

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
              {/* Split Header: Camera & RFID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                
                {/* Live Camera Scanner */}
                <div className="glass-card" style={{ ...styles.bannerCard, marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={styles.indicatorContainer}>
                    <div style={styles.activePulseDot} />
                    <span style={styles.bannerStatusText}>CAMERA ACTIVE</span>
                  </div>
                  <h2 style={{ ...styles.bannerTitle, fontSize: '1.35rem' }}>Live QR Scanner</h2>
                  <p style={{ ...styles.bannerText, marginBottom: '1.5rem' }}>Launch the high-speed live camera to begin registering staff check-ins and check-outs.</p>
                  
                  <button 
                    onClick={() => setIsScannerOpen(true)}
                    className="btn btn-primary"
                    style={{ ...styles.launchBtn, width: '100%', marginTop: 'auto', justifyContent: 'center' }}
                  >
                    <Camera size={18} />
                    <span>Launch Live Camera</span>
                  </button>
                </div>

                {/* Active RFID Scanner */}
                <div className="glass-card" style={{ ...styles.bannerCard, marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={styles.indicatorContainer}>
                    <div style={{ ...styles.activePulseDot, background: '#8b5cf6', boxShadow: '0 0 10px rgba(139,92,246,0.6)' }} />
                    <span style={{ ...styles.bannerStatusText, color: '#8b5cf6' }}>RFID READY</span>
                  </div>
                  <h2 style={{ ...styles.bannerTitle, fontSize: '1.35rem' }}>Active RFID Scanner</h2>
                  <p style={{ ...styles.bannerText, marginBottom: '1.5rem' }}>Plug in your USB RFID scanner. Ensure this box is focused before tapping cards.</p>
                  
                  <div style={{ width: '100%', marginTop: 'auto', position: 'relative' }}>
                    <CreditCard size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input 
                      type="text" 
                      placeholder="Focus here & tap RFID card..." 
                      className="form-input"
                      style={{ width: '100%', paddingLeft: '2.75rem', paddingRight: '1rem', height: '42px', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(139,92,246,0.3)' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = e.currentTarget.value;
                          if (val.trim()) {
                            handleQuickScan(val);
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

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
              students={students}
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

      {/* Global Toast Notification for RFID / Quick Scans */}
      {globalToast && globalToast.show && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: globalToast.status === 'IN' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          border: `1px solid ${globalToast.status === 'IN' ? '#34d399' : '#f87171'}`,
          color: 'white',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: globalToast.status === 'IN' ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.3)' : '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          minWidth: '300px',
          transition: 'all 0.3s ease-out'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%' }}>
            <UserCheck size={28} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{globalToast.status === 'IN' ? 'LOGGED IN' : 'LOGGED OUT'}</div>
            <div style={{ fontWeight: 600 }}>{globalToast.studentName}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>{globalToast.timestamp} • {globalToast.office || globalToast.position || 'Staff'}</div>
          </div>
        </div>
      )}
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
