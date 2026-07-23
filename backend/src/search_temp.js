const fs = require('fs');
const content = fs.readFileSync(
  'c:\\Users\\CUAPDC03\\Downloads\\CUAP_COUNSELLING_DOC\\backend\\src\\controllers\\appointmentController.ts',
  'utf8',
);
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (
    line.includes('getEmergencyCases') ||
    line.includes('getSpotRegistrations') ||
    line.includes('s.student_name')
  ) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
