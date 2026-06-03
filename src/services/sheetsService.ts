export interface Student {
  studentId: string;
  name: string;
  department: string; // represents office department/room for layout compatibility
  email: string;
  position?: string;  // POSITION
  sex?: string;       // SEX
  office?: string;    // OFFICE
  qrcode?: string;    // QRCODE
}

export interface AttendanceLog {
  timestamp: string;
  studentId: string;
  studentName: string;
  status: 'IN' | 'OUT';
  department?: string;
  email?: string;
  position?: string;
  sex?: string;
  office?: string;
  qrcode?: string;
}

export interface DashboardStats {
  totalStudents: number;
  checkedInNow: number;
  scansToday: number;
  attendanceRate: number;
  hourlyStats: { hour: string; count: number }[];
  weeklyStats: { day: string; count: number }[];
}

const STORAGE_KEYS = {
  MODE: 'attendance_mode', // 'simulation' | 'sheets'
  SCRIPT_URL: 'attendance_script_url',
  STUDENTS: 'attendance_students',
  LOGS: 'attendance_logs'
};

// Initial Mock Staffs matching headers ID, NAME, POSITION, SEX, OFFICE, QRCODE
const MOCK_STUDENTS: Student[] = [
  { studentId: 'STF-201', name: 'Dr. David Carter', department: 'Dean Office Rm 102', email: 'david.carter@school.edu', position: 'Dean of Engineering', sex: 'Male', office: 'Dean Office Rm 102', qrcode: 'STF-201' },
  { studentId: 'STF-202', name: 'Elena Vance', department: 'Civil Dept Rm 204', email: 'elena.vance@school.edu', position: 'Assistant Professor', sex: 'Female', office: 'Civil Dept Rm 204', qrcode: 'STF-202' },
  { studentId: 'STF-203', name: 'Marcus Brody', department: 'Admin Center Bldg A', email: 'marcus.brody@school.edu', position: 'Chief Administrator', sex: 'Male', office: 'Admin Center Bldg A', qrcode: 'STF-203' },
  { studentId: 'STF-204', name: 'Chloe Frazer', department: 'IT Support Rm 312', email: 'chloe.frazer@school.edu', position: 'System Administrator', sex: 'Female', office: 'IT Support Rm 312', qrcode: 'STF-204' },
  { studentId: 'STF-205', name: 'Victor Sullivan', department: 'Finance Rm 114', email: 'victor.s@school.edu', position: 'Chief Financial Officer', sex: 'Male', office: 'Finance Rm 114', qrcode: 'STF-205' },
  { studentId: 'STF-206', name: 'Samuel Drake', department: 'Registrar Rm 105', email: 'sam.drake@school.edu', position: 'Registrar Staff', sex: 'Male', office: 'Registrar Rm 105', qrcode: 'STF-206' }
];

