import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import DiffViewer from './ui/DiffViewer';
import {
  Sparkles,
  ShieldAlert,
  CheckCircle,
  History,
  ClipboardList,
  BookOpen,
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  Mic,
  MicOff,
  Calendar,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  Brain,
  Heart,
  Stethoscope,
  FlaskConical,
  NotebookPen,
  Target,
  Paperclip,
  Save,
  UserCheck,
  Layers,
  Lightbulb,
  MessageSquare,
  X,
  Check,
  RefreshCw,
  Clock,
  Thermometer,
  User,
  Shield,
  Star,
  Zap,
  Archive,
  Send,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

type ClinicianMode = 'counselor' | 'doctor' | 'multidisciplinary';
type SectionStatus = 'empty' | 'partial' | 'completed';
type SessionStatus =
  | 'completed'
  | 'continue_treatment'
  | 'follow_up_required'
  | 'referred'
  | 'emergency_escalation'
  | 'rescheduled'
  | 'no_show'
  | 'administrative_closure'
  | 'discharged';

interface SOAPEditorProps {
  studentId: number;
  appointmentId?: number;
  initialSessionId?: number;
  onSaved?: () => void;
  forcedMode?: 'counselor' | 'doctor';
}

interface AISuggestion {
  id: string;
  category: string;
  text: string;
  status: 'pending' | 'accepted' | 'modified' | 'rejected';
  addedTo?: string;
}

// ============================================================
// Helpers
// ============================================================

const statusChip = (status: SectionStatus) => {
  const cfg = {
    empty: { label: 'Empty', cls: 'emr-chip-empty' },
    partial: { label: 'Partial', cls: 'emr-chip-partial' },
    completed: { label: 'Completed', cls: 'emr-chip-done' },
  }[status];
  return <span className={`emr-status-chip ${cfg.cls}`}>{cfg.label}</span>;
};

const fieldStatus = (...vals: string[]): SectionStatus => {
  const filled = vals.filter((v) => v && v.trim().length > 0);
  if (filled.length === 0) return 'empty';
  if (filled.length < vals.length) return 'partial';
  return 'completed';
};

// ============================================================
// Main Component
// ============================================================

export default function SOAPEditor({
  studentId,
  appointmentId,
  initialSessionId,
  onSaved,
  forcedMode,
}: SOAPEditorProps) {
  const [sessionId, setSessionId] = useState<number | undefined>(initialSessionId);
  const [clinicianMode, setClinicianMode] = useState<ClinicianMode>(forcedMode || 'counselor');

  useEffect(() => {
    if (forcedMode) {
      setClinicianMode(forcedMode);
    }
  }, [forcedMode]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [loading, setLoading] = useState(false);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['section-1']));
  const [isDictating, setIsDictating] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SOAP Audit Log States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sessionHistoryList, setSessionHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number | null>(null);

  const openHistoryModal = async () => {
    if (!sessionId) {
      alert('Please save this session draft to generate version history.');
      return;
    }
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const data = await api.get(`/clinical/sessions/${sessionId}/versions`);
      setSessionHistoryList(data || []);
      if (data && data.length > 0) {
        setSelectedVersionIdx(0);
      } else {
        setSelectedVersionIdx(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load version history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Session Draft (private workspace)
  const [showDraftPanel, setShowDraftPanel] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [showDraftToReport, setShowDraftToReport] = useState(false);
  const [draftGenerating, setDraftGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const [selectedDraftOutput, setSelectedDraftOutput] = useState('counseling-report');

  // Session completion
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('completed');
  const [caseOutcome, setCaseOutcome] = useState('');
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [sessionNumber, setSessionNumber] = useState(1);

  // Report access manager
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [accessLevel, setAccessLevel] = useState('full');
  const [accessExpiry, setAccessExpiry] = useState('');

  // ── Section 1: Patient Clinical Profile
  const [referralSource, setReferralSource] = useState('');
  const [consentStatus, setConsentStatus] = useState('verbal');
  const [presentingComplaint, setPresentingComplaint] = useState('');
  const [history, setHistory] = useState('');
  const [pastPsychiatric, setPastPsychiatric] = useState('');
  const [pastMedical, setPastMedical] = useState('');
  const [medicationHistory, setMedicationHistory] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [socialHistory, setSocialHistory] = useState('');
  const [substanceUse, setSubstanceUse] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState('');
  const [protectiveFactors, setProtectiveFactors] = useState('');
  const [strengths, setStrengths] = useState('');

  // ── Section 2: Counseling Assessment
  const [counselingAssessment, setCounselingAssessment] = useState({
    presentingConcerns: '',
    emotionalImbalance: '',
    physicalImbalance: '',
    stressFactors: '',
    anxietySymptoms: '',
    moodConcerns: '',
    relationshipConcerns: '',
    familyConcerns: '',
    academicConcerns: '',
    traumaHistory: '',
    substanceUse: '',
    behavioralConcerns: '',
  });

  // ── Section 2: Counseling Advice
  const [counselingAdvice, setCounselingAdvice] = useState({
    psychoeducation: '',
    lifestyleAdvice: '',
    stressManagement: '',
    emotionalRegulation: '',
    communicationSkills: '',
    sleepHygiene: '',
    relaxationTechniques: '',
    mindfulnessPractices: '',
  });

  // ── Section 2: Therapeutic Issues
  const [therapeuticIssues, setTherapeuticIssues] = useState({
    treatmentGoals: '',
    therapeuticChallenges: '',
    copingSkills: '',
    homework: '',
    interventionsUsed: '',
    clientResponse: '',
    progressNotes: '',
    sessionOutcome: '',
    nextSessionObjectives: '',
  });

  // ── Section 2: Counseling Session Notes
  const [counselingSessionNotes, setCounselingSessionNotes] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // ── Section 3: Medical Examination
  const [medicalExam, setMedicalExam] = useState({
    chiefComplaint: '',
    hopi: '',
    physicalExam: '',
    generalExam: '',
    systemExam: '',
    bp: '',
    hr: '',
    rr: '',
    temp: '',
    spo2: '',
  });

  // ── Section 3: Medical Assessment
  const [clinicalFindings, setClinicalFindings] = useState('');
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [prognosis, setPrognosis] = useState('');

  // ── Section 3: Medical Advice
  const [medicationPlan, setMedicationPlan] = useState('');
  const [dietaryAdvice, setDietaryAdvice] = useState('');
  const [exerciseAdvice, setExerciseAdvice] = useState('');
  const [medReferral, setMedReferral] = useState('');
  const [medFollowUp, setMedFollowUp] = useState('');

  // ── Section 3: Prescriptions
  const [presItems, setPresItems] = useState<any[]>([
    { medicineName: '', dose: '', frequency: '', duration: '' },
  ]);
  const [drugWarnings, setDrugWarnings] = useState<string[]>([]);

  // ── Section 4: Assessments (MSE + PHQ-9 + tests)
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState('PHQ-9');
  const [showPhqCalc, setShowPhqCalc] = useState(false);
  const [phqResponses, setPhqResponses] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [mseChecklist, setMseChecklist] = useState({
    appearance: 'Well kempt and tidy',
    build: 'Mesomorph',
    hair: 'Well groomed',
    eyeContact: 'Present',
    rapport: 'Easily established',
    attitude: 'Cooperative',
    motor: 'Normal motor activity',
    speech: 'Audible, spontaneous',
    moodAffect: 'Euthymic, congruent affect',
    thoughtProcess: 'Linear, goal-directed',
    thoughtContent: 'No suicidal/homicidal ideation',
    perception: 'No hallucinations',
    cognition: 'Alert, oriented ×3',
    insightJudgment: 'Fair insight, intact judgment',
    riskLevel: 'low',
    clinicalImpression: '',
  });

  // ── Section 5: Clinical Documentation
  const [sessionNotesText, setSessionNotesText] = useState('');
  const [intakeAssessment, setIntakeAssessment] = useState('');
  const [riskAssessment, setRiskAssessment] = useState('');

  // ── Section 6: SOAP Notes
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [interventionUsed, setInterventionUsed] = useState('Supportive Therapy');

  // ── Section 7: Treatment Plan
  const [treatmentPlanData, setTreatmentPlanData] = useState({
    goals: '',
    interventions: '',
    therapyType: 'Individual Therapy',
    reviewSchedule: 'Every 4 sessions',
    outcomeTargets: '',
    homeworkAssigned: '',
  });

  // ── Section 8: Attachments
  const [attachments, setAttachments] = useState<any[]>([]);

  // ── Progress follow-up fields
  const [progressSinceLast, setProgressSinceLast] = useState('');
  const [homeworkReview, setHomeworkReview] = useState('');
  const [medicationAdherence, setMedicationAdherence] = useState('');

  // ============================================================
  // Section visibility config
  // ============================================================

  const isCounselor = clinicianMode === 'counselor' || clinicianMode === 'multidisciplinary';
  const isDoctor = clinicianMode === 'doctor' || clinicianMode === 'multidisciplinary';

  const sections = [
    {
      id: 'section-1',
      label: 'Patient Clinical Profile',
      icon: <User size={18} />,
      visible: true,
      subsections: null,
    },
    {
      id: 'section-2',
      label: 'Counseling & Psychological Services',
      icon: <Brain size={18} />,
      visible: isCounselor,
      subsections: ['Assessment', 'Advice', 'Therapeutic Issues', 'Session Notes'],
    },
    {
      id: 'section-3',
      label: 'Medical Doctor (Medico) Section',
      icon: <Stethoscope size={18} />,
      visible: isDoctor,
      subsections: ['Examination', 'Assessment', 'Advice', 'Prescriptions'],
    },
    {
      id: 'section-4',
      label: 'Psychological Assessments & Tests',
      icon: <FlaskConical size={18} />,
      visible: true,
      subsections: null,
    },
    {
      id: 'section-5',
      label: 'Clinical Documentation',
      icon: <FileText size={18} />,
      visible: true,
      subsections: null,
    },
    {
      id: 'section-6',
      label: 'SOAP Notes',
      icon: <ClipboardList size={18} />,
      visible: true,
      subsections: null,
    },
    {
      id: 'section-7',
      label: 'Treatment Plan',
      icon: <Target size={18} />,
      visible: true,
      subsections: null,
    },
    {
      id: 'section-8',
      label: 'Attachments',
      icon: <Paperclip size={18} />,
      visible: true,
      subsections: null,
    },
  ];

  // ============================================================
  // Auto-save
  // ============================================================

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveSession(true);
    }, 3000);
  }, [
    sessionId,
    clinicianMode,
    subjective,
    objective,
    assessment,
    plan,
    presentingComplaint,
    counselingAssessment,
    therapeuticIssues,
    medicalExam,
  ]);

  useEffect(() => {
    triggerAutoSave();
  }, [
    subjective,
    objective,
    assessment,
    plan,
    presentingComplaint,
    counselingAssessment,
    counselingAdvice,
    therapeuticIssues,
    medicalExam,
    clinicalFindings,
    finalDiagnosis,
    sessionNotesText,
    riskAssessment,
    treatmentPlanData,
  ]);

  // ============================================================
  // Load data on mount
  // ============================================================

  useEffect(() => {
    loadStudentData();
    loadPastSessions();
    if (sessionId) loadSessionDraft();
  }, [studentId, sessionId]);

  const loadStudentData = async () => {
    try {
      const emr = await api.get(`/clinical/emr/student/${studentId}`);
      setStudentProfile(emr.student);
    } catch {}
  };

  const loadPastSessions = async () => {
    try {
      const emr = await api.get(`/clinical/emr/student/${studentId}`);
      setPastSessions(emr.sessions || []);
      if (emr.sessions?.length > 0) {
        setSessionNumber(emr.sessions.length + 1);
      }
    } catch {}
  };

  const loadSessionDraft = async () => {
    if (!sessionId) return;
    try {
      const data = await api.get(`/clinical/session-drafts/${sessionId}`);
      if (data.draftNotes) {
        setDraftNotes(data.draftNotes);
        setDraftTimestamp(data.updatedAt);
      }
    } catch {}
  };

  // ============================================================
  // Section expand / collapse
  // ============================================================

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ============================================================
  // Voice Dictation
  // ============================================================

  const startDictation = (fieldId: string, setter: (v: string) => void, current: string) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported.');
      return;
    }
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(null);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setter(current + ' ' + transcript);
    };
    recognition.onend = () => setIsDictating(null);
    recognition.start();
    recognitionRef.current = recognition;
    setIsDictating(fieldId);
  };

  // ============================================================
  // Save session
  // ============================================================

  const saveSession = async (isAutoSave = false) => {
    setSaveStatus('saving');
    try {
      const payload = {
        id: sessionId,
        appointmentId,
        studentId,
        clinicianMode,
        reportType: isCounselor && isDoctor ? 'combined' : isCounselor ? 'counseling' : 'medical',
        sessionNumber,
        sessionStatus,
        caseOutcome,
        dischargeSummary,
        presentingComplaint,
        history,
        pastPsychiatric,
        pastMedical,
        medicationHistory,
        familyHistory,
        socialHistory,
        substanceUse,
        personalityTraits,
        protectiveFactors,
        strengths,
        counselingAssessment,
        counselingAdvice,
        therapeuticIssues,
        sessionNotesText: counselingSessionNotes,
        medicalExam,
        vitalSigns: {
          bp: medicalExam.bp,
          hr: medicalExam.hr,
          rr: medicalExam.rr,
          temp: medicalExam.temp,
          spo2: medicalExam.spo2,
        },
        diagnosis: finalDiagnosis,
        differentialDiagnosis,
        riskAssessment,
        subjective,
        objective,
        assessment,
        plan,
        interventionUsed,
        homeworkAssigned: treatmentPlanData.homeworkAssigned,
        treatmentPlanData,
        progressSinceLast,
        homeworkReview,
        medicationAdherence,
        sessionDuration: '50',
        autoSave: isAutoSave,
      };

      const result = await api.post('/clinical/sessions', payload);
      if (!sessionId && result.id) setSessionId(result.id);
      setSaveStatus('saved');
      if (!isAutoSave && onSaved) onSaved();
    } catch {
      setSaveStatus('error');
    }
  };

  // ============================================================
  // Save session draft
  // ============================================================

  const saveDraft = async () => {
    try {
      await api.post('/clinical/session-drafts', { sessionId, draftNotes });
      setDraftTimestamp(new Date().toISOString());
    } catch {}
  };

  // ============================================================
  // Draft to Report
  // ============================================================

  const generateDraftReport = async () => {
    if (!draftNotes.trim()) {
      alert('Please write some notes in the Session Draft Workspace first.');
      return;
    }
    setDraftGenerating(true);
    try {
      const data = await api.post('/clinical/ai/draft-to-report', {
        draftNotes,
        outputType: selectedDraftOutput,
        clinicianMode,
        studentName: studentProfile?.name,
        sessionDate: new Date().toISOString(),
      });
      setGeneratedDraft(data.draft);
    } catch {
      alert('Failed to generate report draft.');
    } finally {
      setDraftGenerating(false);
    }
  };

  const applyDraftToFields = () => {
    if (!generatedDraft) return;
    if (selectedDraftOutput === 'soap-notes') {
      if (generatedDraft.subjective) setSubjective(generatedDraft.subjective);
      if (generatedDraft.objective) setObjective(generatedDraft.objective);
      if (generatedDraft.assessment) setAssessment(generatedDraft.assessment);
      if (generatedDraft.plan) setPlan(generatedDraft.plan);
    }
    if (selectedDraftOutput === 'counseling-report') {
      if (generatedDraft.presentingConcerns)
        setCounselingAssessment((a) => ({
          ...a,
          presentingConcerns: generatedDraft.presentingConcerns,
        }));
      if (generatedDraft.sessionNotes) setCounselingSessionNotes(generatedDraft.sessionNotes);
      if (generatedDraft.followUpRecommendations)
        setFollowUpNotes(generatedDraft.followUpRecommendations);
    }
    if (selectedDraftOutput === 'treatment-plan') {
      if (generatedDraft.treatmentGoals)
        setTreatmentPlanData((t) => ({ ...t, goals: generatedDraft.treatmentGoals }));
      if (generatedDraft.interventionsPlanned)
        setTreatmentPlanData((t) => ({ ...t, interventions: generatedDraft.interventionsPlanned }));
    }
    if (selectedDraftOutput === 'progress-notes') {
      if (generatedDraft.progressNotes) setSessionNotesText(generatedDraft.progressNotes);
    }
    setShowDraftToReport(false);
    setGeneratedDraft(null);
  };

  // ============================================================
  // Grant student access
  // ============================================================

  const grantAccess = async () => {
    if (!sessionId) {
      alert('Please save the session first.');
      return;
    }
    try {
      await api.post(`/clinical/sessions/${sessionId}/grant-access`, {
        accessLevel,
        expiresAt: accessExpiry || null,
      });
      alert('Report access granted to student successfully.');
      setShowAccessManager(false);
    } catch {
      alert('Failed to grant access.');
    }
  };

  const revokeAccess = async () => {
    if (!sessionId) return;
    try {
      await api.post(`/clinical/sessions/${sessionId}/revoke-access`, {});
      alert('Access revoked successfully.');
      setShowAccessManager(false);
    } catch {
      alert('Failed to revoke access.');
    }
  };

  // ============================================================
  // PHQ-9
  // ============================================================

  const phqQuestions = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself',
    'Trouble concentrating on things',
    'Moving/speaking slowly or being fidgety/restless',
    'Thoughts of being better off dead or hurting yourself',
  ];

  const phqTotal = phqResponses.reduce((a, b) => a + b, 0);
  const phqSeverity =
    phqTotal >= 20
      ? '🔴 Severe'
      : phqTotal >= 15
        ? '🟠 Moderately Severe'
        : phqTotal >= 10
          ? '🟡 Moderate'
          : phqTotal >= 5
            ? '🔵 Mild'
            : '🟢 Minimal/None';

  // ============================================================
  // Drug interaction checker
  // ============================================================

  const checkDrugInteractions = () => {
    const known: Record<string, string[]> = {
      sertraline: ['tramadol', 'linezolid', 'mao inhibitor'],
      fluoxetine: ['tramadol', 'lithium', 'warfarin'],
      lithium: ['nsaid', 'ibuprofen', 'diclofenac', 'thiazide'],
      clonazepam: ['alcohol', 'opioid', 'morphine'],
    };
    const warnings: string[] = [];
    const medicines = presItems.map((i) => i.medicineName.toLowerCase());
    medicines.forEach((med, i) => {
      Object.entries(known).forEach(([drug, interactions]) => {
        if (med.includes(drug)) {
          interactions.forEach((inter) => {
            if (medicines.some((m, j) => j !== i && m.includes(inter))) {
              warnings.push(`⚠️ Interaction: ${presItems[i].medicineName} + ${inter}`);
            }
          });
        }
      });
    });
    setDrugWarnings(warnings);
  };

  // ============================================================
  // Render helpers
  // ============================================================

  const AccordionSection = ({
    id,
    label,
    icon,
    visible,
    children,
    rightContent,
  }: {
    id: string;
    label: string;
    icon: React.ReactNode;
    visible: boolean;
    children: React.ReactNode;
    rightContent?: React.ReactNode;
  }) => {
    if (!visible) return null;
    const isOpen = expandedSections.has(id);
    return (
      <div className={`emr-section ${isOpen ? 'emr-section-open' : ''}`}>
        <button className="emr-section-header" onClick={() => toggleSection(id)}>
          <div className="emr-section-header-left">
            <span className="emr-section-icon">{icon}</span>
            <span className="emr-section-label">{label}</span>
          </div>
          <div className="emr-section-header-right">
            {rightContent}
            <span className="emr-chevron">
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </div>
        </button>
        {isOpen && <div className="emr-section-body">{children}</div>}
      </div>
    );
  };

  const FormField = ({
    label,
    value,
    onChange,
    placeholder = '',
    type = 'textarea',
    rows = 3,
    required = false,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: 'textarea' | 'input' | 'select';
    rows?: number;
    required?: boolean;
  }) => (
    <div className="emr-field">
      <label className="emr-label">
        {label}
        {required && <span className="emr-required">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          className="emr-textarea"
          rows={rows}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            triggerAutoSave();
          }}
          placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
        />
      ) : (
        <input
          className="emr-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            triggerAutoSave();
          }}
          placeholder={placeholder || label}
        />
      )}
    </div>
  );

  const VitalsInput = ({
    label,
    value,
    onChange,
    unit,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    unit: string;
  }) => (
    <div className="emr-vital-field">
      <label className="emr-vital-label">{label}</label>
      <div className="emr-vital-input-row">
        <input
          className="emr-vital-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
        />
        <span className="emr-vital-unit">{unit}</span>
      </div>
    </div>
  );

  // ============================================================

  return (
    <div className="emr-root">
      <style>{`
        /* ── Theme variables ── */
        .emr-root {
          --emr-bg: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 60%, #e2e8f0 100%);
          --emr-text: #0f172a;
          --emr-card-bg: rgba(255, 255, 255, 0.7);
          --emr-input-bg: rgba(241, 245, 249, 0.85);
          --emr-border: rgba(0, 0, 0, 0.08);
          --emr-header-bg: rgba(255, 255, 255, 0.7);
          --emr-section-border: rgba(0, 0, 0, 0.06);
          --emr-label-color: #475569;
          --emr-muted: #64748b;
          --emr-panel-bg: rgba(255, 255, 255, 0.85);
          --emr-text-white: #0f172a;
          --emr-header-text: #0f172a;
          --emr-btn-ghost-bg: rgba(0, 0, 0, 0.04);
          --emr-btn-ghost-hover: rgba(0, 0, 0, 0.08);
          --emr-btn-ghost-text: #475569;
          --emr-patient-info-color: #475569;
          --emr-hover-bg: rgba(0, 0, 0, 0.02);

          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--emr-bg) no-repeat;
          background-attachment: fixed;
          background-size: cover;
          color: var(--emr-text);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          gap: 0;
          min-width: 0;
          max-width: 100%;
        }



        /* ── Header ── */
        .emr-header {
          background: var(--emr-header-bg);
          backdrop-filter: blur(8px);
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--emr-border);
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .emr-header-title { display: flex; align-items: center; gap: 12px; }
        .emr-header-title h1 { font-size: 1.15rem; font-weight: 700; color: var(--emr-header-text); margin: 0; }
        .emr-header-title .emr-patient-info { font-size: 0.8rem; color: var(--emr-patient-info-color); margin-top: 2px; }
        .emr-header-actions { display: flex; align-items: center; gap: 10px; }

        /* ── Save status ── */
        .emr-save-status {
          font-size: 0.78rem; display: flex; align-items: center; gap: 6px; padding: 5px 12px;
          border-radius: 20px; font-weight: 500;
        }
        .emr-save-status.saved { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
        .emr-save-status.saving { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
        .emr-save-status.error { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
        .emr-save-status.idle { background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2); }

        html.light .emr-save-status.saved { background: rgba(16,185,129,0.1); color: #065f46; border-color: rgba(16,185,129,0.2); }
        html.light .emr-save-status.saving { background: rgba(245,158,11,0.1); color: #92400e; border-color: rgba(245,158,11,0.2); }
        html.light .emr-save-status.error { background: rgba(239,68,68,0.1); color: #991b1b; border-color: rgba(239,68,68,0.2); }
        html.light .emr-save-status.idle { background: rgba(148,163,184,0.1); color: #374151; border-color: rgba(148,163,184,0.2); }

        /* ── Mode selector ── */
        .emr-mode-bar {
          background: var(--emr-header-bg);
          backdrop-filter: blur(6px);
          border-bottom: 1px solid var(--emr-border);
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .emr-mode-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .emr-mode-pills { display: flex; gap: 8px; }
        .emr-mode-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 18px; border-radius: 24px; cursor: pointer;
          font-size: 0.85rem; font-weight: 600; border: 2px solid transparent;
          transition: all 0.2s;
        }
        .emr-mode-pill.counselor { background: rgba(139,92,246,0.12); color: #a78bfa; border-color: rgba(139,92,246,0.3); }
        .emr-mode-pill.counselor.active { background: #7c3aed; color: #fff; border-color: #7c3aed; box-shadow: 0 0 16px rgba(124,58,237,0.4); }
        .emr-mode-pill.doctor { background: rgba(20,184,166,0.12); color: #5eead4; border-color: rgba(20,184,166,0.3); }
        .emr-mode-pill.doctor.active { background: #0d9488; color: #fff; border-color: #0d9488; box-shadow: 0 0 16px rgba(13,148,136,0.4); }
        .emr-mode-pill.multidisciplinary { background: rgba(245,158,11,0.12); color: #fbbf24; border-color: rgba(245,158,11,0.3); }
        .emr-mode-pill.multidisciplinary.active { background: #d97706; color: #fff; border-color: #d97706; box-shadow: 0 0 16px rgba(217,119,6,0.4); }

        html.light .emr-mode-pill.counselor:not(.active) { color: #6d28d9; border-color: rgba(139,92,246,0.5); }
        html.light .emr-mode-pill.doctor:not(.active) { color: #0f766e; border-color: rgba(20,184,166,0.5); }
        html.light .emr-mode-pill.multidisciplinary:not(.active) { color: #b45309; border-color: rgba(245,158,11,0.5); }

        /* ── Main layout ── */
        .emr-layout { display: flex; flex: 1; gap: 0; min-height: 0; min-width: 0; }
        .emr-main { flex: 1; min-width: 0; overflow-y: auto; padding: 20px 0px; display: flex; flex-direction: column; gap: 20px; }

        /* ── Accordion sections ── */
        .emr-section {
          background: var(--emr-card-bg);
          border: 1px solid var(--emr-section-border);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }
        .emr-section.emr-section-open { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(37,99,235,0.25); }
        .emr-section-header {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background: transparent; border: none; cursor: pointer;
          color: var(--emr-text); transition: background 0.15s;
        }
        .emr-section-header:hover { background: var(--emr-hover-bg); }
        .emr-section-header-left { display: flex; align-items: center; gap: 12px; }
        .emr-section-header-right { display: flex; align-items: center; gap: 10px; }
        .emr-section-icon { color: #2563eb; display: flex; }
        .emr-section-label { font-size: 1.05rem; font-weight: 600; }
        .emr-chevron { color: #64748b; display: flex; transition: transform 0.2s; }
        .emr-section-body { padding: 24px; border-top: 1px solid var(--emr-section-border); }

        /* ── Status chips ── */
        .emr-status-chip { font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
        .emr-chip-empty { background: rgba(148,163,184,0.12); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2); }
        .emr-chip-partial { background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); }
        .emr-chip-done { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25); }

        html.light .emr-chip-empty { background: rgba(148,163,184,0.10); color: #4b5563; border-color: rgba(148,163,184,0.2); }
        html.light .emr-chip-partial { background: rgba(245,158,11,0.10); color: #92400e; border-color: rgba(245,158,11,0.2); }
        html.light .emr-chip-done { background: rgba(16,185,129,0.10); color: #065f46; border-color: rgba(16,185,129,0.2); }

        /* ── Form fields ── */
        .emr-field { margin-bottom: 18px; }
        .emr-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--emr-label-color); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
        .emr-required { color: #ef4444; margin-left: 3px; }
        .emr-textarea, .emr-input, .emr-select {
          width: 100%; background: var(--emr-input-bg); border: 1px solid var(--emr-border);
          border-radius: 12px; color: var(--emr-text); padding: 12px 16px; font-size: 0.9rem;
          font-family: inherit; resize: vertical; transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .emr-textarea:focus, .emr-input:focus, .emr-select:focus {
          outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .emr-textarea::placeholder, .emr-input::placeholder { color: #64748b; }

        /* ── Grid layouts ── */
        .emr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .emr-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

        /* ── Subsection headers ── */
        .emr-subsection { margin-bottom: 24px; }
        .emr-subsection-title {
          font-size: 0.82rem; font-weight: 700; color: #60a5fa; text-transform: uppercase;
          letter-spacing: 0.06em; margin-bottom: 14px; padding-bottom: 8px;
          border-bottom: 1px solid rgba(96,165,250,0.2);
          display: flex; align-items: center; gap: 8px;
        }

        /* ── Vitals ── */
        .emr-vitals-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 16px; }
        .emr-vital-field { background: var(--emr-input-bg); border: 1px solid var(--emr-section-border); border-radius: 10px; padding: 12px; text-align: center; }
        .emr-vital-label { font-size: 0.72rem; color: var(--emr-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 6px; display: block; }
        .emr-vital-input-row { display: flex; align-items: center; justify-content: center; gap: 4px; }
        .emr-vital-input { width: 60px; background: transparent; border: none; color: var(--emr-text); font-size: 1rem; font-weight: 700; text-align: center; border-bottom: 1px solid var(--emr-border); }
        .emr-vital-input:focus { outline: none; border-bottom-color: #3b82f6; }
        .emr-vital-unit { font-size: 0.7rem; color: var(--emr-muted); }

        /* ── Prescription row ── */
        .emr-pres-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; align-items: center; margin-bottom: 8px; }
        .emr-pres-row input { background: var(--emr-input-bg); border: 1px solid var(--emr-border); color: var(--emr-text); border-radius: 6px; padding: 8px 10px; font-size: 0.85rem; width: 100%; box-sizing: border-box; }
        .emr-pres-row input:focus { outline: none; border-color: #3b82f6; }

        /* ── Buttons ── */
        .emr-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
          border: none; cursor: pointer; transition: all 0.2s;
        }
        .emr-btn-primary { background: #2563eb; color: #fff; }
        .emr-btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
        .emr-btn-success { background: #059669; color: #fff; }
        .emr-btn-success:hover { background: #047857; }
        .emr-btn-warning { background: #d97706; color: #fff; }
        .emr-btn-warning:hover { background: #b45309; }
        .emr-btn-danger { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
        .emr-btn-danger:hover { background: rgba(239,68,68,0.25); }
        .emr-btn-ghost { background: var(--emr-btn-ghost-bg); color: var(--emr-btn-ghost-text); border: 1px solid var(--emr-border); }
        .emr-btn-ghost:hover { background: var(--emr-btn-ghost-hover); color: var(--emr-text); }
        .emr-btn-ai { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; }
        .emr-btn-ai:hover { box-shadow: 0 4px 16px rgba(124,58,237,0.5); transform: translateY(-1px); }
        .emr-btn-sm { padding: 6px 12px; font-size: 0.78rem; }

        /* ── MSE checklist ── */
        .emr-mse-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .emr-mse-field label { font-size: 0.75rem; color: var(--emr-muted); font-weight: 600; display: block; margin-bottom: 4px; }
        .emr-mse-field select { width: 100%; background: var(--emr-input-bg); border: 1px solid var(--emr-border); color: var(--emr-text); border-radius: 6px; padding: 7px 10px; font-size: 0.85rem; }

        /* ── PHQ-9 ── */
        .emr-phq-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--emr-border); }
        .emr-phq-q { flex: 1; font-size: 0.85rem; color: var(--emr-text); }
        .emr-phq-score { font-size: 0.8rem; font-weight: 700; color: #60a5fa; min-width: 24px; text-align: right; }
        .emr-phq-btns { display: flex; gap: 4px; }
        .emr-phq-btn { padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; background: var(--emr-btn-ghost-bg); color: var(--emr-btn-ghost-text); }
        .emr-phq-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }
        .emr-phq-total { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-top: 2px solid rgba(59,130,246,0.3); margin-top: 8px; }
        .emr-phq-total-score { font-size: 1.5rem; font-weight: 800; color: #60a5fa; }
        .emr-phq-total-severity { font-size: 0.9rem; font-weight: 600; }

        /* ── Timeline sidebar ── */
        .emr-sidebar-title { font-size: 0.8rem; font-weight: 700; color: var(--emr-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .emr-timeline-item { padding: 12px; background: var(--emr-input-bg); border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #3b82f6; }
        .emr-timeline-date { font-size: 0.72rem; color: #60a5fa; font-weight: 600; margin-bottom: 4px; }
        .emr-timeline-summary { font-size: 0.8rem; color: var(--emr-muted); }
        .emr-timeline-status { font-size: 0.7rem; color: #34d399; margin-top: 4px; }

        /* ── AI Panel ── */
        .emr-ai-panel {
          position: fixed; right: 0; top: 0; bottom: 0; width: 380px;
          background: var(--emr-panel-bg); border-left: 1px solid var(--emr-border);
          z-index: 200; display: flex; flex-direction: column;
          box-shadow: -8px 0 40px rgba(0,0,0,0.3);
          transform: translateX(100%); transition: transform 0.3s ease;
        }
        .emr-ai-panel.open { transform: translateX(0); }
        .emr-ai-panel-header {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          padding: 18px 20px; display: flex; align-items: center; justify-content: space-between;
        }
        .emr-ai-panel-title { font-size: 1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
        .emr-ai-panel-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .emr-suggestion-card { background: var(--emr-card-bg); border: 1px solid var(--emr-border); border-radius: 10px; padding: 14px; }
        .emr-suggestion-category { font-size: 0.72rem; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .emr-suggestion-text { font-size: 0.85rem; color: var(--emr-text); line-height: 1.5; margin-bottom: 10px; }
        .emr-suggestion-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .emr-suggestion-card.accepted { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.05); }
        .emr-suggestion-card.rejected { opacity: 0.4; }

        html.light .emr-suggestion-card.accepted { border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.05); }

        /* ── Draft panel ── */
        .emr-draft-panel {
          background: var(--emr-card-bg); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 18px; margin-bottom: 16px;
        }
        .emr-draft-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .emr-draft-title { font-size: 0.9rem; font-weight: 700; color: #fbbf24; display: flex; align-items: center; gap: 8px; }
        .emr-draft-private { font-size: 0.72rem; background: rgba(245,158,11,0.12); color: #fbbf24; border: 1px solid rgba(245,158,11,0.25); padding: 3px 10px; border-radius: 20px; }
        .emr-draft-timestamp { font-size: 0.72rem; color: var(--emr-muted); margin-top: 6px; }

        html.light .emr-draft-private { background: rgba(245,158,11,0.08); color: #b45309; border-color: rgba(245,158,11,0.2); }

        /* ── Modal ── */
        .emr-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .emr-modal { background: var(--emr-card-bg); border: 1px solid var(--emr-border); border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .emr-modal-header { padding: 20px 24px; border-bottom: 1px solid var(--emr-border); display: flex; align-items: center; justify-content: space-between; }
        .emr-modal-title { font-size: 1.05rem; font-weight: 700; color: var(--emr-text); display: flex; align-items: center; gap: 10px; }
        .emr-modal-body { padding: 24px; }
        .emr-modal-footer { padding: 16px 24px; border-top: 1px solid var(--emr-border); display: flex; gap: 10px; justify-content: flex-end; }

        /* ── Select ── */
        select.emr-select { appearance: auto; }

        /* ── Risk badge ── */
        .emr-risk-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; }
        .emr-risk-low { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
        .emr-risk-medium { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
        .emr-risk-high { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }

        html.light .emr-risk-low { background: rgba(16,185,129,0.1); color: #065f46; border-color: rgba(16,185,129,0.2); }
        html.light .emr-risk-medium { background: rgba(245,158,11,0.1); color: #92400e; border-color: rgba(245,158,11,0.2); }
        html.light .emr-risk-high { background: rgba(239,68,68,0.1); color: #991b1b; border-color: rgba(239,68,68,0.2); }

        /* ── Warning box ── */
        .emr-warning { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; padding: 12px 16px; color: #fca5a5; font-size: 0.85rem; margin-top: 10px; }

        html.light .emr-warning { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.2); color: #991b1b; }

        /* ── Divider ── */
        .emr-divider { height: 1px; background: var(--emr-border); margin: 20px 0; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--emr-border); border-radius: 10px; }

        /* ── Access manager ── */
        .emr-access-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .emr-access-option { background: var(--emr-input-bg); border: 2px solid var(--emr-border); border-radius: 10px; padding: 12px; cursor: pointer; transition: all 0.2s; text-align: center; }
        .emr-access-option.selected { border-color: #3b82f6; background: rgba(59,130,246,0.1); }
        .emr-access-option h4 { font-size: 0.85rem; font-weight: 700; color: var(--emr-text); margin: 4px 0; }
        .emr-access-option p { font-size: 0.72rem; color: var(--emr-muted); margin: 0; }

        @media (max-width: 900px) {
          .emr-sidebar { display: none; }
          .emr-ai-panel { width: 100%; }
          .emr-vitals-grid { grid-template-columns: repeat(3, 1fr); }
          .emr-grid-2, .emr-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="emr-header">
        <div className="emr-header-title">
          <Activity size={22} color="#60a5fa" />
          <div>
            <h1>
              Clinical EMR —{' '}
              {clinicianMode === 'counselor'
                ? 'Counseling'
                : clinicianMode === 'doctor'
                  ? 'Medical'
                  : 'Multidisciplinary'}{' '}
              Session
            </h1>
            {studentProfile && (
              <div className="emr-patient-info">
                {studentProfile.name} · {studentProfile.registration_number} ·{' '}
                {studentProfile.department}
                {sessionNumber > 1 && ` · Session #${sessionNumber}`}
              </div>
            )}
          </div>
        </div>
        <div className="emr-header-actions">
          <div className={`emr-save-status ${saveStatus}`}>
            {saveStatus === 'saved' && (
              <>
                <CheckCircle size={13} /> Auto-saved
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <RefreshCw size={13} className="animate-spin" /> Saving…
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertTriangle size={13} /> Save failed
              </>
            )}
            {saveStatus === 'idle' && (
              <>
                <Clock size={13} /> Unsaved
              </>
            )}
          </div>
          <button
            className="emr-btn emr-btn-ghost emr-btn-sm"
            onClick={() => setShowDraftPanel(!showDraftPanel)}
            title="Session Draft Workspace"
          >
            <NotebookPen size={15} />
          </button>

          <button
            className="emr-btn emr-btn-ghost emr-btn-sm"
            onClick={() => setShowAccessManager(true)}
            title="Access Control Manager"
          >
            <Lock size={15} />
          </button>
          <button
            className="emr-btn emr-btn-primary"
            onClick={() => saveSession(false)}
            title="Save Session"
          >
            <Save size={15} />
          </button>
          <button
            className="emr-btn emr-btn-success"
            onClick={() => setShowCompletionModal(true)}
            title="Complete Session"
          >
            <CheckCircle size={15} />
          </button>
        </div>
      </div>

      {/* ── Clinician Mode Selector ── */}
      {!forcedMode && (
        <div className="emr-mode-bar">
          <span className="emr-mode-label">Clinician Mode</span>
          <div className="emr-mode-pills">
            {(['counselor', 'doctor', 'multidisciplinary'] as ClinicianMode[]).map((mode) => (
              <button
                key={mode}
                className={`emr-mode-pill ${mode} ${clinicianMode === mode ? 'active' : ''}`}
                onClick={() => setClinicianMode(mode)}
              >
                {mode === 'counselor' && <Brain size={14} />}
                {mode === 'doctor' && <Stethoscope size={14} />}
                {mode === 'multidisciplinary' && <Layers size={14} />}
                {mode === 'counselor'
                  ? 'Counselor / Psychologist'
                  : mode === 'doctor'
                    ? 'Medical Doctor'
                    : 'Multidisciplinary'}
              </button>
            ))}
          </div>
          {sessionNumber > 1 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
              Session #{sessionNumber} · {pastSessions.length} previous session
              {pastSessions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Session Draft Workspace ── */}
      {showDraftPanel && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="emr-draft-panel">
            <div className="emr-draft-header">
              <div className="emr-draft-title">
                <NotebookPen size={16} />
                Session Draft Workspace
                <span className="emr-draft-private">
                  <Lock size={10} /> Private — Not in official record
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="emr-btn emr-btn-warning emr-btn-sm"
                  onClick={() => setShowDraftToReport(true)}
                >
                  <Send size={13} /> Draft → Report
                </button>
                <button className="emr-btn emr-btn-ghost emr-btn-sm" onClick={saveDraft}>
                  <Save size={13} /> Save Draft
                </button>
                <button
                  className="emr-btn emr-btn-ghost emr-btn-sm"
                  onClick={() => setShowDraftPanel(false)}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <textarea
              className="emr-textarea"
              rows={6}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Timestamped observations, client statements, presenting concerns, emotional observations, risk reminders, clinical impressions, homework ideas, follow-up reminders…"
            />
            {draftTimestamp && (
              <div className="emr-draft-timestamp">
                Last saved: {new Date(draftTimestamp).toLocaleTimeString('en-IN')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="emr-layout">
        <div className="emr-main">
          {/* ── Section 1: Patient Clinical Profile ── */}
          <AccordionSection
            id="section-1"
            label="Patient Clinical Profile"
            icon={<User size={18} />}
            visible={true}
            rightContent={statusChip(fieldStatus(presentingComplaint, history, pastMedical))}
          >
            <div className="emr-grid-2">
              <div className="emr-field">
                <label className="emr-label">Referral Source</label>
                <select
                  className="emr-select"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                >
                  {[
                    'Self-Referral',
                    'Faculty Referral',
                    'Family Referral',
                    'Peer Referral',
                    'Medical Referral',
                    'Online Portal',
                    'Other',
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="emr-field">
                <label className="emr-label">Consent Status</label>
                <select
                  className="emr-select"
                  value={consentStatus}
                  onChange={(e) => setConsentStatus(e.target.value)}
                >
                  {[
                    'Verbal Consent Obtained',
                    'Written Consent Signed',
                    'Guardian Consent (Minor)',
                    'Consent Declined',
                    'Emergency — Consent Pending',
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
            <FormField
              label="Presenting Complaint"
              value={presentingComplaint}
              onChange={setPresentingComplaint}
              required
              rows={3}
            />
            <FormField
              label="History of Presenting Illness"
              value={history}
              onChange={setHistory}
              rows={4}
            />
            <div className="emr-grid-2">
              <FormField
                label="Past Psychiatric History"
                value={pastPsychiatric}
                onChange={setPastPsychiatric}
              />
              <FormField
                label="Past Medical History"
                value={pastMedical}
                onChange={setPastMedical}
              />
              <FormField label="Family History" value={familyHistory} onChange={setFamilyHistory} />
              <FormField label="Social History" value={socialHistory} onChange={setSocialHistory} />
              <FormField
                label="Substance Use History"
                value={substanceUse}
                onChange={setSubstanceUse}
              />
              <FormField
                label="Current Medications"
                value={medicationHistory}
                onChange={setMedicationHistory}
              />
              <FormField
                label="Personality Traits"
                value={personalityTraits}
                onChange={setPersonalityTraits}
              />
              <FormField
                label="Strengths & Protective Factors"
                value={strengths}
                onChange={setStrengths}
              />
            </div>
            {sessionNumber > 1 && (
              <div className="emr-subsection" style={{ marginTop: 20 }}>
                <div className="emr-subsection-title">
                  <RefreshCw size={14} /> Follow-up Progress (Session #{sessionNumber})
                </div>
                <div className="emr-grid-2">
                  <FormField
                    label="Progress Since Last Visit"
                    value={progressSinceLast}
                    onChange={setProgressSinceLast}
                  />
                  <FormField
                    label="Homework Review"
                    value={homeworkReview}
                    onChange={setHomeworkReview}
                  />
                  {isDoctor && (
                    <FormField
                      label="Medication Adherence"
                      value={medicationAdherence}
                      onChange={setMedicationAdherence}
                    />
                  )}
                </div>
              </div>
            )}
          </AccordionSection>

          {/* ── Section 2: Counseling & Psychological Services ── */}
          <AccordionSection
            id="section-2"
            label="Counseling & Psychological Services"
            icon={<Brain size={18} />}
            visible={isCounselor}
            rightContent={statusChip(
              fieldStatus(
                counselingAssessment.presentingConcerns,
                therapeuticIssues.treatmentGoals,
                counselingSessionNotes,
              ),
            )}
          >
            {/* 2a: Counseling Assessment */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <ShieldAlert size={14} /> Counseling Assessment
              </div>
              <div className="emr-grid-2">
                <FormField
                  label="Presenting Concerns"
                  value={counselingAssessment.presentingConcerns}
                  onChange={(v) =>
                    setCounselingAssessment((a) => ({ ...a, presentingConcerns: v }))
                  }
                  rows={3}
                />
                <FormField
                  label="Emotional Imbalance"
                  value={counselingAssessment.emotionalImbalance}
                  onChange={(v) =>
                    setCounselingAssessment((a) => ({ ...a, emotionalImbalance: v }))
                  }
                  rows={3}
                />
                <FormField
                  label="Physical Imbalance"
                  value={counselingAssessment.physicalImbalance}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, physicalImbalance: v }))}
                  rows={2}
                />
                <FormField
                  label="Stress Factors"
                  value={counselingAssessment.stressFactors}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, stressFactors: v }))}
                  rows={2}
                />
                <FormField
                  label="Anxiety Symptoms"
                  value={counselingAssessment.anxietySymptoms}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, anxietySymptoms: v }))}
                  rows={2}
                />
                <FormField
                  label="Mood Concerns"
                  value={counselingAssessment.moodConcerns}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, moodConcerns: v }))}
                  rows={2}
                />
                <FormField
                  label="Relationship Concerns"
                  value={counselingAssessment.relationshipConcerns}
                  onChange={(v) =>
                    setCounselingAssessment((a) => ({ ...a, relationshipConcerns: v }))
                  }
                  rows={2}
                />
                <FormField
                  label="Family Concerns"
                  value={counselingAssessment.familyConcerns}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, familyConcerns: v }))}
                  rows={2}
                />
                <FormField
                  label="Academic / Work Concerns"
                  value={counselingAssessment.academicConcerns}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, academicConcerns: v }))}
                  rows={2}
                />
                <FormField
                  label="Trauma History"
                  value={counselingAssessment.traumaHistory}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, traumaHistory: v }))}
                  rows={2}
                />
                <FormField
                  label="Substance Use"
                  value={counselingAssessment.substanceUse}
                  onChange={(v) => setCounselingAssessment((a) => ({ ...a, substanceUse: v }))}
                  rows={2}
                />
                <FormField
                  label="Behavioral Concerns"
                  value={counselingAssessment.behavioralConcerns}
                  onChange={(v) =>
                    setCounselingAssessment((a) => ({ ...a, behavioralConcerns: v }))
                  }
                  rows={2}
                />
              </div>
            </div>

            <div className="emr-divider" />

            {/* 2b: Counseling Advice */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <Lightbulb size={14} /> Counseling Advice
              </div>
              <div className="emr-grid-2">
                <FormField
                  label="Psychoeducation"
                  value={counselingAdvice.psychoeducation}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, psychoeducation: v }))}
                  rows={2}
                />
                <FormField
                  label="Lifestyle Advice"
                  value={counselingAdvice.lifestyleAdvice}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, lifestyleAdvice: v }))}
                  rows={2}
                />
                <FormField
                  label="Stress Management"
                  value={counselingAdvice.stressManagement}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, stressManagement: v }))}
                  rows={2}
                />
                <FormField
                  label="Emotional Regulation"
                  value={counselingAdvice.emotionalRegulation}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, emotionalRegulation: v }))}
                  rows={2}
                />
                <FormField
                  label="Communication Skills"
                  value={counselingAdvice.communicationSkills}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, communicationSkills: v }))}
                  rows={2}
                />
                <FormField
                  label="Sleep Hygiene"
                  value={counselingAdvice.sleepHygiene}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, sleepHygiene: v }))}
                  rows={2}
                />
                <FormField
                  label="Relaxation Techniques"
                  value={counselingAdvice.relaxationTechniques}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, relaxationTechniques: v }))}
                  rows={2}
                />
                <FormField
                  label="Mindfulness Practices"
                  value={counselingAdvice.mindfulnessPractices}
                  onChange={(v) => setCounselingAdvice((a) => ({ ...a, mindfulnessPractices: v }))}
                  rows={2}
                />
              </div>
            </div>

            <div className="emr-divider" />

            {/* 2c: Therapeutic Issues */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <Target size={14} /> Therapeutic Issues
              </div>
              <div className="emr-grid-2">
                <FormField
                  label="Treatment Goals"
                  value={therapeuticIssues.treatmentGoals}
                  onChange={(v) => setTherapeuticIssues((t) => ({ ...t, treatmentGoals: v }))}
                  rows={3}
                />
                <FormField
                  label="Therapeutic Challenges"
                  value={therapeuticIssues.therapeuticChallenges}
                  onChange={(v) =>
                    setTherapeuticIssues((t) => ({ ...t, therapeuticChallenges: v }))
                  }
                  rows={3}
                />
                <FormField
                  label="Coping Skills"
                  value={therapeuticIssues.copingSkills}
                  onChange={(v) => setTherapeuticIssues((t) => ({ ...t, copingSkills: v }))}
                  rows={2}
                />
                <FormField
                  label="Homework Assigned"
                  value={therapeuticIssues.homework}
                  onChange={(v) => setTherapeuticIssues((t) => ({ ...t, homework: v }))}
                  rows={2}
                />
                <FormField
                  label="Interventions Used"
                  value={therapeuticIssues.interventionsUsed}
                  onChange={(v) => setTherapeuticIssues((t) => ({ ...t, interventionsUsed: v }))}
                  rows={2}
                />
                <FormField
                  label="Client Response"
                  value={therapeuticIssues.clientResponse}
                  onChange={(v) => setTherapeuticIssues((t) => ({ ...t, clientResponse: v }))}
                  rows={2}
                />
                <FormField
                  label="Progress Notes"
                  value={therapeuticIssues.progressNotes}
                  onChange={(v) => setTherapeuticIssues((t) => ({ ...t, progressNotes: v }))}
                  rows={2}
                />
                <FormField
                  label="Session Outcome"
                  value={therapeuticIssues.sessionOutcome}
                  onChange={(v) => setTherapeuticIssues((t) => ({ ...t, sessionOutcome: v }))}
                  rows={2}
                />
                <FormField
                  label="Next Session Objectives"
                  value={therapeuticIssues.nextSessionObjectives}
                  onChange={(v) =>
                    setTherapeuticIssues((t) => ({ ...t, nextSessionObjectives: v }))
                  }
                  rows={2}
                />
              </div>
            </div>

            <div className="emr-divider" />

            {/* 2d: Counseling Session Notes */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <MessageSquare size={14} /> Counseling Session Notes
              </div>
              <FormField
                label="Session Summary & Observations"
                value={counselingSessionNotes}
                onChange={setCounselingSessionNotes}
                rows={5}
              />
              <div className="emr-grid-2">
                <FormField
                  label="Client Feedback"
                  value={clientFeedback}
                  onChange={setClientFeedback}
                  rows={3}
                />
                <FormField
                  label="Follow-up Notes"
                  value={followUpNotes}
                  onChange={setFollowUpNotes}
                  rows={3}
                />
              </div>
            </div>
          </AccordionSection>

          {/* ── Section 3: Medical Doctor Section ── */}
          <AccordionSection
            id="section-3"
            label="Medical Doctor (Medico) Section"
            icon={<Stethoscope size={18} />}
            visible={isDoctor}
            rightContent={statusChip(
              fieldStatus(medicalExam.chiefComplaint, finalDiagnosis, medicalExam.bp),
            )}
          >
            {/* 3a: Medical Examination */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <Thermometer size={14} /> Medical Examination
              </div>
              <FormField
                label="Chief Complaint"
                value={medicalExam.chiefComplaint}
                onChange={(v) => setMedicalExam((m) => ({ ...m, chiefComplaint: v }))}
                rows={2}
              />
              <FormField
                label="History of Present Illness (HOPI)"
                value={medicalExam.hopi}
                onChange={(v) => setMedicalExam((m) => ({ ...m, hopi: v }))}
                rows={3}
              />
              <div className="emr-subsection-title" style={{ marginTop: 16 }}>
                <Activity size={13} /> Vital Signs
              </div>
              <div className="emr-vitals-grid">
                <VitalsInput
                  label="Blood Pressure"
                  value={medicalExam.bp}
                  onChange={(v) => setMedicalExam((m) => ({ ...m, bp: v }))}
                  unit="mmHg"
                />
                <VitalsInput
                  label="Heart Rate"
                  value={medicalExam.hr}
                  onChange={(v) => setMedicalExam((m) => ({ ...m, hr: v }))}
                  unit="bpm"
                />
                <VitalsInput
                  label="Respiratory Rate"
                  value={medicalExam.rr}
                  onChange={(v) => setMedicalExam((m) => ({ ...m, rr: v }))}
                  unit="/min"
                />
                <VitalsInput
                  label="Temperature"
                  value={medicalExam.temp}
                  onChange={(v) => setMedicalExam((m) => ({ ...m, temp: v }))}
                  unit="°F"
                />
                <VitalsInput
                  label="SpO₂"
                  value={medicalExam.spo2}
                  onChange={(v) => setMedicalExam((m) => ({ ...m, spo2: v }))}
                  unit="%"
                />
              </div>
              <div className="emr-grid-2">
                <FormField
                  label="General Examination"
                  value={medicalExam.generalExam}
                  onChange={(v) => setMedicalExam((m) => ({ ...m, generalExam: v }))}
                  rows={3}
                />
                <FormField
                  label="Systemic Examination"
                  value={medicalExam.systemExam}
                  onChange={(v) => setMedicalExam((m) => ({ ...m, systemExam: v }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="emr-divider" />

            {/* 3b: Medical Assessment */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <ClipboardList size={14} /> Medical Assessment
              </div>
              <div className="emr-grid-2">
                <FormField
                  label="Clinical Findings"
                  value={clinicalFindings}
                  onChange={setClinicalFindings}
                  rows={3}
                />
                <FormField
                  label="Differential Diagnosis"
                  value={differentialDiagnosis}
                  onChange={setDifferentialDiagnosis}
                  rows={3}
                />
                <FormField
                  label="Final Diagnosis"
                  value={finalDiagnosis}
                  onChange={setFinalDiagnosis}
                  rows={2}
                />
                <FormField label="Prognosis" value={prognosis} onChange={setPrognosis} rows={2} />
              </div>
            </div>

            <div className="emr-divider" />

            {/* 3c: Medical Advice */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <BookOpen size={14} /> Medical Advice
              </div>
              <div className="emr-grid-2">
                <FormField
                  label="Medication Plan"
                  value={medicationPlan}
                  onChange={setMedicationPlan}
                  rows={3}
                />
                <FormField
                  label="Dietary Advice"
                  value={dietaryAdvice}
                  onChange={setDietaryAdvice}
                  rows={3}
                />
                <FormField
                  label="Exercise Advice"
                  value={exerciseAdvice}
                  onChange={setExerciseAdvice}
                  rows={2}
                />
                <FormField
                  label="Referral"
                  value={medReferral}
                  onChange={setMedReferral}
                  rows={2}
                />
                <FormField
                  label="Follow-up Schedule"
                  value={medFollowUp}
                  onChange={setMedFollowUp}
                  rows={2}
                />
              </div>
            </div>

            <div className="emr-divider" />

            {/* 3d: Prescriptions */}
            <div className="emr-subsection">
              <div className="emr-subsection-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={14} /> Prescriptions
                </span>
                <button
                  className="emr-btn emr-btn-ghost emr-btn-sm"
                  onClick={checkDrugInteractions}
                >
                  <ShieldAlert size={13} /> Check Interactions
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                {['Medicine Name', 'Dose', 'Frequency', 'Duration', ''].map((h) => (
                  <div
                    key={h}
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0 2px',
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
              {presItems.map((item, i) => (
                <div key={i} className="emr-pres-row">
                  <input
                    value={item.medicineName}
                    onChange={(e) => {
                      const n = [...presItems];
                      n[i].medicineName = e.target.value;
                      setPresItems(n);
                    }}
                    placeholder="e.g. Sertraline"
                  />
                  <input
                    value={item.dose}
                    onChange={(e) => {
                      const n = [...presItems];
                      n[i].dose = e.target.value;
                      setPresItems(n);
                    }}
                    placeholder="e.g. 50mg"
                  />
                  <input
                    value={item.frequency}
                    onChange={(e) => {
                      const n = [...presItems];
                      n[i].frequency = e.target.value;
                      setPresItems(n);
                    }}
                    placeholder="OD / BD / TDS"
                  />
                  <input
                    value={item.duration}
                    onChange={(e) => {
                      const n = [...presItems];
                      n[i].duration = e.target.value;
                      setPresItems(n);
                    }}
                    placeholder="14 days"
                  />
                  <button
                    className="emr-btn emr-btn-danger emr-btn-sm"
                    onClick={() => setPresItems(presItems.filter((_, j) => j !== i))}
                    style={{ padding: '7px 10px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                className="emr-btn emr-btn-ghost emr-btn-sm"
                onClick={() =>
                  setPresItems([
                    ...presItems,
                    { medicineName: '', dose: '', frequency: '', duration: '' },
                  ])
                }
              >
                <Plus size={13} /> Add Medicine
              </button>
              {drugWarnings.length > 0 &&
                drugWarnings.map((w, i) => (
                  <div key={i} className="emr-warning">
                    {w}
                  </div>
                ))}
            </div>
          </AccordionSection>

          {/* ── Section 4: Psychological Assessments ── */}
          <AccordionSection
            id="section-4"
            label="Psychological Assessments & Tests"
            icon={<FlaskConical size={18} />}
            visible={true}
            rightContent={statusChip(fieldStatus(mseChecklist.clinicalImpression))}
          >
            {/* MSE */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <UserCheck size={14} /> Mental State Examination (MSE)
              </div>
              <div className="emr-mse-grid">
                {Object.entries({
                  appearance: [
                    'Appearance',
                    ['Well kempt and tidy', 'Dishevelled', 'Bizarre', 'Inappropriate for age'],
                  ],
                  eyeContact: ['Eye Contact', ['Present', 'Poor', 'Absent', 'Avoidant']],
                  rapport: [
                    'Rapport',
                    ['Easily established', 'Difficult to establish', 'Unable to establish'],
                  ],
                  attitude: ['Attitude', ['Cooperative', 'Guarded', 'Hostile', 'Passive']],
                  motor: [
                    'Motor Activity',
                    [
                      'Normal motor activity',
                      'Psychomotor retardation',
                      'Psychomotor agitation',
                      'Tremors',
                    ],
                  ],
                  speech: [
                    'Speech',
                    ['Audible, spontaneous', 'Rapid', 'Slow', 'Pressured', 'Mute', 'Dysarthric'],
                  ],
                  moodAffect: [
                    'Mood & Affect',
                    [
                      'Euthymic, congruent affect',
                      'Depressed, flat affect',
                      'Elevated, labile affect',
                      'Anxious, restricted affect',
                      'Irritable, incongruent affect',
                    ],
                  ],
                  thoughtProcess: [
                    'Thought Process',
                    [
                      'Linear, goal-directed',
                      'Circumstantial',
                      'Tangential',
                      'Flight of ideas',
                      'Thought blocking',
                      'Incoherent',
                    ],
                  ],
                  thoughtContent: [
                    'Thought Content',
                    [
                      'No suicidal/homicidal ideation',
                      'Passive death wish',
                      'Active suicidal ideation',
                      'Delusions present',
                      'Obsessions present',
                    ],
                  ],
                  perception: [
                    'Perception',
                    [
                      'No hallucinations',
                      'Auditory hallucinations',
                      'Visual hallucinations',
                      'Illusions',
                      'Derealization',
                    ],
                  ],
                  cognition: [
                    'Cognition',
                    [
                      'Alert, oriented ×3',
                      'Disoriented',
                      'Impaired memory',
                      'Impaired attention/concentration',
                    ],
                  ],
                  insightJudgment: [
                    'Insight & Judgment',
                    [
                      'Fair insight, intact judgment',
                      'Poor insight',
                      'No insight',
                      'Impaired judgment',
                    ],
                  ],
                }).map(([key, [label, opts]]) => (
                  <div key={key} className="emr-mse-field">
                    <label>{label as string}</label>
                    <select
                      value={(mseChecklist as any)[key]}
                      onChange={(e) => setMseChecklist((m) => ({ ...m, [key]: e.target.value }))}
                    >
                      {(opts as string[]).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="emr-field" style={{ marginTop: 12 }}>
                <label className="emr-label">Risk Level</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  {(['low', 'medium', 'high'] as const).map((r) => (
                    <button
                      key={r}
                      className="emr-btn emr-btn-ghost emr-btn-sm"
                      style={
                        mseChecklist.riskLevel === r
                          ? {
                              background:
                                r === 'low' ? '#059669' : r === 'medium' ? '#d97706' : '#dc2626',
                              color: '#fff',
                            }
                          : {}
                      }
                      onClick={() => setMseChecklist((m) => ({ ...m, riskLevel: r }))}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <FormField
                label="Clinical Impression"
                value={mseChecklist.clinicalImpression}
                onChange={(v) => setMseChecklist((m) => ({ ...m, clinicalImpression: v }))}
                rows={3}
              />
            </div>

            <div className="emr-divider" />

            {/* PHQ-9 */}
            <div className="emr-subsection">
              <div className="emr-subsection-title" style={{ justifyContent: 'space-between' }}>
                <span>
                  <Star size={14} /> PHQ-9 Depression Screener
                </span>
                <button
                  className="emr-btn emr-btn-ghost emr-btn-sm"
                  onClick={() => setShowPhqCalc(!showPhqCalc)}
                >
                  {showPhqCalc ? 'Hide' : 'Launch Calculator'}
                </button>
              </div>
              {showPhqCalc && (
                <div>
                  {phqQuestions.map((q, i) => (
                    <div key={i} className="emr-phq-row">
                      <div className="emr-phq-q">
                        {i + 1}. {q}
                      </div>
                      <div className="emr-phq-btns">
                        {[0, 1, 2, 3].map((score) => (
                          <button
                            key={score}
                            className={`emr-phq-btn ${phqResponses[i] === score ? 'active' : ''}`}
                            onClick={() => {
                              const n = [...phqResponses];
                              n[i] = score;
                              setPhqResponses(n);
                            }}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                      <div className="emr-phq-score">{phqResponses[i]}</div>
                    </div>
                  ))}
                  <div className="emr-phq-total">
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 4 }}>
                        Total Score
                      </div>
                      <div className="emr-phq-total-score">{phqTotal} / 27</div>
                    </div>
                    <div className="emr-phq-total-severity">{phqSeverity}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="emr-divider" />

            {/* Test ordering */}
            <div className="emr-subsection">
              <div className="emr-subsection-title">
                <Zap size={14} /> Order Assessments / Investigations
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="emr-field" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                  <label className="emr-label">Test</label>
                  <select
                    className="emr-select"
                    value={selectedTest}
                    onChange={(e) => setSelectedTest(e.target.value)}
                  >
                    {[
                      'PHQ-9',
                      'GAD-7',
                      'DASS-21',
                      'Beck Depression Inventory',
                      'Hamilton Anxiety Scale',
                      'MMSE',
                      'PCL-5 (PTSD)',
                      'CBS (Cognitive)',
                      'Draw-A-Person',
                      'Rorschach',
                      'Complete Blood Count',
                      'Thyroid Function Test',
                      'Blood Glucose',
                      'Liver Function Test',
                      'ECG',
                    ].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="emr-btn emr-btn-primary"
                  onClick={async () => {
                    try {
                      await api.post('/clinical/tests', {
                        studentId,
                        testName: selectedTest,
                        category: [
                          'Complete Blood Count',
                          'Thyroid Function Test',
                          'Blood Glucose',
                          'Liver Function Test',
                          'ECG',
                        ].includes(selectedTest)
                          ? 'lab'
                          : 'psychological',
                      });
                      setTests((prev) => [
                        ...prev,
                        {
                          testName: selectedTest,
                          status: 'pending',
                          orderedAt: new Date().toISOString(),
                        },
                      ]);
                    } catch {
                      alert('Failed to order test.');
                    }
                  }}
                >
                  <Plus size={15} /> Order Test
                </button>
              </div>
              {tests.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  {tests.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#0f172a',
                        borderRadius: 8,
                        marginBottom: 6,
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ color: '#cbd5e1' }}>{t.testName}</span>
                      <span
                        style={{
                          color: t.status === 'pending' ? '#fbbf24' : '#34d399',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* ── Section 5: Clinical Documentation ── */}
          <AccordionSection
            id="section-5"
            label="Clinical Documentation"
            icon={<FileText size={18} />}
            visible={true}
            rightContent={statusChip(fieldStatus(sessionNotesText, riskAssessment))}
          >
            <FormField
              label="Session Notes"
              value={sessionNotesText}
              onChange={setSessionNotesText}
              rows={5}
            />
            <div className="emr-grid-2">
              <FormField
                label="Intake Assessment Notes"
                value={intakeAssessment}
                onChange={setIntakeAssessment}
                rows={4}
              />
              <FormField
                label="Risk Assessment"
                value={riskAssessment}
                onChange={setRiskAssessment}
                rows={4}
                placeholder="Describe suicide risk, self-harm, harm to others..."
              />
            </div>
          </AccordionSection>

          {/* ── Section 6: SOAP Notes ── */}
          <AccordionSection
            id="section-6"
            label="SOAP Notes"
            icon={<ClipboardList size={18} />}
            visible={true}
            rightContent={statusChip(fieldStatus(subjective, objective, assessment, plan))}
          >
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                className="emr-btn emr-btn-ghost emr-btn-sm"
                onClick={() => startDictation('subjective', setSubjective, subjective)}
              >
                {isDictating === 'subjective' ? <MicOff size={13} /> : <Mic size={13} />} Dictate
              </button>
              {sessionId && (
                <button
                  type="button"
                  className="emr-btn emr-btn-ghost emr-btn-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                  onClick={openHistoryModal}
                >
                  <History size={13} className="mr-1" /> View Note Version History
                </button>
              )}
            </div>
            <div className="emr-grid-2">
              <FormField
                label="S — Subjective (Client Reports)"
                value={subjective}
                onChange={setSubjective}
                rows={4}
              />
              <FormField
                label="O — Objective (Clinician Observations)"
                value={objective}
                onChange={setObjective}
                rows={4}
              />
              <FormField
                label="A — Assessment (Clinical Judgment)"
                value={assessment}
                onChange={setAssessment}
                rows={4}
              />
              <FormField label="P — Plan (Next Steps)" value={plan} onChange={setPlan} rows={4} />
            </div>
            <div className="emr-field">
              <label className="emr-label">Intervention Used</label>
              <select
                className="emr-select"
                value={interventionUsed}
                onChange={(e) => setInterventionUsed(e.target.value)}
              >
                {[
                  'Supportive Therapy',
                  'CBT',
                  'DBT',
                  'ACT',
                  'SFBT',
                  'Motivational Interviewing',
                  'MBCT',
                  'Trauma-Informed Care',
                  'Psychoeducation',
                  'Strength-Based Counseling',
                  'Positive Psychology',
                  'Interpersonal Therapy',
                  'Family Therapy',
                  'Group Therapy',
                ].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          </AccordionSection>

          {/* ── Section 7: Treatment Plan ── */}
          <AccordionSection
            id="section-7"
            label="Treatment Plan"
            icon={<Target size={18} />}
            visible={true}
            rightContent={statusChip(
              fieldStatus(treatmentPlanData.goals, treatmentPlanData.interventions),
            )}
          >
            <div className="emr-grid-2">
              <FormField
                label="Therapy Type"
                value={treatmentPlanData.therapyType}
                onChange={(v) => setTreatmentPlanData((t) => ({ ...t, therapyType: v }))}
                type="input"
              />
              <FormField
                label="Review Schedule"
                value={treatmentPlanData.reviewSchedule}
                onChange={(v) => setTreatmentPlanData((t) => ({ ...t, reviewSchedule: v }))}
                type="input"
              />
            </div>
            <FormField
              label="Treatment Goals"
              value={treatmentPlanData.goals}
              onChange={(v) => setTreatmentPlanData((t) => ({ ...t, goals: v }))}
              rows={4}
            />
            <FormField
              label="Planned Interventions"
              value={treatmentPlanData.interventions}
              onChange={(v) => setTreatmentPlanData((t) => ({ ...t, interventions: v }))}
              rows={4}
            />
            <FormField
              label="Outcome Targets & Measures"
              value={treatmentPlanData.outcomeTargets}
              onChange={(v) => setTreatmentPlanData((t) => ({ ...t, outcomeTargets: v }))}
              rows={3}
            />
            <FormField
              label="Homework Assigned"
              value={treatmentPlanData.homeworkAssigned}
              onChange={(v) => setTreatmentPlanData((t) => ({ ...t, homeworkAssigned: v }))}
              rows={2}
            />
          </AccordionSection>

          {/* ── Section 8: Attachments ── */}
          <AccordionSection
            id="section-8"
            label="Attachments"
            icon={<Paperclip size={18} />}
            visible={true}
            rightContent={statusChip(attachments.length > 0 ? 'completed' : 'empty')}
          >
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                border: '2px dashed rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#475569',
                fontSize: '0.9rem',
              }}
            >
              <Archive size={32} style={{ display: 'block', margin: '0 auto 10px' }} />
              Drag & drop files here or click to upload
              <br />
              <span style={{ fontSize: '0.78rem', color: '#334155' }}>
                Supported: PDF, JPG, PNG, DOCX (max 10MB each)
              </span>
            </div>
          </AccordionSection>
        </div>
      </div>

      {/* ── Draft to Report Modal ── */}
      {showDraftToReport && (
        <div className="emr-modal-overlay">
          <div className="emr-modal">
            <div className="emr-modal-header">
              <div className="emr-modal-title">
                <Send size={18} /> AI Draft → Report
              </div>
              <button
                onClick={() => setShowDraftToReport(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="emr-modal-body">
              <div className="emr-field">
                <label className="emr-label">Generate Output Type</label>
                <select
                  className="emr-select"
                  value={selectedDraftOutput}
                  onChange={(e) => setSelectedDraftOutput(e.target.value)}
                >
                  {[
                    ['counseling-report', 'Counseling Report'],
                    ['soap-notes', 'SOAP Notes'],
                    ['progress-notes', 'Progress Notes'],
                    ['treatment-plan', 'Treatment Plan'],
                    ['session-summary', 'Session Summary'],
                    ['follow-up-plan', 'Follow-up Plan'],
                    ['referral-letter', 'Referral Letter'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              {generatedDraft ? (
                <div>
                  <div
                    style={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: 16,
                      fontSize: '0.85rem',
                      color: '#cbd5e1',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    {Object.entries(generatedDraft).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: '#60a5fa',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            marginBottom: 4,
                          }}
                        >
                          {k.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div>{v as string}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: 8 }}>
                    ⚠️ AI-generated draft. Review and edit before applying to the official record.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: '#475569',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    padding: '20px 0',
                  }}
                >
                  Click "Generate Draft" to transform your session notes into a structured report.
                </div>
              )}
            </div>
            <div className="emr-modal-footer">
              <button
                className="emr-btn emr-btn-ghost"
                onClick={() => {
                  setShowDraftToReport(false);
                  setGeneratedDraft(null);
                }}
              >
                Cancel
              </button>
              <button
                className="emr-btn emr-btn-ai"
                onClick={generateDraftReport}
                disabled={draftGenerating}
              >
                <Sparkles size={14} /> {draftGenerating ? 'Generating…' : 'Generate Draft'}
              </button>
              {generatedDraft && (
                <button className="emr-btn emr-btn-success" onClick={applyDraftToFields}>
                  <Check size={14} /> Apply to Fields
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Session Completion Modal ── */}
      {showCompletionModal && (
        <div className="emr-modal-overlay">
          <div className="emr-modal">
            <div className="emr-modal-header">
              <div className="emr-modal-title">
                <CheckCircle size={18} color="#34d399" /> Session Completion
              </div>
              <button
                onClick={() => setShowCompletionModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="emr-modal-body">
              <div className="emr-field">
                <label className="emr-label">Session Status</label>
                <select
                  className="emr-select"
                  value={sessionStatus}
                  onChange={(e) => setSessionStatus(e.target.value as SessionStatus)}
                >
                  {[
                    ['completed', 'Session Completed'],
                    ['continue_treatment', 'Continue Treatment'],
                    ['follow_up_required', 'Follow-up Required'],
                    ['referred', 'Referred to Another Counselor'],
                    ['emergency_escalation', '🔴 Emergency Escalation'],
                    ['rescheduled', 'Session Rescheduled'],
                    ['no_show', 'No Show'],
                    ['administrative_closure', 'Administrative Closure'],
                    ['discharged', 'Treatment Completed / Client Discharged'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              {sessionStatus === 'discharged' && (
                <div>
                  <div className="emr-field">
                    <label className="emr-label">Case Outcome</label>
                    <select
                      className="emr-select"
                      value={caseOutcome}
                      onChange={(e) => setCaseOutcome(e.target.value)}
                    >
                      {[
                        'Treatment Goals Achieved',
                        'Significant Improvement',
                        'Partial Improvement',
                        'No Significant Change',
                        'Long-Term Therapy Recommended',
                        'Referred to Another Professional',
                        'Client Withdrew from Treatment',
                        'Lost to Follow-up',
                        'Administrative Case Closure',
                      ].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <FormField
                    label="Discharge Summary"
                    value={dischargeSummary}
                    onChange={setDischargeSummary}
                    rows={5}
                    placeholder="Overall progress, goals achieved, remaining concerns, self-care recommendations..."
                  />
                </div>
              )}
              <div
                style={{
                  background: 'rgba(16,185,129,0.05)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: '0.82rem',
                  color: '#86efac',
                }}
              >
                <strong>AI Follow-up Suggestions:</strong>
                <br />
                {sessionStatus === 'follow_up_required' &&
                  'Recommended: Follow-up in 1–2 weeks. Reassess presenting concerns and therapeutic progress.'}
                {sessionStatus === 'completed' &&
                  'Recommended: Follow-up in 2–4 weeks depending on clinical presentation. Monitor for symptom changes.'}
                {sessionStatus === 'referred' &&
                  'Document referral details in the medical record. Follow-up with client to confirm they attended the referral.'}
                {sessionStatus === 'discharged' &&
                  'Ensure discharge summary covers goals achieved, ongoing self-care plan, and any emergency contact information shared.'}
                {sessionStatus === 'emergency_escalation' &&
                  '🔴 Emergency protocol activated. Ensure immediate safety plan is in place and emergency contacts notified.'}
                {![
                  'follow_up_required',
                  'completed',
                  'referred',
                  'discharged',
                  'emergency_escalation',
                ].includes(sessionStatus) &&
                  'No automated suggestions for this status. Document as clinically indicated.'}
              </div>
            </div>
            <div className="emr-modal-footer">
              <button
                className="emr-btn emr-btn-ghost"
                onClick={() => setShowCompletionModal(false)}
              >
                Cancel
              </button>
              <button
                className="emr-btn emr-btn-success"
                onClick={() => {
                  saveSession(false);
                  setShowCompletionModal(false);
                  onSaved?.();
                }}
              >
                <CheckCircle size={14} /> Save & Complete Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Access Manager Modal ── */}
      {showAccessManager && (
        <div className="emr-modal-overlay">
          <div className="emr-modal">
            <div className="emr-modal-header">
              <div className="emr-modal-title">
                <Lock size={18} /> Report Access Control
              </div>
              <button
                onClick={() => setShowAccessManager(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="emr-modal-body">
              <div
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: '0.82rem',
                  color: '#fca5a5',
                  marginBottom: 20,
                }}
              >
                <ShieldAlert size={14} style={{ display: 'inline', marginRight: 6 }} />
                Reports are <strong>confidential by default</strong>. Students cannot view any
                clinical reports unless you explicitly grant access below.
              </div>
              <div className="emr-field">
                <label className="emr-label">Access Level</label>
                <div className="emr-access-grid">
                  {[
                    ['full', 'Full Report', 'All sections visible'],
                    ['partial', 'Partial Access', 'Selected sections only'],
                    ['summary_only', 'Summary Only', 'Plain-language summary'],
                    ['recommendations_only', 'Recommendations', 'Homework & follow-up only'],
                  ].map(([v, h, d]) => (
                    <div
                      key={v}
                      className={`emr-access-option ${accessLevel === v ? 'selected' : ''}`}
                      onClick={() => setAccessLevel(v)}
                    >
                      <h4>{h}</h4>
                      <p>{d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="emr-field">
                <label className="emr-label">Access Expiry Date (optional)</label>
                <input
                  type="date"
                  className="emr-input"
                  value={accessExpiry}
                  onChange={(e) => setAccessExpiry(e.target.value)}
                />
              </div>
            </div>
            <div className="emr-modal-footer">
              <button className="emr-btn emr-btn-danger" onClick={revokeAccess}>
                <X size={14} /> Revoke All Access
              </button>
              <button className="emr-btn emr-btn-ghost" onClick={() => setShowAccessManager(false)}>
                Cancel
              </button>
              <button className="emr-btn emr-btn-success" onClick={grantAccess}>
                <Check size={14} /> Grant Access to Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual SOAP Note Audit Logs Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <History size={20} className="text-blue-600" />
                  Visual SOAP Note Audit Logs
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Compare SOAP Note edits and clinical audit trail versions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex p-6 gap-6">
              {historyLoading ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <span className="text-xs text-slate-500 font-semibold animate-pulse">
                    Loading version history...
                  </span>
                </div>
              ) : sessionHistoryList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 space-y-2">
                  <span className="text-3xl">🪵</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No revisions found.
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Make changes to this session and click Save to generate edit history version
                    logs.
                  </p>
                </div>
              ) : (
                <>
                  {/* Left: Timeline selector */}
                  <div className="w-1/4 border-r border-slate-200 dark:border-slate-800 pr-4 space-y-2 overflow-y-auto h-full text-left">
                    <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                      Versions Timeline
                    </span>
                    <div className="space-y-2">
                      {sessionHistoryList.map((ver, idx) => {
                        const isActive = selectedVersionIdx === idx;
                        return (
                          <button
                            key={ver.id}
                            type="button"
                            onClick={() => setSelectedVersionIdx(idx)}
                            className={`w-full text-left p-3 rounded-xl transition cursor-pointer border block ${
                              isActive
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/60'
                                : 'bg-white hover:bg-slate-50 border-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 dark:border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400'
                                }`}
                              >
                                v{ver.version}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(ver.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="mt-2 text-[11px] font-bold text-slate-700 dark:text-slate-350 truncate">
                              By {ver.editor_name || 'System'}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              {new Date(ver.created_at).toLocaleDateString()}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Diff Viewer */}
                  <div className="w-3/4 pl-4 space-y-6 overflow-y-auto h-full pr-2">
                    {selectedVersionIdx !== null &&
                      sessionHistoryList[selectedVersionIdx] &&
                      (() => {
                        const ver = sessionHistoryList[selectedVersionIdx];
                        return (
                          <>
                            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 mb-2 text-left">
                              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                                Comparing Active Draft with:
                              </span>
                              <div className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                                Version {ver.version} (Saved by {ver.editor_name || 'Clinician'} on{' '}
                                {new Date(ver.created_at).toLocaleString()})
                              </div>
                            </div>

                            <div className="space-y-3">
                              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">
                                Subjective Note Diff
                              </span>
                              <DiffViewer oldText={ver.subjective} newText={subjective} />
                            </div>

                            <div className="space-y-3">
                              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">
                                Objective Note Diff
                              </span>
                              <DiffViewer oldText={ver.objective} newText={objective} />
                            </div>

                            <div className="space-y-3">
                              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">
                                Assessment Note Diff
                              </span>
                              <DiffViewer oldText={ver.assessment} newText={assessment} />
                            </div>

                            <div className="space-y-3">
                              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-left">
                                Plan Note Diff
                              </span>
                              <DiffViewer oldText={ver.plan} newText={plan} />
                            </div>
                          </>
                        );
                      })()}
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/85 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="btn-secondary py-2 px-5 text-xs font-semibold rounded-xl"
              >
                Close Audit Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
