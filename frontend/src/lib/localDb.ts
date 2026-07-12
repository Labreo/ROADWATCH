import fs from 'fs';
import path from 'path';

export type LocalReport = {
  id: string;
  image_url: string;
  location: string;
  lat: number;
  lng: number;
  type: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  impact_level: number;
  governing_body: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

const DB_FILE = path.join(process.cwd(), 'db_store.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function initializeDb() {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.warn('Failed to initialize local DB on read-only filesystem:', error);
  }
}

export function getLocalReports(): LocalReport[] {
  initializeDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data) as LocalReport[];
  } catch (error) {
    return [];
  }
}

export function saveLocalReports(reports: LocalReport[]) {
  initializeDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(reports, null, 2));
  } catch (error) {
    console.error('Error writing local DB:', error);
  }
}

export async function createLocalReport(reportData: Omit<LocalReport, 'id' | 'created_at' | 'status'>): Promise<LocalReport> {
  const reports = getLocalReports();
  const newReport: LocalReport = {
    ...reportData,
    id: crypto.randomUUID ? crypto.randomUUID() : `rep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  reports.unshift(newReport);
  saveLocalReports(reports);
  return newReport;
}

export function updateLocalReportStatus(id: string, status: LocalReport['status']): boolean {
  const reports = getLocalReports();
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) return false;
  reports[index].status = status;
  saveLocalReports(reports);
  return true;
}

export async function saveLocalImage(imageFile: File): Promise<string> {
  initializeDb();
  const buffer = Buffer.from(await imageFile.arrayBuffer());
  const ext = imageFile.name.split('.').pop() || 'jpg';
  const fileName = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${fileName}`;
}
