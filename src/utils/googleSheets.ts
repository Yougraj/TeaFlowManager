import { Worker, DailyYield, Sale } from '../types';

/**
 * Creates a brand new Google Spreadsheet in user's Drive with dedicated sheets:
 * "Workers", "Daily_Yield", "Sales"
 */
export async function createSpreadsheet(
  accessToken: string,
  estateName: string = "Green Fields Tea Estate"
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      properties: {
        title: `${estateName} - Tea Estate Ledger`
      },
      sheets: [
        {
          properties: {
            title: 'Workers',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        },
        {
          properties: {
            title: 'Daily_Yield',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        },
        {
          properties: {
            title: 'Sales',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google API failed to create spreadsheet: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Syncs entire App State (Workers, Yield, Sales) to the connected Google Spreadsheet.
 * Overwrites with latest state to guarantee consistency.
 */
export async function syncDataToSheet(
  accessToken: string,
  spreadsheetId: string,
  workers: Worker[],
  yields: DailyYield[],
  sales: Sale[]
): Promise<boolean> {
  // Prep Workers Range Values
  const workerHeaders = [
    'Worker ID', 'Name', 'Phone', 'Default Wage Rate (₹/kg)', 'Role/Job', 'Status', 'Registration Date'
  ];
  const workerRows = workers.map(w => [
    w.id,
    w.name,
    w.phone,
    w.defaultRate,
    w.role,
    w.active ? 'Active' : 'Inactive',
    w.createdAt
  ]);
  const workerData = [workerHeaders, ...workerRows];

  // Prep Yield Range Values
  const yieldHeaders = [
    'Yield ID', 'Date', 'Worker ID', 'Worker Name', 'Activity Type', 'Plucked Leaves (kg)', 
    'Wage Rate (₹/kg)', 'Base Earnings (₹)', 'Cash Advance Taken?', 'Advance Amount (₹)', 
    'Net Payable (₹)', 'Payment Status', 'Notes'
  ];
  const yieldRows = yields.map(y => [
    y.id,
    y.date,
    y.workerId,
    y.workerName,
    y.activity,
    y.leavesPlucked,
    y.wageRate,
    y.baseWages,
    y.cashAdvanceTaken ? 'Yes' : 'No',
    y.cashAdvanceAmount,
    y.netPayable,
    y.paymentStatus,
    y.notes || ''
  ]);
  const yieldData = [yieldHeaders, ...yieldRows];

  // Prep Sales Range Values
  const salesHeaders = [
    'Sale ID', 'Date', 'Invoice/Receipt No.', 'Tea Product/Type', 'Quantity Sold (kg)', 
    'Selling Price (₹/kg)', 'Total Revenue (₹)', 'Buyer/Client Name', 'Notes'
  ];
  const salesRows = salesVectorMap(sales);
  const salesData = [salesHeaders, ...salesRows];

  // Helper to sync single sheet
  const uploadSheetData = async (sheetName: string, values: any[][]) => {
    // 1. Clear existing range first to ensure we do not leave orphaned old entries
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z10000:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // 2. Put values starting at A1
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=USER_ENTERED`;
    const res = await fetch(writeUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        range: `${sheetName}!A1`,
        majorDimension: 'ROWS',
        values: values
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sync failure for ${sheetName}: ${text}`);
    }
  };

  // Perform parallel uploads of all 3 grid tables
  await Promise.all([
    uploadSheetData('Workers', workerData),
    uploadSheetData('Daily_Yield', yieldData),
    uploadSheetData('Sales', salesData)
  ]);

  return true;
}

// Maps Sales list into raw data row vectors safely
function salesVectorMap(sales: Sale[]): any[][] {
  return sales.map(s => [
    s.id,
    s.date,
    s.invoiceNo,
    s.teaType,
    s.quantity,
    s.pricePerKg,
    s.totalAmount,
    s.buyerName,
    s.notes || ''
  ]);
}

/**
 * Downloads Sheets data from connected Spreadsheet and parses back into App State.
 * Enables syncing and retrieving cloud edits.
 */
export async function fetchDataFromSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ workers: Worker[]; yields: DailyYield[]; sales: Sale[] }> {
  const fetchSheetData = async (sheetName: string) => {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:Z5000`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      throw new Error(`Failed to load sheet [${sheetName}]: ${await res.text()}`);
    }
    const data = await res.json();
    return data.values as any[][] | undefined;
  };

  const [rawWorkers, rawYields, rawSales] = await Promise.all([
    fetchSheetData('Workers').catch(() => undefined),
    fetchSheetData('Daily_Yield').catch(() => undefined),
    fetchSheetData('Sales').catch(() => undefined)
  ]);

  const workers: Worker[] = [];
  if (rawWorkers && rawWorkers.length > 1) {
    // rawWorkers[0] is header row
    for (let i = 1; i < rawWorkers.length; i++) {
      const row = rawWorkers[i];
      if (row[0]) {
        workers.push({
          id: row[0],
          name: row[1] || 'Unknown',
          phone: row[2] || '',
          defaultRate: Number(row[3]) || 6,
          role: (row[4] as any) || 'Plucker',
          active: row[5] === 'Active',
          createdAt: row[6] || new Date().toISOString().split('T')[0]
        });
      }
    }
  }

  const yields: DailyYield[] = [];
  if (rawYields && rawYields.length > 1) {
    for (let i = 1; i < rawYields.length; i++) {
      const row = rawYields[i];
      if (row[0]) {
        yields.push({
          id: row[0],
          date: row[1] || '',
          workerId: row[2] || '',
          workerName: row[3] || 'Unknown',
          activity: (row[4] as any) || 'Plucking',
          leavesPlucked: Number(row[5]) || 0,
          wageRate: Number(row[6]) || 6,
          baseWages: Number(row[7]) || 0,
          cashAdvanceTaken: row[8] === 'Yes',
          cashAdvanceAmount: Number(row[9]) || 0,
          netPayable: Number(row[10]) || 0,
          paymentStatus: (row[11] as any) || 'Pending',
          notes: row[12] || ''
        });
      }
    }
  }

  const sales: Sale[] = [];
  if (rawSales && rawSales.length > 1) {
    for (let i = 1; i < rawSales.length; i++) {
      const row = rawSales[i];
      if (row[0]) {
        sales.push({
          id: row[0],
          date: row[1] || '',
          invoiceNo: row[2] || '',
          teaType: row[3] || '',
          quantity: Number(row[4]) || 0,
          pricePerKg: Number(row[5]) || 0,
          totalAmount: Number(row[6]) || 0,
          buyerName: row[7] || '',
          notes: row[8] || ''
        });
      }
    }
  }

  return { workers, yields, sales };
}
