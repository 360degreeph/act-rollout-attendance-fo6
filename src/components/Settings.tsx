import React, { useState } from 'react';
import { Link2, Sparkles, AlertCircle, HelpCircle, Check, Database, Trash2, PlusCircle, RefreshCw, Search } from 'lucide-react';
import { SheetsService, type Student } from '../services/sheetsService';

interface SettingsProps {
  students: Student[];
  syncMode: 'simulation' | 'sheets';
  setSyncMode: (mode: 'simulation' | 'sheets') => void;
  scriptUrl: string;
  setScriptUrl: (url: string) => void;
  onRefreshData: () => Promise<void>;
  onRegisterStudent: (student: Student) => Promise<void>;
  onResetDb: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  students,
  syncMode,
  setSyncMode,
  scriptUrl,
  setScriptUrl,
  onRefreshData,
  onRegisterStudent,
  onResetDb
}) => {
  // Connection tester states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Auto-generate ID helper
  const generateStaffId = () => `STF-${Math.floor(10000 + Math.random() * 90000)}`;

  // Registration form states
  const [stdId, setStdId] = useState(generateStaffId());
  const [stdName, setStdName] = useState('');
  const [stdPosition, setStdPosition] = useState('');
  const [stdSex, setStdSex] = useState('');
  const [stdOffice, setStdOffice] = useState('');
  const [stdRfid, setStdRfid] = useState('');
  const [regStatus, setRegStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter matching students for auto-fill dropdown
  const matchingStudents = stdName.trim()
    ? students.filter(s => s.name.toLowerCase().includes(stdName.toLowerCase()) && s.name !== stdName)
    : [];

  // Instructions Expand
  const [showGuide, setShowGuide] = useState(false);

  // Handle URL Connection Testing
  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid Google Web App URL.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Temporarily apply mode & URL to check connection
    const originalMode = SheetsService.getMode();
    const originalUrl = SheetsService.getScriptUrl();
    
    SheetsService.setMode('sheets');
    SheetsService.setScriptUrl(scriptUrl.trim());

    try {
      // Run fetching sequence to test API
      await onRefreshData();
      
      setTestResult({
        success: true,
        message: 'Connected successfully! Google Sheets database loaded into cache.'
      });
      setSyncMode('sheets');
    } catch (err) {
      console.error('Connection test failed:', err);
      // Restore previous settings on failure
      SheetsService.setMode(originalMode);
      SheetsService.setScriptUrl(originalUrl);
      setTestResult({
        success: false,
        message: `Connection failed. Check if Web App is deployed as "Anyone" and permissions are granted.\nError: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setTesting(false);
    }
  };

  // Handle Adding Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegStatus(null);

    if (!stdId.trim() || !stdName.trim()) {
      setRegStatus({ success: false, message: 'Student ID and Full Name are required.' });
      return;
    }

    try {
      const student: Student = {
        studentId: stdId.trim(),
        name: stdName.trim(),
        department: stdOffice.trim() || 'Staff',
        email: '',
        position: stdPosition.trim(),
        sex: stdSex.trim(),
        office: stdOffice.trim(),
        rfid: stdRfid.trim()
      };

      await onRegisterStudent(student);
      
      setRegStatus({
        success: true,
        message: `Registered Kalahi-CIDSS Staff ${stdName} successfully!`
      });

      // Clear fields
      setStdId(generateStaffId());
      setStdName('');
      setStdPosition('');
      setStdSex('');
      setStdOffice('');
      setStdRfid('');

    } catch (err) {
      setRegStatus({
        success: false,
        message: `Registration failed: ${err instanceof Error ? err.message : String(err)}`
      });
    }
  };

  return (
    <div className="layout-grid">
      {/* Column 1: Connection Settings */}
      <div style={styles.flexCol}>
        {/* Connection Setup Card */}
        <div className="glass-card">
          <div style={styles.cardHeader}>
            <div style={styles.iconWrapperBlue}>
              <Link2 size={18} color="#3b82f6" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Google Sheets Integration</h3>
              <p style={styles.cardSubtitle}>Sync logs directly into your own spreadsheet</p>
            </div>
          </div>

          <div style={styles.modeContainer}>
            <button
              onClick={() => {
                setSyncMode('simulation');
                SheetsService.setMode('simulation');
              }}
              style={{
                ...styles.modeButton,
                ...(syncMode === 'simulation' ? styles.modeButtonActiveSim : {})
              }}
            >
              <Sparkles size={16} />
              <div style={styles.modeTextCol}>
                <span style={styles.modeTitle}>Simulation Mode</span>
                <span style={styles.modeDesc}>Offline storage (fast for testing)</span>
              </div>
            </button>

            <button
              onClick={() => {
                if (!scriptUrl) {
                  setTestResult({ success: false, message: 'Please set up a Google Web App API URL first.' });
                  return;
                }
                setSyncMode('sheets');
                SheetsService.setMode('sheets');
                onRefreshData();
              }}
              style={{
                ...styles.modeButton,
                ...(syncMode === 'sheets' ? styles.modeButtonActiveSheets : {})
              }}
            >
              <Database size={16} />
              <div style={styles.modeTextCol}>
                <span style={styles.modeTitle}>Google Sheets Mode</span>
                <span style={styles.modeDesc}>Synchronize live with API</span>
              </div>
            </button>
          </div>

          <form onSubmit={handleTestConnection} style={styles.form}>
            <div className="form-group">
              <label className="form-label">Google Apps Script Web App URL</label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                className="form-input"
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
              />
              <span style={styles.fieldHelp}>Paste the deployed Apps Script URL. Do not use sheet ID directly.</span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={testing}
            >
              {testing ? 'Verifying Link...' : 'Test & Sync Connection'}
            </button>
          </form>

          {testResult && (
            <div style={{
              ...styles.alertBox,
              backgroundColor: testResult.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              borderColor: testResult.success ? 'var(--color-success-border)' : 'var(--color-danger-border)',
              color: testResult.success ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              {testResult.success ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Apps Script Guide Trigger */}
          <button 
            onClick={() => setShowGuide(!showGuide)}
            style={styles.guideTrigger}
          >
            <HelpCircle size={16} />
            <span>How do I get my Web App URL?</span>
          </button>

          {showGuide && (
            <div style={styles.guideContent}>
              <ol style={styles.guideList}>
                <li>Open your Google Sheet and click <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Delete any default code, and copy-paste the contents of <strong><code>google-apps-script.js</code></strong> (found in the root folder of this project) into the editor.</li>
                <li>Click the <strong>Deploy</strong> button in the top right &gt; select <strong>New deployment</strong>.</li>
                <li>Click the gear icon next to "Select type" and select <strong>Web app</strong>.</li>
                <li>Configure the deployment:
                  <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                    <li><strong>Description</strong>: Attendance App Backend</li>
                    <li><strong>Execute as</strong>: <code>Me (your-email)</code></li>
                    <li><strong>Who has access</strong>: <code>Anyone</code> (This is crucial so the web app can log codes).</li>
                  </ul>
                </li>
                <li>Click <strong>Deploy</strong>. Authorize permissions when prompted by Google.</li>
                <li>Copy the <strong>Web App URL</strong> from the final screen and paste it into the field above!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Database Utilities */}
        <div className="glass-card">
          <div style={styles.cardHeader}>
            <div style={styles.iconWrapperMuted}>
              <Database size={18} color="var(--text-secondary)" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>System Utilities</h3>
              <p style={styles.cardSubtitle}>Configure local storage testing files</p>
            </div>
          </div>

          <div style={styles.utilityActionRow}>
            <button 
              onClick={async () => {
                onResetDb();
                await onRefreshData();
                alert('Mock database re-seeded successfully! 8 Kalahi-CIDSS Staff and logs loaded.');
              }}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <Sparkles size={16} color="#f59e0b" />
              <span>Load Mock Demo</span>
            </button>
            
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to delete all cached Kalahi-CIDSS Staff lists and log history? This resets to a blank state.')) {
                  localStorage.clear();
                  onResetDb();
                  alert('System local memory cleared.');
                  window.location.reload();
                }
              }}
              className="btn btn-secondary"
              style={{ flex: 1, borderColor: 'var(--color-danger-border)', color: '#ef4444' }}
            >
              <Trash2 size={16} />
              <span>Wipe System</span>
            </button>
          </div>
        </div>
      </div>

      {/* Column 2: Student Enrollment Form */}
      <div className="glass-card">
        <div style={styles.cardHeader}>
          <div style={styles.iconWrapperGreen}>
            <PlusCircle size={18} color="#10b981" />
          </div>
          <div>
            <h3 style={styles.cardTitle}>Register New Kalahi-CIDSS Staff</h3>
            <p style={styles.cardSubtitle}>Add a staff member to the roster database</p>
          </div>
        </div>

        <form onSubmit={handleAddStudent} style={{ marginTop: '0.5rem' }}>
          <div className="form-group">
            <label className="form-label">Staff ID / QR Scanned Code *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="e.g. STF-882"
                className="form-input"
                value={stdId}
                onChange={(e) => setStdId(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setStdId(generateStaffId())}
                className="btn btn-secondary"
                style={{ padding: '0 0.75rem', borderRadius: '8px' }}
                title="Generate Random ID"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Search Staff Name to Auto-Fill *</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="e.g. Sarah Connor"
                className="form-input"
                value={stdName}
                onChange={(e) => {
                  setStdName(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            {/* Dropdown Results */}
            {showDropdown && matchingStudents.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1f2937',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                marginTop: '4px',
                zIndex: 10,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
              }}>
                {matchingStudents.map(student => (
                  <div
                    key={student.studentId}
                    onClick={() => {
                      setStdId(student.studentId);
                      setStdName(student.name);
                      setStdPosition(student.position || '');
                      setStdSex(student.sex || '');
                      setStdOffice(student.office || '');
                      setStdRfid(student.rfid || '');
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={{ fontWeight: 600, color: '#fff' }}>{student.name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{student.studentId} • {student.office || 'No office'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Position</label>
            <input
              type="text"
              placeholder="e.g. Systems Administrator"
              className="form-input"
              value={stdPosition}
              onChange={(e) => setStdPosition(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sex</label>
            <select
              className="form-input"
              value={stdSex}
              onChange={(e) => setStdSex(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Office</label>
            <input
              type="text"
              placeholder="e.g. IT Support Rm 312"
              className="form-input"
              value={stdOffice}
              onChange={(e) => setStdOffice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">RFID Card Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 0001234567"
              className="form-input"
              value={stdRfid}
              onChange={(e) => setStdRfid(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-success"
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            <PlusCircle size={16} />
            <span>Add Kalahi-CIDSS Staff to Database</span>
          </button>
        </form>

        {regStatus && (
          <div style={{
            ...styles.alertBox,
            backgroundColor: regStatus.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            borderColor: regStatus.success ? 'var(--color-success-border)' : 'var(--color-danger-border)',
            color: regStatus.success ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            {regStatus.success ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{regStatus.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  flexCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem'
  },
  iconWrapperBlue: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconWrapperGreen: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconWrapperMuted: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  cardSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  },
  modeContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  modeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '0.85rem 1.15rem',
    background: 'rgba(0, 0, 0, 0.18)',
    border: '1px solid var(--border-glass)',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 0.25s ease',
    color: 'var(--text-secondary)'
  },
  modeButtonActiveSim: {
    background: 'rgba(245, 158, 11, 0.04)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    color: '#f59e0b',
    boxShadow: '0 0 15px rgba(245, 158, 11, 0.05)'
  },
  modeButtonActiveSheets: {
    background: 'rgba(59, 130, 246, 0.04)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    color: '#3b82f6',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.05)'
  },
  modeTextCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.15rem'
  },
  modeTitle: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#ffffff'
  },
  modeDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  fieldHelp: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
    display: 'block'
  },
  alertBox: {
    marginTop: '1rem',
    border: '1px solid',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.825rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    lineHeight: '1.4'
  },
  guideTrigger: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-accent)',
    fontSize: '0.825rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '1rem',
    alignSelf: 'flex-start',
    transition: 'all 0.2s ease'
  },
  guideContent: {
    marginTop: '1rem',
    padding: '1rem 1.15rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    border: '1px solid var(--border-glass)'
  },
  guideList: {
    paddingLeft: '1.2rem',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
  },
  utilityActionRow: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem'
  }
};
