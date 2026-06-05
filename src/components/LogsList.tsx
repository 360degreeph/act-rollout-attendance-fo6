import React, { useState } from 'react';
import { Search, Download, ArrowUpRight, ArrowDownLeft, Clock, History } from 'lucide-react';
import type { AttendanceLog } from '../services/sheetsService';
import { maskName } from '../utils/maskName';

interface LogsListProps {
  logs: AttendanceLog[];
}

export const LogsList: React.FC<LogsListProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Format Date beautifully
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return { dateStr: 'Invalid Date', timeStr: '' };
      }

      const dateStr = date.toLocaleDateString([], { 
        timeZone: 'Asia/Manila',
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString([], { 
        timeZone: 'Asia/Manila',
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      return { dateStr, timeStr };
    } catch (e) {
      return { dateStr: 'N/A', timeStr: '' };
    }
  };

  // Filter logs based on search and status pills
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.department && log.department.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = 
      statusFilter === 'ALL' || 
      log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export to CSV Function
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Timestamp', 'Student ID', 'Student Name', 'Department', 'Email', 'Status'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.studentId,
      log.studentName,
      log.department || 'N/A',
      log.email || 'N/A',
      log.status
    ]);

    const csvContent = 
      "data:text/csv;charset=utf-8," + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-card" style={styles.container}>
      {/* Title & Actions */}
      <div style={styles.header}>
        <div style={styles.titleWrapper}>
          <div style={styles.historyIconWrapper}>
            <History size={18} color="#3b82f6" />
          </div>
          <div>
            <h3 style={styles.title}>Real-Time Scan Logs</h3>
            <p style={styles.subtitle}>Showing {filteredLogs.length} entries</p>
          </div>
        </div>

        <button 
          onClick={exportToCSV}
          className="btn btn-secondary"
          style={styles.exportBtn}
          disabled={filteredLogs.length === 0}
          title="Export current filtered list to CSV"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterRow}>
        <div style={styles.searchContainer}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by ID, name, department..."
            className="form-input"
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={styles.statusFilters}>
          <button
            onClick={() => setStatusFilter('ALL')}
            style={{
              ...styles.filterTab,
              ...(statusFilter === 'ALL' ? styles.filterTabActive : {})
            }}
          >
            All Logs
          </button>
          <button
            onClick={() => setStatusFilter('IN')}
            style={{
              ...styles.filterTab,
              ...(statusFilter === 'IN' ? { ...styles.filterTabActive, borderColor: '#10b981', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)' } : {})
            }}
          >
            Checks IN
          </button>
          <button
            onClick={() => setStatusFilter('OUT')}
            style={{
              ...styles.filterTab,
              ...(statusFilter === 'OUT' ? { ...styles.filterTabActive, borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)' } : {})
            }}
          >
            Checks OUT
          </button>
        </div>
      </div>

      {/* Scrollable Logs Grid */}
      <div style={styles.logsTableWrapper}>
        {filteredLogs.length === 0 ? (
          <div style={styles.emptyState}>
            <Clock size={38} color="rgba(255,255,255,0.08)" />
            <p style={styles.emptyTitle}>No matching logs found</p>
            <p style={styles.emptyText}>Try adjusting your filters or scan a QR code to begin.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: '45%' }}>Staff Member</th>
                <th style={{ ...styles.th, width: '20%' }}>Status</th>
                <th style={{ ...styles.th, width: '35%' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => {
                const { dateStr, timeStr } = formatDateTime(log.timestamp);
                const isCheckIn = log.status === 'IN';
                
                // Get initials for avatar placeholder
                const initials = log.studentName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || '?';

                return (
                  <tr 
                    key={`${log.studentId}-${log.timestamp}-${index}`} 
                    className="log-row-enter"
                    style={{
                      ...styles.tr,
                      animationDelay: `${Math.min(index * 0.04, 0.4)}s`
                    }}
                  >
                    {/* Student Info */}
                    <td style={styles.td}>
                      <div style={styles.studentCell}>
                        <div style={{
                          ...styles.avatar,
                          border: `1.5px solid ${isCheckIn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                        }}>
                          {initials}
                        </div>
                        <div style={styles.studentDetails}>
                          <span style={styles.studentName}>{maskName(log.studentName)}</span>
                          <span style={styles.studentId}>ID: {maskName(log.studentId)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td style={styles.td}>
                      <span className={isCheckIn ? 'badge badge-in' : 'badge badge-out'}>
                        {isCheckIn ? (
                          <>
                            <ArrowUpRight size={12} />
                            <span>IN</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft size={12} />
                            <span>OUT</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Time */}
                    <td style={styles.td}>
                      <div style={styles.timeCell}>
                        <span style={styles.timeStr}>{timeStr}</span>
                        <span style={styles.dateStr}>{dateStr}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '450px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem'
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem'
  },
  historyIconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(59, 130, 246, 0.08)',
    border: '1px solid rgba(59, 130, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  exportBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    borderRadius: '10px'
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap' as const
  },
  searchContainer: {
    position: 'relative' as const,
    flex: 1,
    minWidth: '240px'
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
  statusFilters: {
    display: 'flex',
    gap: '0.5rem',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '3px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.03)'
  },
  filterTab: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-secondary)',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  filterTabActive: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff'
  },
  logsTableWrapper: {
    overflowY: 'auto' as const,
    flex: 1,
    maxHeight: '380px',
    border: '1px solid var(--border-glass)',
    borderRadius: '10px',
    background: 'rgba(0,0,0,0.15)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const
  },
  theadRow: {
    borderBottom: '1px solid var(--border-glass)',
    background: '#0f172a', // Solid background prevents text bleed-through when scrolling
    position: 'sticky' as const,
    top: 0,
    zIndex: 10
  },
  th: {
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    transition: 'background 0.2s ease',
    opacity: 0 // Will animate in
  },
  td: {
    padding: '0.85rem 1rem',
    verticalAlign: 'middle'
  },
  studentCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#ffffff'
  },
  studentDetails: {
    display: 'flex',
    flexDirection: 'column' as const
  },
  studentName: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: '#ffffff'
  },
  studentId: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  timeCell: {
    display: 'flex',
    flexDirection: 'column' as const
  },
  timeStr: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff'
  },
  dateStr: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)'
  },
  
  // Empty State
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center' as const
  },
  emptyTitle: {
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--text-primary)',
    marginTop: '1rem',
    marginBottom: '0.25rem'
  },
  emptyText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    maxWidth: '280px',
    lineHeight: '1.4'
  }
};
