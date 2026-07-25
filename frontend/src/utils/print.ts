/**
 * WCCMS Print Report Utilities - Creates separate browser contexts for printing
 * to guarantee no navigation headers/sidebars are printed.
 */

export const printSessionReport = (session: any, student?: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const html = `
    <html>
      <head>
        <title>Clinical Session Report - SR-${session.id || 'N/A'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #3b82f6;
            padding: 30px;
            border-radius: 12px;
            position: relative;
            background: linear-gradient(to bottom, #ffffff, #fcfdff);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px double #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          .title-area h1 {
            margin: 0;
            font-size: 18px;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title-area p {
            margin: 3px 0 0 0;
            font-size: 11px;
            color: #64748b;
          }
          .header-right {
            text-align: right;
          }
          .header-right h2 {
            margin: 0;
            font-size: 16px;
            color: #1e3a8a;
          }
          .header-right p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #475569;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 15px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 13px;
          }
          .info-col p {
            margin: 6px 0;
          }
          .section {
            margin-bottom: 20px;
            font-size: 13px;
            line-height: 1.6;
          }
          .section-title {
            font-weight: 600;
            color: #1e3a8a;
            margin-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          .section-content {
            white-space: pre-wrap;
            color: #334155;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #64748b;
          }
          .signature-box {
            text-align: center;
            width: 220px;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-top: 45px;
            padding-top: 6px;
            font-size: 11px;
            font-weight: 600;
            color: #475569;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #3b82f6;
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            font-family: inherit;
            font-size: 13px;
          }
          @media print {
            body {
              padding: 0;
            }
            .container {
              border: none;
              padding: 0;
              background: none;
            }
            .print-btn {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img class="logo" src="${origin}/logo.png" alt="CUAP Logo" />
              <div class="title-area">
                <h1>Student Wellness & Counseling Centre</h1>
                <p>Central University of Andhra Pradesh</p>
                <p>Ananthapuramu - 515002, India</p>
              </div>
            </div>
            <div class="header-right">
              <h2>Dr. ${session.provider_name || 'Wellness Counselor'}</h2>
              <p>${session.provider_qual || 'M.Phil in Clinical Psychology'}</p>
              <p>${session.provider_spec || 'Cognitive Behavioral Therapy'}</p>
              <p>Emp ID: ${session.provider_emp_id || 'CMP101'}</p>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <p><strong>Student Name:</strong> ${session.student_name || student?.student_name || 'N/A'}</p>
              <p><strong>Registration No:</strong> ${(session.registration_number || student?.registration_number || 'N/A').toUpperCase()}</p>
              <p><strong>Department/Semester:</strong> ${session.student_dept || student?.student_dept || 'General'} / Sem ${session.student_semester || student?.student_semester || 'N/A'}</p>
            </div>
            <div class="info-col" style="border-left: 1px solid #e2e8f0; padding-left: 15px;">
              <p><strong>Session Date:</strong> ${new Date(session.session_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>Age / Gender:</strong> ${session.student_age || student?.age || '21'} Y / ${session.student_gender || student?.gender || 'Male'}</p>
              <p><strong>Blood Group:</strong> ${session.student_blood_group || student?.blood_group || 'O+'}</p>
            </div>
          </div>

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

          <div class="section" style="border-left: 3px solid #ef4444; padding-left: 12px; margin-top: 15px;">
            <div class="section-title" style="color: #ef4444; border-bottom-color: #fecaca;">Risk Assessment Summary</div>
            <div class="section-content" style="font-weight: 600; color: #b91c1c;">${session.risk_assessment || 'No risk assessment flagged.'}</div>
          </div>

          <div class="footer-section">
            <div class="signature-box">
              <div class="signature-line">Student Signature / Acknowledgment</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Dr. ${session.provider_name || 'Wellness Counselor'}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
export const printPrescriptionReport = (prescription: any, student?: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

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
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: 700; color: #0f172a;">${m.medicineName}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: 500;">${m.dose || 'N/A'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; color: #475569;">${m.frequency || 'N/A'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; color: #475569;">${m.duration || 'N/A'}</td>
      </tr>
    `,
      )
      .join('');
  } else {
    medsHtml = `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">1</td>
        <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: 700; color: #0f172a;" colspan="4">${prescription.medications || 'No specific medications logged'}</td>
      </tr>
    `;
  }

  const html = `
    <html>
      <head>
        <title>CUAP Student Wellness Hub - Prescription Slip</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.6;
            padding: 40px;
            background-color: #ffffff;
          }
          .header {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            border-bottom: 2px solid #10b981;
            padding-bottom: 24px;
            margin-bottom: 30px;
          }
          .logo {
            height: 75px;
            margin-bottom: 14px;
            object-fit: contain;
          }
          .header h1 {
            font-size: 22px;
            font-weight: 800;
            color: #065f46;
            margin: 0 0 6px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header h2 {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 30px;
          }
          .meta-table th, .meta-table td {
            padding: 12px 16px;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            text-align: left;
          }
          .meta-table th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #475569;
            width: 20%;
          }
          .meta-table td {
            color: #0f172a;
            font-weight: 500;
          }
          .meta-table tr:last-child th, .meta-table tr:last-child td {
            border-bottom: none;
          }
          .meta-table tr th:last-child, .meta-table tr td:last-child {
            border-right: none;
          }
          .rx-container {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          .rx-symbol {
            font-size: 36px;
            font-family: Georgia, serif;
            font-weight: 900;
            color: #10b981;
            line-height: 1;
            margin-right: 12px;
          }
          .rx-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #047857;
            letter-spacing: 1px;
          }
          .med-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 25px;
            font-size: 13px;
          }
          .med-table th {
            background-color: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            padding: 12px;
            font-weight: 700;
            color: #475569;
            text-align: left;
          }
          .med-table td {
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
          }
          .med-table th:last-child, .med-table td:last-child {
            border-right: none;
          }
          .med-table tr:last-child td {
            border-bottom: none;
          }
          .section {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            color: #047857;
            letter-spacing: 1px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .section-content {
            font-size: 13px;
            white-space: pre-wrap;
            color: #334155;
            line-height: 1.6;
          }
          .signature-area {
            margin-top: 60px;
            display: flex;
            justify-content: flex-end;
            page-break-inside: avoid;
          }
          .signature-box {
            border-top: 1px dashed #cbd5e1;
            width: 240px;
            padding-top: 10px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img class="logo" src="${origin}/logo.png" alt="CUAP Logo" />
          <h1>Central University of Andhra Pradesh</h1>
          <h2>Student Wellness Hub - Therapeutic Intervention Plan</h2>
        </div>

        <div class="section-title" style="border: none; margin-bottom: 8px; color: #475569;">Therapeutic Plan Metadata</div>
        <table class="meta-table">
          <tr>
            <th>Student Name</th>
            <td>${prescription.student_name || student?.student_name || 'N/A'}</td>
            <th>Registration No</th>
            <td>${(prescription.registration_number || student?.registration_number || 'N/A').toUpperCase()}</td>
          </tr>
          <tr>
            <th>Plan Generation Date</th>
            <td>${new Date(prescription.prescription_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
            <th>Provider / Specialist</th>
            <td>Dr. ${prescription.provider_name || 'Wellness Specialist'}</td>
          </tr>
          <tr>
            <th>Presenting Concern / Chief Issue</th>
            <td colspan="3">${prescription.diagnosis || 'Clinical counseling consultation referral'}</td>
          </tr>
        </table>

        <div class="rx-container">
          <div class="rx-symbol">Ψ</div>
          <div class="rx-title">Intervention & Task details</div>
        </div>

        <table class="med-table">
          <thead>
            <tr>
              <th style="width: 8%; text-align: center;">S.No</th>
              <th style="width: 42%">Exercise / Active Intervention</th>
              <th style="width: 15%">Details / Steps</th>
              <th style="width: 20%">Frequency</th>
              <th style="width: 15%">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${medsHtml}
          </tbody>
        </table>

        <div class="section">
          <div class="section-title">Clinical Advice / Guidance</div>
          <div class="section-content">${prescription.advice || 'Follow counseling session guidance.'}</div>
        </div>

        <div class="section">
          <div class="section-title">Lifestyle & Wellness Recommendations</div>
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
          <span>Wellness Centre Copy</span>
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

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const html = `
    <html>
      <head>
        <title>Crisis Protocol Report - ${emergencyCase.registration_number}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #ef4444;
            padding: 30px;
            border-radius: 12px;
            position: relative;
            background: linear-gradient(to bottom, #ffffff, #fffbfa);
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px double #ef4444;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          .title-area h1 {
            margin: 0;
            font-size: 18px;
            color: #991b1b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title-area p {
            margin: 3px 0 0 0;
            font-size: 11px;
            color: #64748b;
          }
          .header-right {
            text-align: right;
          }
          .header-right h2 {
            margin: 0;
            font-size: 16px;
            color: #991b1b;
          }
          .header-right p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #475569;
          }
          .crisis-banner {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            border-left: 5px solid #ef4444;
            color: #991b1b;
            padding: 14px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 24px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 15px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 13px;
          }
          .info-col p {
            margin: 6px 0;
          }
          .section {
            margin-bottom: 20px;
            font-size: 13px;
            line-height: 1.6;
          }
          .section-title {
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          .section-content {
            white-space: pre-wrap;
            color: #334155;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #64748b;
          }
          .signature-box {
            text-align: center;
            width: 220px;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            margin-top: 45px;
            padding-top: 6px;
            font-size: 11px;
            font-weight: 600;
            color: #475569;
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #ef4444;
            color: #ffffff;
            border: none;
            padding: 10px 18px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            font-family: inherit;
            font-size: 13px;
          }
          @media print {
            body {
              padding: 0;
            }
            .container {
              border: none;
              padding: 0;
              background: none;
            }
            .print-btn {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <img class="logo" src="${origin}/logo.png" alt="CUAP Logo" />
              <div class="title-area">
                <h1>Student Wellness & Counseling Centre</h1>
                <p>Central University of Andhra Pradesh</p>
                <p>Ananthapuramu - 515002, India</p>
              </div>
            </div>
            <div class="header-right">
              <h2>Dr. ${emergencyCase.provider_name || 'Wellness Counselor'}</h2>
              <p>M.Phil in Clinical Psychology</p>
              <p>Crisis Response Specialist</p>
              <p>Emp ID: CMP101</p>
            </div>
          </div>

          <div class="crisis-banner">
            CRITICAL CONFIDENTIAL CLINICAL SAFETY PLAN: ACCESS RESTRICTED TO LICENSED PRACTITIONERS ONLY
          </div>

          <div class="info-grid">
            <div class="info-col">
              <p><strong>Student Name:</strong> ${emergencyCase.student_name || 'N/A'}</p>
              <p><strong>Registration No:</strong> ${(emergencyCase.registration_number || 'N/A').toUpperCase()}</p>
              <p><strong>Priority & Status:</strong> <span style="font-weight: 700; color: #b91c1c;">${emergencyCase.priority.toUpperCase()} - RESOLVED</span></p>
            </div>
            <div class="info-col" style="border-left: 1px solid #e2e8f0; padding-left: 15px;">
              <p><strong>Incident Date:</strong> ${new Date(emergencyCase.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>Resolved Date:</strong> ${emergencyCase.resolved_at ? new Date(emergencyCase.resolved_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
            </div>
          </div>

          <div class="section">
            <div class="section-title">1. Initial Crisis Log & Complaint</div>
            <div class="section-content">${emergencyCase.crisis_notes || 'No description recorded.'}</div>
          </div>

          <div class="section">
            <div class="section-title">2. Clinical Safety Protocol & Referral Details</div>
            <div class="section-content">${emergencyCase.referral_details || 'No safety protocol details recorded.'}</div>
          </div>

          <div class="footer-section">
            <div class="signature-box">
              <div class="signature-line">Student Signature / Safety Contract Agreement</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Dr. ${emergencyCase.provider_name || 'Wellness Counselor'}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const downloadPrescriptionPDF = async (
  prescriptionId: number,
  registrationNumber: string,
) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cuap_wccms_token') : null;

  try {
    const response = await fetch(`/api/clinical/prescriptions/${prescriptionId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token || ''}`,
      },
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription_${registrationNumber.toLowerCase()}_${prescriptionId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('Failed to download prescription PDF.');
  }
};
