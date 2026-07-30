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
