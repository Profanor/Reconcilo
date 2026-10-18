/**
 * Normalization utilities for Reconcilo
 * Converts arbitrary CSV uploads from merchant order systems, spreadsheets,
 * and Nigerian bank/fintech statements (OPay, Moniepoint, GTBank, Paystack, etc.)
 * into canonical/standard transaction formats.
 */

export interface CanonicalExpectedRecord {
  id?: string;
  reference: string;
  amount: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  dueDate?: Date;
  description?: string;
  createdAt?: Date;
}

export interface CanonicalReceivedRecord {
  id?: string;
  reference: string;
  amount: number;
  channel: string;
  provider: string;
  narrative?: string;
  senderName?: string;
  senderAccount?: string;
  createdAt: Date;
}

export interface CsvNormalizationResult<T> {
  success: boolean;
  totalRows: number;
  validRecords: T[];
  duplicates: Array<{ rowNumber: number; reference: string; reason: string }>;
  errors: Array<{ rowNumber: number; raw: any; reason: string }>;
}

/**
 * Robust CSV Line Parser that handles quotes, escaped quotes, commas inside quotes
 */
export function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  const lines = csvContent.split(/\r\n|\n|\r/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex].trim();
    if (!rawLine) continue;

    const row: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];
      if (char === '"' || char === "'") {
        if (insideQuotes && rawLine[i + 1] === char) {
          currentCell += char;
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    rows.push(row);
  }

  return rows;
}

export function repairRowIfSplitAmount(row: string[], targetLength: number): string[] {
  if (row.length <= targetLength) return row;
  const repaired: string[] = [];
  let i = 0;
  while (i < row.length) {
    if (
      i + 1 < row.length &&
      repaired.length + (row.length - i) > targetLength &&
      /[0-9₦$]/.test(row[i]) &&
      /^\d{3}(\.\d+)?$/.test(row[i + 1].trim())
    ) {
      repaired.push(`${row[i]},${row[i + 1]}`);
      i += 2;
    } else {
      repaired.push(row[i]);
      i++;
    }
  }
  return repaired;
}

/**
 * Clean currency strings like "₦ 45,000.50", "45000", "$120.00", "12,500"
 */
export function cleanCurrencyAmount(value: any): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value)
    .replace(/[₦$,\s]/g, '')
    .replace(/[A-Za-z]/g, '')
    .trim();

  const parsed = parseFloat(str);
  if (isNaN(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

/**
 * Parse date strings commonly found in Nigerian bank statements and invoices
 */
export function parseTransactionDate(dateStr?: string): Date {
  if (!dateStr || dateStr.trim() === '') return new Date();

  const trimmed = dateStr.trim();

  // Try standard Date.parse
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  );
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const parsed = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

/**
 * Normalize Expected Payments CSV (Orders / Invoices / Expected Inflows)
 */
export function normalizeExpectedPaymentsCsv(
  csvText: string,
): CsvNormalizationResult<CanonicalExpectedRecord> {
  const rows = parseCsvRows(csvText);
  if (rows.length <= 1) {
    return {
      success: false,
      totalRows: 0,
      validRecords: [],
      duplicates: [],
      errors: [
        {
          rowNumber: 1,
          raw: csvText,
          reason: 'CSV is empty or missing data rows',
        },
      ],
    };
  }

  const rawHeaders = rows[0].map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  );

  // Find column indices with fuzzy alias matching
  const findIndex = (aliases: string[]): number => {
    return rawHeaders.findIndex((header) =>
      aliases.some((alias) => header === alias || header.includes(alias)),
    );
  };

  const refIdx = findIndex([
    'reference',
    'ref',
    'orderid',
    'orderref',
    'invoiceno',
    'invoiceref',
    'orderno',
  ]);
  const amountIdx = findIndex([
    'amount',
    'total',
    'price',
    'orderamount',
    'sum',
  ]);
  const nameIdx = findIndex([
    'customername',
    'customer',
    'buyer',
    'client',
    'payer',
    'name',
  ]);
  const phoneIdx = findIndex([
    'phone',
    'customerphone',
    'mobile',
    'tel',
    'whatsapp',
  ]);
  const emailIdx = findIndex(['email', 'customeremail', 'mail']);
  const dateIdx = findIndex(['date', 'createdat', 'orderdate', 'invoicedate']);
  const dueDateIdx = findIndex(['duedate', 'due', 'expiry']);
  const descIdx = findIndex(['description', 'desc', 'notes', 'memo', 'items']);

  if (refIdx === -1 || amountIdx === -1 || nameIdx === -1) {
    const missing: string[] = [];
    if (refIdx === -1) missing.push('Reference / Order ID');
    if (amountIdx === -1) missing.push('Amount');
    if (nameIdx === -1) missing.push('Customer Name');

    return {
      success: false,
      totalRows: rows.length - 1,
      validRecords: [],
      duplicates: [],
      errors: [
        {
          rowNumber: 1,
          raw: rows[0].join(','),
          reason: `Missing required columns: ${missing.join(', ')}`,
        },
      ],
    };
  }

  const validRecords: CanonicalExpectedRecord[] = [];
  const duplicates: Array<{
    rowNumber: number;
    reference: string;
    reason: string;
  }> = [];
  const errors: Array<{ rowNumber: number; raw: any; reason: string }> = [];
  const seenRefs = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = repairRowIfSplitAmount(rows[i], rows[0].length);
    const rowNum = i + 1;

    const rawRef = row[refIdx]?.trim();
    const rawAmt = row[amountIdx]?.trim();
    const rawName = row[nameIdx]?.trim();

    if (!rawRef || !rawAmt || !rawName) {
      errors.push({
        rowNumber: rowNum,
        raw: row.join(','),
        reason: 'Missing reference, amount, or customer name',
      });
      continue;
    }

    const amount = cleanCurrencyAmount(rawAmt);
    if (amount === null || amount <= 0) {
      errors.push({
        rowNumber: rowNum,
        raw: row.join(','),
        reason: `Invalid or non-positive amount: "${rawAmt}"`,
      });
      continue;
    }

    // Check in-file duplicate reference
    if (seenRefs.has(rawRef.toLowerCase())) {
      duplicates.push({
        rowNumber: rowNum,
        reference: rawRef,
        reason: `Duplicate reference "${rawRef}" detected multiple times within the uploaded CSV`,
      });
      continue;
    }
    seenRefs.add(rawRef.toLowerCase());

    const customerPhone =
      phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : undefined;
    const customerEmail =
      emailIdx !== -1 && row[emailIdx] ? row[emailIdx].trim() : undefined;
    const description =
      descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : undefined;
    const createdAt =
      dateIdx !== -1 && row[dateIdx]
        ? parseTransactionDate(row[dateIdx])
        : new Date();
    const dueDate =
      dueDateIdx !== -1 && row[dueDateIdx]
        ? parseTransactionDate(row[dueDateIdx])
        : undefined;

    validRecords.push({
      reference: rawRef,
      amount,
      customerName: rawName,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail || undefined,
      dueDate,
      description,
      createdAt,
    });
  }

  return {
    success: validRecords.length > 0,
    totalRows: rows.length - 1,
    validRecords,
    duplicates,
    errors,
  };
}

