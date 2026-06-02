import React, { useState } from 'react';
import { Users, UserCheck, CalendarCheck, Clock, Search, ArrowUpRight, ArrowDownLeft, GraduationCap, Building2 } from 'lucide-react';
import { SheetsService, type Student, type AttendanceLog } from '../services/sheetsService';

interface DashboardProps {
  students: Student[];
  logs: AttendanceLog[];
  onQuickScan: (studentId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  logs,
  onQuickScan
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Move stats calculation below filter

  // Find latest status of each student for roster cards
  const getStudentStatus = (studentId: string): { status: 'IN' | 'OUT' | 'NEVER'; time?: string } => {
    const studentLogs = logs.filter(l => l.studentId.toLowerCase() === studentId.toLowerCase());
    if (studentLogs.length === 0) {
      return { status: 'NEVER' };
    }
    
    // Sort descending by date (logs are already sorted latest first, but safety check)
    const latestLog = studentLogs[0];
    const time = new Date(latestLog.timestamp).toLocaleTimeString([], { 
      timeZone: 'Asia/Manila',
      hour: '2-digit', 
      minute: '2-digit' 
    });
    return { status: latestLog.status, time };
  };

  // Filter roster list
  const filteredRoster = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.department && student.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.office && student.office.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.position && student.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Dynamically filter logs to match only the currently searched staff
  const filteredIds = new Set(filteredRoster.map(s => s.studentId));
  const filteredLogs = logs.filter(l => filteredIds.has(l.studentId));

  // Compute dynamic dashboard metrics based on the filtered subset!
  const stats = SheetsService.getDashboardStats(filteredRoster, filteredLogs, targetDate);

  // Find max value in hourly/weekly stats for scaling the SVG/CSS bar height
  const maxHourlyCount = Math.max(...stats.hourlyStats.map(s => s.count), 1);
  const maxWeeklyCount = Math.max(...stats.weeklyStats.map(s => s.count), 1);

  return (
    <div>
      {/* 1. Metrics Grid */}
      <div className="dashboard-grid">
        {/* Metric 1 */}
        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Present Right Now</span>
            <div style={{ ...styles.metricIconWrapper, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <UserCheck size={20} color="#10b981" />
            </div>
          </div>
          <div className="metric-value">{stats.checkedInNow}</div>
          <span style={styles.metricSubtitle}>Active Kalahi-CIDSS Staff checked IN</span>
        </div>

        {/* Metric 2 */}
        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Total Scans (Filtered Date)</span>
            <div style={{ ...styles.metricIconWrapper, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
              <Clock size={20} color="#3b82f6" />
            </div>
          </div>
          <div className="metric-value">{stats.scansToday}</div>
          <span style={styles.metricSubtitle}>IN / OUT scans logged on {new Date(targetDate).toLocaleDateString([], { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}</span>
        </div>

        {/* Metric 3 */}
        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Attendance Rate</span>
            <div style={{ ...styles.metricIconWrapper, background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
              <CalendarCheck size={20} color="#06b6d4" />
            </div>
          </div>
          <div className="metric-value">{stats.attendanceRate}%</div>
          <span style={styles.metricSubtitle}>Of {stats.totalStudents} total Kalahi-CIDSS Staff</span>
        </div>

        {/* Metric 4 */}
        <div className="glass-card metric-card" style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricTitle}>Registered Kalahi-CIDSS Staff</span>
            <div style={{ ...styles.metricIconWrapper, background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Users size={20} color="#9ca3af" />
            </div>
          </div>
          <div className="metric-value">{stats.totalStudents}</div>
          <span style={styles.metricSubtitle}>Enrolled in system database</span>
        </div>
      </div>

      {/* 2. Visual Charts Grid */}
      <div className="layout-grid" style={{ marginBottom: '2rem' }}>
        {/* Hourly Check-ins bar chart */}
        <div className="glass-card">
          <h3 style={styles.chartTitle}>{targetDate === new Date().toISOString().split('T')[0] ? "Today's" : new Date(targetDate).toLocaleDateString([], { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })} Traffic by Hour</h3>
          <p style={styles.chartSubtitle}>Scan counts hourly throughout the workday</p>
          <div className="chart-bar-container">
            {stats.hourlyStats.map((item) => {
              const heightPercent = (item.count / maxHourlyCount) * 90; // scale up to 90%
              return (
                <div key={item.hour} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar" 
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  >
                    <div className="chart-bar-tooltip">{item.count} scans</div>
                  </div>
                  <span className="chart-label">{item.hour.split(':')[0]}h</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Check-ins bar chart */}
        <div className="glass-card">
          <h3 style={styles.chartTitle}>Activity (Last 7 Days)</h3>
          <p style={styles.chartSubtitle}>Historical scan volume over past week</p>
          <div className="chart-bar-container">
            {stats.weeklyStats.map((item, idx) => {
              const heightPercent = (item.count / maxWeeklyCount) * 90;
              return (
                <div key={`${item.day}-${idx}`} className="chart-bar-wrapper">
                  <div 
                    className="chart-bar chart-bar-success" 
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  >
                    <div className="chart-bar-tooltip">{item.count} scans</div>
                  </div>
                  <span className="chart-label">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Student Roster Directory */}
      <div className="glass-card">
        <div style={styles.rosterHeader}>
          <div>
            <h3 style={styles.rosterTitle}>Kalahi-CIDSS Staff Attendance Roster</h3>
            <p style={styles.rosterSubtitle}>Search Kalahi-CIDSS Staff, review their live state, or trigger a manual scan</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            <div style={styles.searchContainer}>
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by staff name, ID, or office..."
                className="form-input"
                style={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', width: 'auto', minWidth: '140px', cursor: 'pointer' }}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              title="Filter dashboard statistics by date"
            />
          </div>
        </div>

        {/* Grid of Student Cards */}
        {filteredRoster.length === 0 ? (
          <div style={styles.emptyRoster}>
            <GraduationCap size={44} color="rgba(255,255,255,0.06)" />
            <p style={styles.emptyRosterTitle}>No Kalahi-CIDSS Staff match search</p>
            <p style={styles.emptyRosterText}>Try searching another keyword or register staff in Settings.</p>
          </div>
        ) : (
          <div className="roster-grid" style={styles.rosterGrid}>
            {filteredRoster.map((std) => {
              const { status, time } = getStudentStatus(std.studentId);
              const totalScans = logs.filter(l => l.studentId.toLowerCase() === std.studentId.toLowerCase()).length;
              
              // Initials for avatar
              const initials = std.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase() || '?';

              return (
                <div key={std.studentId} className="glass-card interactive" style={styles.rosterCard}>
                  {/* Card Header: Avatar & Info */}
                  <div style={styles.rosterCardTop}>
                    <div style={styles.avatarCircle}>{initials}</div>
                    <div style={styles.rosterCardMeta}>
                      <h4 style={styles.studentNameText}>{std.name}</h4>
                      <span style={styles.studentIdText}>ID: {std.studentId}</span>
                    </div>
                  </div>

                  {/* Card Body: Position, Office & Email */}
                  <div style={styles.rosterCardBody}>
                    {std.position && (
                      <div style={{ ...styles.rosterRow, color: 'var(--text-primary)', fontWeight: 600, marginBottom: '2px' }}>
                        <span>{std.position}</span>
                        {std.sex && <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.72rem' }}>({std.sex})</span>}
                      </div>
                    )}
                    <div style={styles.rosterRow}>
                      <Building2 size={12} color="var(--text-muted)" />
                      <span>{std.office || std.department}</span>
                    </div>
                    {std.email && (
                      <span style={styles.studentEmail}>{std.email}</span>
                    )}
                  </div>

                  {/* Card Footer: Status Pill & Toggle Action Button */}
                  <div style={styles.rosterCardFooter}>
                    <div>
                      {status === 'IN' && (
                        <div style={styles.statusPillIn}>
                          <ArrowUpRight size={10} />
                          <span>IN since {time}</span>
                        </div>
                      )}
                      {status === 'OUT' && (
                        <div style={styles.statusPillOut}>
                          <ArrowDownLeft size={10} />
                          <span>OUT since {time}</span>
                        </div>
                      )}
                      {status === 'NEVER' && (
                        <div style={styles.statusPillNever}>
                          <span>No Activity Yet</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{totalScans} Scan{totalScans !== 1 ? 's' : ''}</span>
                      <button
                        onClick={() => onQuickScan(std.studentId)}
                        style={styles.quickScanBtn}
                        title={`Trigger attendance log for ${std.name}`}
                      >
                        Scan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  metricCard: {
    padding: '1.25rem 1.5rem 1rem'
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  metricTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  metricIconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  metricSubtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
    display: 'block'
  },
  
  // Charts
  chartTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  chartSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.5rem'
  },
  
  // Roster section
  rosterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '1rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '1rem'
  },
  rosterTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  rosterSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  searchContainer: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '320px'
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)'
  },
  searchInput: {
    paddingLeft: '2.3rem',
    fontSize: '0.85rem'
  },
  emptyRoster: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 2rem',
    textAlign: 'center' as const
  },
  emptyRosterTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    marginTop: '0.85rem',
    marginBottom: '0.2rem'
  },
  emptyRosterText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    maxWidth: '240px',
    lineHeight: '1.4'
  },
  
  // Grid
  rosterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem'
  },
  rosterCard: {
    padding: '1rem 1.15rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    background: 'rgba(255,255,255,0.015)'
  },
  rosterCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  avatarCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 800,
    color: 'var(--text-primary)'
  },
  rosterCardMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden'
  },
  studentNameText: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#ffffff',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  studentIdText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  rosterCardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    padding: '0.5rem 0.25rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
  },
  rosterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: 500
  },
  studentEmail: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginLeft: '1.2rem',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  rosterCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem'
  },
  quickScanBtn: {
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em'
  },
  
  // Status badges inside cards
  statusPillIn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 700
  },
  statusPillOut: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 700
  },
  statusPillNever: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    color: 'var(--text-muted)',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.02em'
  }
};
