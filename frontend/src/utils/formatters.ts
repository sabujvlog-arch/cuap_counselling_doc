/**
 * Utility function to format Provider / Counsellor titles & salutations
 * Ensures counsellors like Ms. Madhu Giri are properly addressed as 'Ms.' and 'CUAP Counsellor'
 * rather than 'Dr.', while preserving medical doctor titles when appropriate.
 */
export const formatProviderTitle = (name?: string): string => {
  if (!name) return 'Ms. Madhu Giri (CUAP Counsellor)';
  let clean = name.trim();
  if (/Madhu\s*Giri/i.test(clean)) {
    clean = clean.replace(/^Dr\.\s*/i, '');
    return `Ms. ${clean} (CUAP Counsellor)`;
  }
  if (/^Dr\./i.test(clean)) {
    return clean;
  }
  if (/^(Ms\.|Mr\.|Mrs\.|Prof\.)/i.test(clean)) {
    return `${clean} (CUAP Counsellor)`;
  }
  return `Ms. ${clean} (CUAP Counsellor)`;
};

/**
 * Format any Date / Timestamp to India Standard Time (IST — Asia/Kolkata)
 */
export const formatISTDate = (date?: string | Date | number): string => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (_) {
    return 'N/A';
  }
};

export const formatISTTime = (date?: string | Date | number): string => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return 'N/A';
  }
};

export const formatISTDateTime = (date?: string | Date | number): string => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return 'N/A';
  }
};
