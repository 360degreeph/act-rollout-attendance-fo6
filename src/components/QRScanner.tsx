import React, { useEffect, useState, useRef } from 'react';
import { Camera, CameraOff, AlertTriangle, UserCheck, CornerDownRight, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import type { AttendanceLog } from '../services/sheetsService';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (studentId: string) => Promise<AttendanceLog>;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Notification Toast state (renders inside overlay)
  const [activeToast, setActiveToast] = useState<{
    show: boolean;
    studentId: string;
    studentName: string;
    status: 'IN' | 'OUT';
    timestamp: string;
    position?: string;
    office?: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-reader-viewport';

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
        }, 120);
      } else {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Web Audio beep failed:', e);
    }
  };

  // Get available cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Auto-select env/back camera if available, else first camera
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setErrorMsg('No camera hardware detected on this machine.');
        }
      })
      .catch((err) => {
        console.error('Error fetching cameras:', err);
        setErrorMsg('Camera access is restricted. Please grant camera permission in your browser.');
      });
      
    // No cleanup here to prevent double-stopping the camera
  }, [isOpen]);

  // Auto-start scanning when cameras are loaded and selectedCameraId is set
  useEffect(() => {
    if (isOpen && selectedCameraId) {
      startScanning();
    }
    
    return () => {
      if (isOpen) {
        stopScanning(); // Clean up if camera ID changes while open
      } else {
        // If it's closing, do a safe fire-and-forget stop so we don't block React's cleanup
        stopScanning().catch(console.error);
      }
    };
  }, [isOpen, selectedCameraId]);

  const isCooldownRef = useRef<boolean>(false);

  const startScanning = async () => {
    if (!selectedCameraId) return;

    setErrorMsg('');
    setIsScanning(true);

    try {
      if (scannerRef.current) {
        await stopScanning();
      }
      
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      await scanner.start(
        selectedCameraId,
        {
          fps: 12,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        async (decodedText) => {
          // Play buzzer chimes and push scan record
          if (!isCooldownRef.current) {
            await handleScanAction(decodedText);
          }
        },
        () => {
          // Silent frame parsing failure chimes
        }
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setErrorMsg('Could not start camera feed. It might be occupied by another application.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleScanAction = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;

    try {
      // Set cooldown to prevent duplicate triggers while processing
      isCooldownRef.current = true;

      const log = await onScanSuccess(cleanId);
      playBeep(log.status);

      // Trigger glass slide success modal toast
      setActiveToast({
        show: true,
        studentId: log.studentId,
        studentName: log.studentName,
        status: log.status,
        timestamp: new Date(log.timestamp).toLocaleTimeString([], { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        position: log.position,
        office: log.office
      });

      // Clear toast after 3 seconds
      setTimeout(() => {
        setActiveToast((prev) => (prev && prev.studentId === log.studentId ? { ...prev, show: false } : prev));
      }, 3000);

      // Automatically resume accepting scans in 1.5 seconds so next staff member can scan!
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 1500);

    } catch (err) {
      console.error('Scan error:', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      
      // Auto-restart accepting scans after 3 seconds even on error
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 3000);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div style={{ ...styles.modalOverlay, display: isOpen ? 'flex' : 'none' }}>
      <div style={styles.modalContainer}>
        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <div style={styles.headerTitleRow}>
            <div style={styles.scannerIconWrapper}>
              <Camera size={20} color={isScanning ? '#10b981' : '#3b82f6'} />
            </div>
            <div>
              <h2 style={styles.title}>Live QR Camera</h2>
              <p style={styles.subtitle}>Align staff QR code inside the green guides</p>
            </div>
          </div>
          <button onClick={handleClose} style={styles.closeBtn} title="Close Scanner Window">
            <X size={18} />
          </button>
        </div>

        {/* Modal Camera Viewport */}
        <div className={`scanner-viewport-wrapper ${isScanning ? 'scanning' : ''}`} style={styles.viewportOverride}>
          <div 
            id={scannerId} 
            className="scanner-viewport"
          ></div>
          
          <div className="scanner-overlays">
            {isScanning && <div className="scanner-laser" />}
            {isScanning && <div className="scanner-guides" />}
            
            {!isScanning && (
              <div style={styles.overlayTextContainer}>
                <div style={styles.overlayIconOuter}>
                  <CameraOff size={38} color="rgba(255,255,255,0.15)" />
                </div>
                <p style={styles.overlayTitle}>Camera Offline</p>
                <p style={styles.overlayText}>Accessing device camera streams...</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Controls */}
        <div style={styles.controlsSection}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Video Camera Source</label>
            <select
              className="form-input"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={cameras.length === 0}
              style={styles.selectorInput}
            >
              {cameras.length === 0 ? (
                <option value="">No cameras loaded</option>
              ) : (
                cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {errorMsg && (
            <div style={styles.errorContainer}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Popup Success Toast Overlay (renders inside modal screen center) */}
        <div style={{
          ...styles.toastOverlay,
          opacity: activeToast?.show ? 1 : 0,
          pointerEvents: activeToast?.show ? 'auto' : 'none',
          transform: activeToast?.show ? 'scale(1)' : 'scale(0.95)'
        }}>
          {activeToast && (
            <div style={{
              ...styles.toastCard,
              borderColor: activeToast.status === 'IN' ? 'var(--color-success)' : 'var(--color-warning)',
              boxShadow: activeToast.status === 'IN' ? '0 20px 40px rgba(16, 185, 129, 0.15)' : '0 20px 40px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{
                ...styles.toastIconWrapper,
                backgroundColor: activeToast.status === 'IN' ? 'var(--color-success)' : 'var(--color-warning)'
              }}>
                {activeToast.status === 'IN' ? <UserCheck size={26} color="#fff" /> : <CornerDownRight size={26} color="#fff" />}
              </div>
              <h3 style={styles.toastTitleText}>
                CHECKED {activeToast.status} SUCCESSFULLY
              </h3>
              <p style={styles.toastStaffName}>{activeToast.studentName}</p>
              {activeToast.position && (
                <p style={styles.toastStaffMeta}>{activeToast.position} • {activeToast.office}</p>
              )}
              <div style={styles.toastFooter}>
                <span>ID: {activeToast.studentId}</span>
                <span style={styles.toastDot} />
                <span>{activeToast.timestamp}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(5, 7, 12, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out'
  },
  modalContainer: {
    background: 'var(--bg-glass)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '440px',
    padding: '1.75rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  scannerIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  subtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginTop: '0.15rem'
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-glass)',
    borderRadius: '8px',
    color: 'var(--text-secondary)',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginLeft: '1rem'
  },
  viewportOverride: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    width: '100%',
    aspectRatio: '1',
    maxWidth: '340px'
  },
  overlayTextContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center' as const
  },
  overlayIconOuter: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem'
  },
  overlayTitle: {
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--text-primary)',
    marginBottom: '0.25rem'
  },
  overlayText: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    maxWidth: '200px',
    lineHeight: '1.4'
  },
  controlsSection: {
    width: '100%'
  },
  selectorInput: {
    cursor: 'pointer'
  },
  errorContainer: {
    marginTop: '0.75rem',
    background: 'var(--color-danger-bg)',
    border: '1px solid var(--color-danger-border)',
    color: 'var(--color-danger)',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    lineHeight: '1.3'
  },

  // Success Toast Modal Overlay
  toastOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(10, 12, 18, 0.95)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1010,
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    padding: '1.5rem'
  },
  toastCard: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '2px solid',
    borderRadius: '18px',
    padding: '2rem 1.5rem',
    width: '100%',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.75rem'
  },
  toastIconWrapper: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    marginBottom: '0.5rem'
  },
  toastTitleText: {
    fontSize: '0.75rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const
  },
  toastStaffName: {
    fontWeight: 800,
    fontSize: '1.35rem',
    color: '#ffffff',
    fontFamily: 'var(--font-title)'
  },
  toastStaffMeta: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: 500
  },
  toastFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '0.5rem'
  },
  toastDot: {
    width: '4px',
    height: '4px',
    backgroundColor: 'var(--text-muted)',
    borderRadius: '50%'
  }
};