// Helper to generate mock logs for the past 24 hours
const generateMockLogs = (students: Student[]): AttendanceLog[] => {
  const logs: AttendanceLog[] = [];
  const now = new Date();
  
  // Create some IN and OUT entries for yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  students.slice(0, 5).forEach((student, index) => {
    // Check In yesterday morning
    const checkInTime = new Date(yesterday);
    checkInTime.setHours(8, 15 + index * 10, 0);
    logs.push({
      timestamp: checkInTime.toISOString(),
      studentId: student.studentId,
      studentName: student.name,
      status: 'IN',
      department: student.department,
      email: student.email
    });
    
    // Check Out yesterday afternoon
    const checkOutTime = new Date(yesterday);
    checkOutTime.setHours(17, 5 - index * 8, 0);
    logs.push({
      timestamp: checkOutTime.toISOString(),
      studentId: student.studentId,
      studentName: student.name,
      status: 'OUT',
      department: student.department,
      email: student.email
    });
  });

  // Create active checks for today
  students.slice(0, 4).forEach((student, index) => {
    const todayInTime = new Date(now);
    todayInTime.setHours(8, 5 + index * 12, 0);
    logs.push({
      timestamp: todayInTime.toISOString(),
      studentId: student.studentId,
      studentName: student.name,
      status: 'IN',
      department: student.department,
      email: student.email
    });

    // Check out some of them
    if (index % 2 === 0) {
      const todayOutTime = new Date(now);
      todayOutTime.setHours(12, 10 + index * 15, 0);
      logs.push({
        timestamp: todayOutTime.toISOString(),
        studentId: student.studentId,
        studentName: student.name,
        status: 'OUT',
        department: student.department,
        email: student.email
      });
    }
  });

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export class SheetsService {
  // Get active connection mode ('simulation' or 'sheets')
  static getMode(): 'simulation' | 'sheets' {
    return (localStorage.getItem(STORAGE_KEYS.MODE) as 'simulation' | 'sheets') || 'sheets';
  }

  // Set active connection mode
  static setMode(mode: 'simulation' | 'sheets'): void {
    localStorage.setItem(STORAGE_KEYS.MODE, mode);
  }

  // Get Google Apps Script Web App URL
  static getScriptUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.SCRIPT_URL) || 'https://script.google.com/macros/s/AKfycbwxFQZWF1Bg_QylSS0sfXwQPxl5dezNFboHDoQZDLPP3XJgH_kF6kEZlrL-diN46Yuf/exec';
  }

  // Set Google Apps Script Web App URL
  static setScriptUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url);
  }

  // Initialize LocalStorage Database with dummy data if not already set
  static initializeLocalData(): void {
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(MOCK_STUDENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      const students = this.getLocalStudents();
      const mockLogs = generateMockLogs(students);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(mockLogs));
    }
  }

  // Get locally cached Students
  static getLocalStudents(): Student[] {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return data ? JSON.parse(data) : [];
  }

  // Save Students locally
  static saveLocalStudents(students: Student[]): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  // Get locally cached Logs
  static getLocalLogs(): AttendanceLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.LOGS);
    return data ? JSON.parse(data) : [];
  }

  // Save Logs locally
  static saveLocalLogs(logs: AttendanceLog[]): void {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }

  // Clear all logs and students
  static resetLocalDatabase(): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(MOCK_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(generateMockLogs(MOCK_STUDENTS)));
  }

  // Fetch all Students and Logs from active backend
  static async fetchData(): Promise<{ students: Student[]; logs: AttendanceLog[] }> {
    const mode = this.getMode();
    const scriptUrl = this.getScriptUrl();

    if (mode === 'simulation' || !scriptUrl) {
      this.initializeLocalData();
      return {
        students: this.getLocalStudents(),
        logs: this.getLocalLogs()
      };
    }

    try {
      const response = await fetch(`${scriptUrl}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        // Sync local storage cache
        this.saveLocalStudents(data.students);
        
        // Parse date objects properly
        const parsedLogs = data.logs.map((log: any) => ({
          ...log,
          timestamp: typeof log.timestamp === 'string' ? log.timestamp : new Date(log.timestamp).toISOString()
        })).sort((a: AttendanceLog, b: AttendanceLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        this.saveLocalLogs(parsedLogs);
        return { students: data.students, logs: parsedLogs };
      } else {
        throw new Error(data.error || 'Failed to fetch from Google Sheets API');
      }
    } catch (error) {
      console.error('Fetch error, falling back to local cache:', error);
      // Fallback to local storage if API call fails
      return {
        students: this.getLocalStudents(),
        logs: this.getLocalLogs()
      };
    }
  }

  // Record a Scan log
  static async scanStudent(studentId: string): Promise<AttendanceLog> {
    const cleanId = studentId.trim();
    if (!cleanId) {
      throw new Error('Student ID cannot be empty');
    }

    const mode = this.getMode();
    const scriptUrl = this.getScriptUrl();

    if (mode === 'simulation' || !scriptUrl) {
      // Handle simulation check
      this.initializeLocalData();
      const students = this.getLocalStudents();
      const logs = this.getLocalLogs();

      let student = students.find(s => s.studentId.toLowerCase() === cleanId.toLowerCase());
      
      // Auto-register student if they don't exist in dummy list
      if (!student) {
        student = {
          studentId: cleanId,
          name: `Student (${cleanId})`,
          department: 'Auto-Registered',
          email: ''
        };
        students.push(student);
        this.saveLocalStudents(students);
      }

      // Check last log for this student to toggle
      const studentLogs = logs.filter(l => l.studentId.toLowerCase() === cleanId.toLowerCase());
      const lastLog = studentLogs[0]; // Sort order is descending, so 0 is latest
      const nextStatus = (lastLog && lastLog.status === 'IN') ? 'OUT' : 'IN';
      
      const newLog: AttendanceLog = {
        timestamp: new Date().toISOString(),
        studentId: student.studentId,
        studentName: student.name,
        status: nextStatus,
        department: student.department,
        email: student.email
      };

      logs.unshift(newLog); // Put at front
      this.saveLocalLogs(logs);
      return newLog;
    }

    // Google Sheets mode
    try {
      // We perform a POST request to Google Apps Script Web App URL.
      // Using application/x-www-form-urlencoded prevents CORS preflight (OPTIONS) 
      // AND allows Apps Script to automatically populate `e.parameter` correctly.
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          action: 'scan',
          studentId: cleanId
        }).toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Log is returned from sheets
        const newLog: AttendanceLog = {
          timestamp: data.log.timestamp,
          studentId: data.log.studentId,
          studentName: data.log.studentName,
          status: data.log.status as 'IN' | 'OUT',
          department: data.log.department,
          email: data.log.email
        };

        // Prepend to local logs cache
        const localLogs = this.getLocalLogs();
        localLogs.unshift(newLog);
        this.saveLocalLogs(localLogs);

        // Also check if student was auto-registered, update student cache
        const localStudents = this.getLocalStudents();
        if (!localStudents.some(s => s.studentId === newLog.studentId)) {
          localStudents.push({
            studentId: newLog.studentId,
            name: newLog.studentName,
            department: newLog.department || 'Auto-Registered',
            email: newLog.email || ''
          });
          this.saveLocalStudents(localStudents);
        }

        return newLog;
      } else {
        throw new Error(data.error || 'Failed to scan log in Google Sheets');
      }
    } catch (error) {
      console.error('Sheets POST error, falling back to local simulation scan:', error);
      // Let's toggle to simulation mode scan or raise error
      throw new Error(`Failed to connect to Google Sheets backend API. Please verify Web App URL.\nOriginal error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Register a new student
  static async registerStudent(student: Student): Promise<void> {
    const mode = this.getMode();
    const scriptUrl = this.getScriptUrl();

    if (mode === 'simulation' || !scriptUrl) {
      this.initializeLocalData();
      const students = this.getLocalStudents();
      const index = students.findIndex(s => s.studentId.toLowerCase() === student.studentId.toLowerCase());
      
      if (index >= 0) {
        students[index] = student;
      } else {
        students.push(student);
      }
      this.saveLocalStudents(students);
      return;
    }

    // Google Sheets mode
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          action: 'register',
          studentId: student.studentId,
          name: student.name,
          department: student.department || '',
          position: student.position || '',
          sex: student.sex || '',
          office: student.office || ''
        }).toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to register student in Google Sheets');
      }

      // Update local storage cache
      const students = this.getLocalStudents();
      const idx = students.findIndex(s => s.studentId === student.studentId);
      if (idx >= 0) {
        students[idx] = student;
      } else {
        students.push(student);
      }
      this.saveLocalStudents(students);

    } catch (error) {
      console.error('Sheets Register error:', error);
      throw error;
    }
  }

  // Helper to safely get YYYY-MM-DD in Manila Time
  static getManilaDateString(date: Date | string): string {
    const d = new Date(date);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  // Compute Dashboard Statistics based on logs
  static getDashboardStats(students: Student[], logs: AttendanceLog[], targetDateStr?: string): DashboardStats {
    const targetManilaDate = targetDateStr || this.getManilaDateString(new Date());
    
    // Total registered students
    const totalStudents = students.length || 1;

    // Filter logs for targetDate
    const todayLogs = logs.filter(log => {
      return this.getManilaDateString(log.timestamp) === targetManilaDate;
    });

    // Scans today
    const scansToday = todayLogs.length;

    // Checked-in now: For each student, check their latest log status up to targetDate
    const latestStatusMap = new Map<string, 'IN' | 'OUT'>();
    const logsUpToTarget = logs.filter(log => this.getManilaDateString(log.timestamp) <= targetManilaDate);
    
    logsUpToTarget.forEach(log => {
      if (!latestStatusMap.has(log.studentId)) {
        latestStatusMap.set(log.studentId, log.status);
      }
    });

    let checkedInNow = 0;
    latestStatusMap.forEach((status) => {
      if (status === 'IN') {
        checkedInNow++;
      }
    });

    // Attendance Rate (Students who checked in today / Total Students)
    const uniqueCheckedInToday = new Set(
      todayLogs.filter(l => l.status === 'IN').map(l => l.studentId)
    ).size;
    const attendanceRate = Math.round((uniqueCheckedInToday / totalStudents) * 100);

    // Compute Hourly Stats for today (Active scans by hour of the day)
    const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const hourlyCounts = hours.map(h => {
      const hInt = parseInt(h.split(':')[0]);
      const count = todayLogs.filter(log => {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false });
        const parts = formatter.formatToParts(new Date(log.timestamp));
        const logHourStr = parts.find(p => p.type === 'hour')?.value || '0';
        const logHour = parseInt(logHourStr) % 24;
        return logHour === hInt;
      }).length;
      return { hour: h, count };
    });

    // Compute Weekly Stats (Last 7 Days ending on targetDate)
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyCounts = Array.from({ length: 7 }).map((_, i) => {
      // Parse targetManilaDate as UTC noon to safely shift days
      const d = new Date(`${targetManilaDate}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      const dayStr = d.toISOString().split('T')[0];
      
      const count = logs.filter(log => {
        return this.getManilaDateString(log.timestamp) === dayStr;
      }).length;

      return {
        day: weekdays[d.getUTCDay()],
        count
      };
    });

    return {
      totalStudents,
      checkedInNow,
      scansToday,
      attendanceRate,
      hourlyStats: hourlyCounts,
      weeklyStats: weeklyCounts
    };
  }
}
