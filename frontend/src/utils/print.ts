/**
 * WCCMS Print Report Utilities - Creates separate browser contexts for printing
 * to guarantee no navigation headers/sidebars are printed.
 */

export const printSessionReport = (session: any, student?: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>CUAP Student Wellness Hub - Clinical Session Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header h2 {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .meta-table th, .meta-table td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
          }
          .meta-table th {
            background-color: #f8fafc;
            font-weight: 700;
            color: #475569;
            width: 25%;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            color: #1e3a8a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 5px;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
          }
          .section-content {
            font-size: 13.5px;
            white-space: pre-wrap;
            color: #334155;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          .signature-area {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signature-box {
            border-top: 1px dashed #94a3b8;
            width: 200px;
            padding-top: 8px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Central University of Andhra Pradesh</h1>
          <h2>Student Wellness Centre & Management System (WCCMS)</h2>
        </div>

        <div class="section-title">Clinical Record Metadata</div>
        <table class="meta-table">
          <tr>
            <th>Student Name</th>
            <td>${session.student_name || student?.student_name || 'N/A'}</td>
            <th>Registration No</th>
            <td>${(session.registration_number || student?.registration_number || 'N/A').toUpperCase()}</td>
          </tr>
          <tr>
            <th>Date of Session</th>
            <td>${new Date(session.session_date).toLocaleDateString('en-IN')}</td>
            <th>Provider / Specialist</th>
            <td>Dr. ${session.provider_name || 'Wellness Counselor'}</td>
          </tr>
          <tr>
            <th>Record Reference ID</th>
            <td>SR-${session.id || 'N/A'}</td>
            <th>Classification</th>
            <td>Confidential EMR</td>
          </tr>
        </table>

        <div class="section">
          <div class="section-title">Presenting Complaint</div>
          <div class="section-content">${session.presenting_complaint || 'No complaint notes recorded.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Subjective (S)</div>
          <div class="section-content">${session.subjective || 'No subjective observations.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Objective (O)</div>
          <div class="section-content">${session.objective || 'No objective findings.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Assessment (A)</div>
          <div class="section-content">${session.assessment || 'No clinical assessments recorded.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Plan (P)</div>
          <div class="section-content">${session.plan || 'No plan details recorded.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Risk Assessment Summary</div>
          <div class="section-content">${session.risk_assessment || 'No risk assessment flagged.'}</div>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            Student Signature<br/>
            <span style="font-size:10px; color:#94a3b8; font-weight:normal;">(Acknowledge receipt)</span>
          </div>
          <div class="signature-box">
            Dr. ${session.provider_name || 'Wellness Counselor'}<br/>
            <span style="font-size:10px; color:#94a3b8; font-weight:normal;">(Digitally Verified E-Signature)</span>
          </div>
        </div>

        <div class="footer">
          <span>Printed on: ${new Date().toLocaleString('en-IN')}</span>
          <span>Confidentiality Notice: Access restricted to authorized clinical staff only.</span>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const printPrescriptionReport = (prescription: any, student?: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let medsHtml = '';
  // Check if medications is an array or encoded string
  let medsArray: any[] = [];
  if (Array.isArray(prescription.medications)) {
    medsArray = prescription.medications;
  } else if (typeof prescription.medications === 'string') {
    try {
      medsArray = JSON.parse(prescription.medications);
    } catch (e) {
      medsArray = [];
    }
  }

  if (medsArray && medsArray.length > 0) {
    medsHtml = medsArray
      .map(
        (m: any, idx: number) => `
      <tr>
        <td style="border:1px solid #e2e8f0; padding:10px;">${idx + 1}</td>
        <td style="border:1px solid #e2e8f0; padding:10px; font-weight:bold;">${m.medicineName}</td>
        <td style="border:1px solid #e2e8f0; padding:10px;">${m.dose || 'N/A'}</td>
        <td style="border:1px solid #e2e8f0; padding:10px;">${m.frequency || 'N/A'}</td>
        <td style="border:1px solid #e2e8f0; padding:10px;">${m.duration || 'N/A'}</td>
      </tr>
    `,
      )
      .join('');
  } else {
    medsHtml = `
      <tr>
        <td style="border:1px solid #e2e8f0; padding:10px;">1</td>
        <td style="border:1px solid #e2e8f0; padding:10px; font-weight:bold;" colspan="4">${prescription.medications || 'No specific medications logged'}</td>
      </tr>
    `;
  }

  const html = `
    <html>
      <head>
        <title>CUAP Student Wellness Hub - Prescription slip</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header h2 {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .meta-table th, .meta-table td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
          }
          .meta-table th {
            background-color: #f8fafc;
            font-weight: 700;
            color: #475569;
            width: 25%;
          }
          .rx-symbol {
            font-size: 32px;
            font-family: Georgia, serif;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 15px;
          }
          .med-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 13px;
          }
          .med-table th {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px;
            font-weight: bold;
            text-align: left;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #065f46;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          .section-content {
            font-size: 13px;
            color: #334155;
            white-space: pre-wrap;
          }
          .signature-area {
            margin-top: 50px;
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .signature-box {
            border-top: 1px dashed #94a3b8;
            width: 220px;
            padding-top: 8px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Central University of Andhra Pradesh</h1>
          <h2>Student Wellness Hub - Prescription Desk</h2>
        </div>

        <table class="meta-table">
          <tr>
            <th>Student Name</th>
            <td>${prescription.student_name || student?.student_name || 'N/A'}</td>
            <th>Registration No</th>
            <td>${(prescription.registration_number || student?.registration_number || 'N/A').toUpperCase()}</td>
          </tr>
          <tr>
            <th>Prescription Date</th>
            <td>${new Date(prescription.prescription_date).toLocaleDateString('en-IN')}</td>
            <th>Provider / Specialist</th>
            <td>Dr. ${prescription.provider_name || 'Wellness Specialist'}</td>
          </tr>
          <tr>
            <th>Ref Diagnosis</th>
            <td colspan="3">${prescription.diagnosis || 'Clinical counseling consultation referral'}</td>
          </tr>
        </table>

        <div class="rx-symbol">Rₓ</div>

        <table class="med-table">
          <thead>
            <tr>
              <th style="width: 8%">S.No</th>
              <th style="width: 42%">Medicine / Supplement Name</th>
              <th style="width: 15%">Dosage</th>
              <th style="width: 20%">Frequency</th>
              <th style="width: 15%">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medsHtml}
          </tbody>
        </table>

        <div class="section">
          <div class="section-title">Special Advice / Clinical Instructions</div>
          <div class="section-content">${prescription.advice || 'Follow counseling session guidance.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Lifestyle Recommendations</div>
          <div class="section-content">${prescription.lifestyle_recommendations || 'Regular exercise, balanced diet, and sleep management.'}</div>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            Dr. ${prescription.provider_name || 'Wellness Specialist'}<br/>
            <span style="font-size:10px; color:#94a3b8; font-weight:normal;">Digitally Authorized Practitioner</span>
          </div>
        </div>

        <div class="footer">
          <span>Printed on: ${new Date().toLocaleString('en-IN')}</span>
          <span>Wellness Centre Pharmacy Copy</span>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const printCrisisReport = (emergencyCase: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>CUAP Student Wellness Hub - Crisis Protocol Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #ef4444;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header h2 {
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .crisis-banner {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            border-left: 5px solid #ef4444;
            color: #991b1b;
            padding: 15px;
            border-radius: 8px;
            font-size: 12.5px;
            font-weight: 700;
            margin-bottom: 25px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .meta-table th, .meta-table td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
          }
          .meta-table th {
            background-color: #f8fafc;
            font-weight: 700;
            color: #475569;
            width: 25%;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #991b1b;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 5px;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
          }
          .section-content {
            font-size: 13px;
            white-space: pre-wrap;
            color: #334155;
            background: #fafafa;
            padding: 15px;
            border: 1px solid #f1f5f9;
            border-radius: 8px;
          }
          .signature-area {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signature-box {
            border-top: 1px dashed #94a3b8;
            width: 200px;
            padding-top: 8px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Central University of Andhra Pradesh</h1>
          <h2>Student Wellness Hub - Crisis Response Desk</h2>
        </div>

        <div class="crisis-banner">
          CRITICAL CONFIDENTIAL CLINICAL SAFETY PLAN: ACCESS RESTRICTED TO LICENSED PRACTITIONERS ONLY
        </div>

        <table class="meta-table">
          <tr>
            <th>Student Name</th>
            <td>${emergencyCase.student_name || 'N/A'}</td>
            <th>Registration No</th>
            <td>${(emergencyCase.registration_number || 'N/A').toUpperCase()}</td>
          </tr>
          <tr>
            <th>Incident Logged Date</th>
            <td>${new Date(emergencyCase.created_at).toLocaleString('en-IN')}</td>
            <th>Resolution Date</th>
            <td>${emergencyCase.resolved_at ? new Date(emergencyCase.resolved_at).toLocaleString('en-IN') : 'N/A'}</td>
          </tr>
          <tr>
            <th>Specialist Counselor</th>
            <td>Dr. ${emergencyCase.provider_name || 'Wellness Counselor'}</td>
            <th>Priority & Status</th>
            <td>${emergencyCase.priority.toUpperCase()} - RESOLVED</td>
          </tr>
        </table>

        <div class="section">
          <div class="section-title">1. Initial Crisis Log & Complaint</div>
          <div class="section-content">${emergencyCase.crisis_notes || 'No description recorded.'}</div>
        </div>

        <div class="section">
          <div class="section-title">2. Clinical Safety Protocol & Referral Details</div>
          <div class="section-content">${emergencyCase.referral_details || 'No safety protocol details recorded.'}</div>
        </div>

        <div class="signature-area">
          <div class="signature-box">
            Student Signature / Acknowledgement<br/>
            <span style="font-size:10px; color:#94a3b8; font-weight:normal;">(Safety contract agreed)</span>
          </div>
          <div class="signature-box">
            Dr. ${emergencyCase.provider_name || 'Wellness Counselor'}<br/>
            <span style="font-size:10px; color:#94a3b8; font-weight:normal;">(Authorized Clinician Signature)</span>
          </div>
        </div>

        <div class="footer">
          <span>Printed on: ${new Date().toLocaleString('en-IN')}</span>
          <span>CUAP Academic Board Referral Record</span>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
