export interface Worker {
  id: string;
  name: string;
  phone: string;
  defaultRate: number; // ₹ per kg of leaves plucked (default e.g. 6)
  role: 'Plucker' | 'Weeder' | 'Pruner' | 'Supervisor' | 'Other';
  active: boolean;
  createdAt: string;
}

export interface DailyYield {
  id: string;
  date: string; // YYYY-MM-DD
  workerId: string;
  workerName: string;
  activity: 'Plucking' | 'Pruning' | 'Weeding' | 'Sorting' | 'Irrigation' | 'Fertilizing' | 'Other';
  leavesPlucked: number; // in kg (0 if non-plucking activity)
  wageRate: number; // ₹ per kg (e.g. 6) or flat rate for activity
  baseWages: number; // leavesPlucked * wageRate
  cashAdvanceTaken: boolean; // workers took money today or not
  cashAdvanceAmount: number; // how much money they took today
  netPayable: number; // baseWages - cashAdvanceAmount
  paymentStatus: 'Paid' | 'Pending';
  notes: string;
}

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  teaType: string; // "Raw Leaves", "Processed Black CTC", "Processed Green", etc.
  quantity: number; // in kg
  pricePerKg: number; // ₹ per kg
  totalAmount: number; // quantity * pricePerKg
  buyerName: string;
  notes: string;
}

export interface SyncConfig {
  clientId: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  accessToken: string | null;
  tokenExpiresAt: number | null; // epoch ms
  isLinked: boolean;
  lastSyncedAt: string | null;
}

export const ALLOWED_MANAGERS = [
  'yougrajbora1@gmail.com',
  'yougrajbora.developer@gmail.com',
  'yougrajbora5683@gmail.com'
];