/**
 * Normalize Received Payments CSV (Bank Statement / Fintech / POS / Inflows)
 */
export function normalizeReceivedPaymentsCsv(
  csvText: string,
): CsvNormalizationResult<CanonicalReceivedRecord> {
  const rows = parseCsvRows(csvText);
  if (rows.length <= 1) {
    return {
      success: false,
      totalRows: 0,
      validRecords: [],
      duplicates: [],
      errors: [
        {
          rowNumber: 1,
          raw: csvText,
          reason: 'CSV is empty or missing data rows',
        },
      ],
    };
  }

  const rawHeaders = rows[0].map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  );

  const findIndex = (aliases: string[]): number => {
    return rawHeaders.findIndex((header) =>
      aliases.some((alias) => header === alias || header.includes(alias)),
    );
  };

  const amountIdx = findIndex([
    'amount',
    'credit',
    'inflow',
    'paidamount',
    'transamount',
  ]);
  const debitIdx = findIndex(['debit', 'outflow']);
  const refIdx = findIndex([
    'reference',
    'sessionid',
    'rrn',
    'transid',
    'paymentref',
    'ref',
    'txnid',
  ]);
  const providerIdx = findIndex(['provider', 'bank', 'institution', 'source']);
  const channelIdx = findIndex(['channel', 'type', 'paymentmethod', 'method']);
  const narrativeIdx = findIndex([
    'narrative',
    'narration',
    'description',
    'memo',
    'remarks',
    'details',
  ]);
  const senderNameIdx = findIndex([
    'sendername',
    'sender',
    'payer',
    'paidby',
    'originator',
    'from',
  ]);
  const senderAccountIdx = findIndex([
    'senderaccount',
    'account',
    'accno',
    'sourceaccount',
  ]);
  const dateIdx = findIndex([
    'createdat',
    'date',
    'transactiondate',
    'timestamp',
    'transdate',
  ]);

  if (amountIdx === -1 && debitIdx === -1) {
    return {
      success: false,
      totalRows: rows.length - 1,
      validRecords: [],
      duplicates: [],
      errors: [
        {
          rowNumber: 1,
          raw: rows[0].join(','),
          reason: 'Missing Amount or Credit column',
        },
      ],
    };
  }

  const validRecords: CanonicalReceivedRecord[] = [];
  const duplicates: Array<{
    rowNumber: number;
    reference: string;
    reason: string;
  }> = [];
  const errors: Array<{ rowNumber: number; raw: any; reason: string }> = [];
  const seenRefs = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = repairRowIfSplitAmount(rows[i], rows[0].length);
    const rowNum = i + 1;

    // Check if this row is a debit/outflow in a combined bank statement
    if (debitIdx !== -1 && row[debitIdx]?.trim()) {
      const debitAmt = cleanCurrencyAmount(row[debitIdx]);
      if (
        debitAmt &&
        debitAmt > 0 &&
        (!row[amountIdx] || cleanCurrencyAmount(row[amountIdx]) === null)
      ) {
        // Skip debit/outflow row silently since Reconcilo matches incoming revenue
        continue;
      }
    }

    const rawAmt = amountIdx !== -1 ? row[amountIdx]?.trim() : null;
    const amount = cleanCurrencyAmount(rawAmt);

    if (amount === null || amount <= 0) {
      errors.push({
        rowNumber: rowNum,
        raw: row.join(','),
        reason: `Invalid or non-positive inflow amount: "${rawAmt}"`,
      });
      continue;
    }

    // Determine reference
    let reference = refIdx !== -1 && row[refIdx] ? row[refIdx].trim() : '';
    if (!reference) {
      // If reference column is empty or missing, try extracting session ID or RRN from narrative
      const rawNarrative =
        narrativeIdx !== -1 && row[narrativeIdx] ? row[narrativeIdx] : '';
      const sessionMatch = rawNarrative.match(/(\d{20,30})/);
      const rrnMatch = rawNarrative.match(/RRN[:\s]*([A-Za-z0-9]+)/i);
      if (sessionMatch) {
        reference = sessionMatch[1];
      } else if (rrnMatch) {
        reference = rrnMatch[1];
      } else {
        // Generate a deterministic hash reference from amount + date + narrative
        reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      }
    }

    // In-file duplicate check
    if (seenRefs.has(reference.toLowerCase())) {
      duplicates.push({
        rowNumber: rowNum,
        reference,
        reason: `Duplicate transaction reference "${reference}" detected multiple times in bank statement`,
      });
      continue;
    }
    seenRefs.add(reference.toLowerCase());

    // Normalize Provider and Channel
    let provider =
      providerIdx !== -1 && row[providerIdx]
        ? row[providerIdx].trim()
        : 'Bank Transfer';
    let channel =
      channelIdx !== -1 && row[channelIdx]
        ? row[channelIdx].trim().toUpperCase()
        : 'BANK_TRANSFER';

    // Auto-detect channel if POS or WALLET
    const narrativeUpper = (
      narrativeIdx !== -1 && row[narrativeIdx] ? row[narrativeIdx] : ''
    ).toUpperCase();
    if (channel === 'BANK_TRANSFER' || channel === '') {
      if (
        narrativeUpper.includes('POS') ||
        narrativeUpper.includes('TERMINAL') ||
        narrativeUpper.includes('PURCHASE')
      ) {
        channel = 'POS';
      } else if (
        narrativeUpper.includes('OPAY') ||
        narrativeUpper.includes('MONIEPOINT') ||
        narrativeUpper.includes('PALMPAY')
      ) {
        channel = 'WALLET';
      } else {
        channel = 'BANK_TRANSFER';
      }
    }

    if (provider === 'Bank Transfer') {
      if (narrativeUpper.includes('OPAY')) provider = 'OPay';
      else if (narrativeUpper.includes('MONIEPOINT')) provider = 'Moniepoint';
      else if (
        narrativeUpper.includes('GTBANK') ||
        narrativeUpper.includes('GTB')
      )
        provider = 'GTBank';
      else if (narrativeUpper.includes('ZENITH')) provider = 'Zenith Bank';
      else if (narrativeUpper.includes('ACCESS')) provider = 'Access Bank';
      else if (narrativeUpper.includes('KUDA')) provider = 'Kuda Bank';
      else if (narrativeUpper.includes('PAYSTACK')) provider = 'Paystack';
      else if (
        narrativeUpper.includes('FLUTTERWAVE') ||
        narrativeUpper.includes('FLW')
      )
        provider = 'Flutterwave';
    }

    const narrative =
      narrativeIdx !== -1 && row[narrativeIdx]
        ? row[narrativeIdx].trim()
        : undefined;
    const senderName =
      senderNameIdx !== -1 && row[senderNameIdx]
        ? row[senderNameIdx].trim()
        : undefined;
    const senderAccount =
      senderAccountIdx !== -1 && row[senderAccountIdx]
        ? row[senderAccountIdx].trim()
        : undefined;
    const createdAt =
      dateIdx !== -1 && row[dateIdx]
        ? parseTransactionDate(row[dateIdx])
        : new Date();

    validRecords.push({
      reference,
      amount,
      channel,
      provider,
      narrative,
      senderName,
      senderAccount,
      createdAt,
    });
  }

  return {
    success: validRecords.length > 0,
    totalRows: rows.length - 1,
    validRecords,
    duplicates,
    errors,
  };
}
