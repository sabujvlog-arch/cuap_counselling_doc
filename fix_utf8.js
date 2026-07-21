const fs = require('fs');
try {
  const buf = fs.readFileSync('frontend/src/components/auth/PortalSelector.tsx');
  // Attempt to decode as UTF-8, replacing invalid characters
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  fs.writeFileSync('frontend/src/components/auth/PortalSelector.tsx', decoded, 'utf-8');
  console.log('Successfully re-encoded PortalSelector.tsx as UTF-8');
} catch (e) {
  console.error(e);
}
