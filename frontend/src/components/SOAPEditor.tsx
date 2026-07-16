import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Sparkles, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, History, ClipboardList, BookOpen, Printer } from 'lucide-react';

interface SOAPEditorProps {
  studentId: number;
  appointmentId?: number;
  initialSessionId?: number;
  onSaved?: () => void;
}

export default function SOAPEditor({ studentId, appointmentId, initialSessionId, onSaved }: SOAPEditorProps) {
  const [sessionId, setSessionId] = useState<number | undefined>(initialSessionId);
  
  // Expanded Form State
  const [formData, setFormData] = useState({
    presentingComplaint: '',
    history: '',
    pastPsychiatric: '',
    pastMedical: '',
    medicationHistory: '',
    familyHistory: '',
    developmentalHistory: '',
    educationalHistory: '',
    occupationalHistory: '',
    relationshipHistory: '',
    substanceUse: '',
    legalHistory: '',
    socialHistory: '',
    traumaHistory: '',
    personalityTraits: '',
    protectiveFactors: '',
    strengths: '',
    mse: '',
    diagnosis: '',
    differentialDiagnosis: '',
    caseFormulation: '',
    riskAssessment: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    interventionUsed: 'Supportive Therapy',
    homeworkAssigned: '',
    sessionDuration: '50'
  });

  // MSE Checklist State
  const [mseChecklist, setMseChecklist] = useState({
    appearanceSelection: 'Well kempt and tidy',
    build: 'mesomorph (Athletic, muscular)',
    hair: 'Well groomed',
    contact: 'Present',
    eyeContact: 'present',
    rapport: 'Easily established',
    attitude: 'Cooperative',
    motor: 'Normal motor activity',
    intensity: 'audible',
    reaction: 'normal',
    speed: 'normal',
    prosody: 'normal fluctuations',
    ease: 'spontaneous',
    productivity: 'Normal',
    moodAffect: 'Euthymic, congruent affect',
    thoughtProcess: 'Linear, goal-directed',
    thoughtContent: 'No suicidal/homicidal ideation or delusions',
    perception: 'No hallucinations',
    cognition: 'Alert, oriented x3, intact memory',
    insightJudgment: 'Fair insight, intact judgment',
    riskLevel: 'low',
    clinicalImpression: ''
  });

  const [versions, setVersions] = useState<any[]>([]);
  const [mseLogs, setMseLogs] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'case-history' | 'child-case-history' | 'soap' | 'mse' | 'ai-helper'>('soap');

  // Child Case History form state
  const [cchSociodemographics, setCchSociodemographics] = useState({
    name: '', sex: 'Male', age: '', address: '', motherTongue: '',
    education: '', religion: '', residence: 'Urban', familyTypeSize: '',
    familyIncome: '', occupationMarital: ''
  });
  const [cchComplaints, setCchComplaints] = useState('');
  const [cchHopi, setCchHopi] = useState('');
  const [cchTreatmentHistory, setCchTreatmentHistory] = useState('');
  const [cchPastHistory, setCchPastHistory] = useState('');
  const [cchFamilyHistory, setCchFamilyHistory] = useState({
    familyTree: '', fatherAge: '', fatherStatus: 'Living', fatherEducation: '',
    fatherOccupation: '', fatherRelationship: '', motherAge: '', motherStatus: 'Living',
    motherEducation: '', motherOccupation: '', motherRelationship: '', psychiatricHistory: ''
  });
  const [cchPersonalHistory, setCchPersonalHistory] = useState({
    birthType: 'Normal', birthCry: 'Immediate', birthComplication: '', prenatalFactors: '',
    perinatalFactors: '', milestones: '', currentStatus: '', parentsRelationship: '',
    playBehaviour: '', schoolAdmissionAge: '', highestGrade: '', academicPerformance: ''
  });
  const [cchLogs, setCchLogs] = useState<any[]>([]);

  // AI assistant feedback states
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [riskAlert, setRiskAlert] = useState<{ detected: boolean; msg: string; keywords: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
    fetchMSELogs();
    fetchChildCaseHistories();
  }, [sessionId, studentId]);

  const loadSession = async (id: number) => {
    setLoading(true);
    try {
      const data = await api.clinical.getSession(id);
      setFormData({
        presentingComplaint: data.presenting_complaint || '',
        history: data.history || '',
        pastPsychiatric: data.past_psychiatric || '',
        pastMedical: data.past_medical || '',
        medicationHistory: data.medication_history || '',
        familyHistory: data.family_history || '',
        developmentalHistory: data.developmental_history || '',
        educationalHistory: data.educational_history || '',
        occupationalHistory: data.occupational_history || '',
        relationshipHistory: data.relationship_history || '',
        substanceUse: data.substance_use || '',
        legalHistory: data.legal_history || '',
        socialHistory: data.social_history || '',
        traumaHistory: data.trauma_history || '',
        personalityTraits: data.personality_traits || '',
        protectiveFactors: data.protective_factors || '',
        strengths: data.strengths || '',
        mse: data.mse || '',
        diagnosis: data.diagnosis || '',
        differentialDiagnosis: data.differential_diagnosis || '',
        caseFormulation: data.case_formulation || '',
        riskAssessment: data.risk_assessment || '',
        subjective: data.subjective || '',
        objective: data.objective || '',
        assessment: data.assessment || '',
        plan: data.plan || '',
        interventionUsed: data.intervention_used || 'Supportive Therapy',
        homeworkAssigned: data.homework_assigned || '',
        sessionDuration: (data.session_duration || 50).toString()
      });
      loadVersionHistory(id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async (id: number) => {
    try {
      const history = await api.clinical.getSessionVersions(id);
      setVersions(history);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMSELogs = async () => {
    try {
      const logs = await api.clinical.getMSELogs(studentId);
      setMseLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChildCaseHistories = async () => {
    try {
      const logs = await api.clinical.getChildCaseHistories(studentId);
      setCchLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveStatus('saving');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      triggerAutoSave({ ...formData, [field]: value });
    }, 3000);
  };

  const triggerAutoSave = async (data: typeof formData) => {
    try {
      const res = await api.clinical.saveSession({
        id: sessionId,
        appointmentId,
        studentId,
        ...data,
        autoSave: true
      });
      if (res.id && !sessionId) {
        setSessionId(res.id);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  const handleSaveFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      const res = await api.clinical.saveSession({
        id: sessionId,
        appointmentId,
        studentId,
        ...formData,
        autoSave: false
      });
      if (res.id && !sessionId) {
        setSessionId(res.id);
      }
      setSaveStatus('saved');
      alert("EMHR Clinical Session notes successfully locked and compiled.");
      if (res.id) loadVersionHistory(res.id);
      if (onSaved) onSaved();
    } catch (err) {
      setSaveStatus('error');
      alert("Failed to save clinical records");
    }
  };

  // Structured MSE Submission
  const handleSaveMSE = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const appearanceConcat = `Appearance: ${mseChecklist.appearanceSelection}. Build: ${mseChecklist.build}. Hair: ${mseChecklist.hair}. Contact: ${mseChecklist.contact}. Eye contact: ${mseChecklist.eyeContact}.`;
      const behaviourConcat = `Rapport: ${mseChecklist.rapport}. Attitude: ${mseChecklist.attitude}. Motor behaviour: ${mseChecklist.motor}.`;
      const speechConcat = `Intensity: ${mseChecklist.intensity}. Reaction: ${mseChecklist.reaction}. Speed: ${mseChecklist.speed}. Prosody: ${mseChecklist.prosody}. Ease: ${mseChecklist.ease}. Productivity: ${mseChecklist.productivity}.`;

      await api.clinical.saveMSE({
        studentId,
        sessionId,
        appearance: appearanceConcat,
        behaviour: behaviourConcat,
        speech: speechConcat,
        moodAffect: mseChecklist.moodAffect,
        thoughtProcess: mseChecklist.thoughtProcess,
        thoughtContent: mseChecklist.thoughtContent,
        perception: mseChecklist.perception,
        cognition: mseChecklist.cognition,
        insightJudgment: mseChecklist.insightJudgment,
        riskLevel: mseChecklist.riskLevel,
        clinicalImpression: mseChecklist.clinicalImpression
      });
      alert("Structured Mental State Exam (MSE) log recorded successfully.");
      fetchMSELogs();
    } catch (err) {
      alert("Failed to save MSE log");
    }
  };

  // Structured Child Case History Submission
  const handleSaveCCH = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.clinical.saveChildCaseHistory({
        studentId,
        sociodemographics: cchSociodemographics,
        presentingComplaints: cchComplaints,
        hopi: cchHopi,
        treatmentHistory: cchTreatmentHistory,
        pastHistory: cchPastHistory,
        familyHistory: cchFamilyHistory,
        personalHistory: cchPersonalHistory
      });
      alert("Child Case History record saved successfully.");
      fetchChildCaseHistories();
    } catch (err) {
      alert("Failed to save Child Case History");
    }
  };

  // ==========================================
  // AI CLINICAL COPILOT AGENTS
  // ==========================================
  const handleAIRiskScan = async () => {
    setAiLoading(true);
    try {
      const combinedText = `${formData.presentingComplaint} ${formData.subjective} ${formData.plan}`;
      const res = await api.clinical.aiAssist('risk-scan', { text: combinedText });
      
      setRiskAlert({
        detected: res.riskAlertDetected,
        msg: res.crisisPlan,
        keywords: res.flaggedKeywords
      });
      
      if (res.riskAlertDetected) {
        alert("CRITICAL WARNING: Self-harm or suicide indicator keywords detected. Safety protocol summary generated.");
      } else {
        alert("Risk Scan complete. No primary suicide/self-harm indicators detected.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIGenerateSOAP = async () => {
    if (!formData.presentingComplaint) {
      alert("Please enter a Presenting Complaint first to run SOAP analysis.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.clinical.aiAssist('generate-soap', { text: formData.presentingComplaint });
      setFormData(prev => ({
        ...prev,
        subjective: res.subjective,
        objective: res.objective,
        assessment: res.assessment,
        plan: res.plan
      }));
      alert("AI SOAP notes generated! Review drafts in SOAP tabs.");
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAISuggestDiagnoses = async () => {
    setAiLoading(true);
    try {
      const combinedText = `${formData.presentingComplaint} ${formData.history} ${formData.subjective}`;
      const res = await api.clinical.aiAssist('suggest-diagnosis', { text: combinedText });
      setAiSuggestions(res.suggestions);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyDiagnosis = (code: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: `${code} ${name}`
    }));
    alert(`Applied reference diagnosis: ${name}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Risk Alert Indicator Banner */}
      {riskAlert?.detected && (
        <div className="p-4 border-2 border-red-500 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-300 rounded-2xl flex items-start gap-3 animate-pulse">
          <ShieldAlert className="shrink-0 text-red-600 dark:text-red-400" size={24} />
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wide">Crisis Keyword Alert Flagged</h4>
            <p className="text-xs font-semibold mt-1 leading-relaxed">{riskAlert.msg}</p>
            <div className="flex gap-2 mt-2">
              {riskAlert.keywords.map((kw, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-red-200 dark:bg-red-900/60 font-mono text-[9px] font-bold uppercase rounded">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main layout: Sidebar with section selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Selector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm h-fit space-y-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">Clinical Tabs</h3>
          {[
            { id: 'soap', label: 'SOAP Notes Editor', icon: ClipboardList },
            { id: 'case-history', label: 'Intake Case History', icon: BookOpen },
            { id: 'child-case-history', label: 'Child Case History', icon: BookOpen },
            { id: 'mse', label: 'Mental State Exam (MSE)', icon: History },
            { id: 'ai-helper', label: 'AI Clinical Assist', icon: Sparkles }
          ].map(sec => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold rounded-xl text-left transition cursor-pointer ${
                  activeSection === sec.id
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon size={16} />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Workspace Form Pane */}
        <div className="lg:col-span-3">
          
          {/* SECTION 1: SOAP EDITOR */}
          {activeSection === 'soap' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white">SOAP Framework & Diagnosis</h3>
                <span className="text-xs text-slate-500 font-medium">
                  Status: {saveStatus === 'saved' ? 'Draft saved' : saveStatus === 'saving' ? 'Saving...' : 'Idle'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Subjective (S)</label>
                  <textarea
                    value={formData.subjective}
                    onChange={(e) => handleFieldChange('subjective', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Symptom descriptions, subjective feeling reports..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Objective (O)</label>
                  <textarea
                    value={formData.objective}
                    onChange={(e) => handleFieldChange('objective', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Observer records, somatic features..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Assessment (A)</label>
                  <textarea
                    value={formData.assessment}
                    onChange={(e) => handleFieldChange('assessment', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Clinical evaluation and session diagnostics..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Plan (P)</label>
                  <textarea
                    value={formData.plan}
                    onChange={(e) => handleFieldChange('plan', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Therapy homework, follow-up dates..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Therapeutic Intervention</label>
                  <input
                    type="text"
                    value={formData.interventionUsed}
                    onChange={(e) => handleFieldChange('interventionUsed', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. CBT Restructuring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">DSM-5-TR Diagnosis</label>
                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(e) => handleFieldChange('diagnosis', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="F41.1 Generalized Anxiety"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Duration (mins)</label>
                  <input
                    type="number"
                    value={formData.sessionDuration}
                    onChange={(e) => handleFieldChange('sessionDuration', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveFinal}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition cursor-pointer"
                >
                  Save & Lock Session Note
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: COMPREHENSIVE CASE HISTORY */}
          {activeSection === 'case-history' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Client Intake & Case History</h3>
                <p className="text-xs text-slate-500 mt-1">Record comprehensive past background and protective factors</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Presenting Complaint</label>
                  <textarea
                    value={formData.presentingComplaint}
                    onChange={(e) => handleFieldChange('presentingComplaint', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Chief symptoms reporting..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">History of Present Illness</label>
                  <textarea
                    value={formData.history}
                    onChange={(e) => handleFieldChange('history', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Chronology and severity details of current issues..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Past Psychiatric History</label>
                  <textarea
                    value={formData.pastPsychiatric}
                    onChange={(e) => handleFieldChange('pastPsychiatric', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Family & Trauma History</label>
                  <textarea
                    value={formData.familyHistory}
                    onChange={(e) => handleFieldChange('familyHistory', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Generational illness, family stress triggers, trauma background..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Substance Use History</label>
                  <textarea
                    value={formData.substanceUse}
                    onChange={(e) => handleFieldChange('substanceUse', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Client Strengths & Protective Factors</label>
                  <textarea
                    value={formData.strengths}
                    onChange={(e) => handleFieldChange('strengths', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Support systems, hobbies, coping tools, academic drivers..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: MENTAL STATE EXAM */}
          {activeSection === 'mse' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Mental State Examination Form</h3>
                  <p className="text-xs text-slate-500 mt-1">Audit behavioral and cognitive profiles</p>
                </div>

                <form onSubmit={handleSaveMSE} className="space-y-6">
                  {/* 1. General Appearance and Behaviour */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">1. General Appearance and Behaviour</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Appearance</label>
                        <select
                          value={mseChecklist.appearanceSelection}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, appearanceSelection: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Well kempt and tidy</option>
                          <option>unkempt and untidy</option>
                          <option>overly made-up</option>
                          <option>perplexed</option>
                          <option>sickly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Body Build</label>
                        <select
                          value={mseChecklist.build}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, build: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>endomorph (stocky, rounded, obese)</option>
                          <option>mesomorph (Athletic, muscular)</option>
                          <option>ectomorph (long, linear)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hair</label>
                        <select
                          value={mseChecklist.hair}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, hair: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Well groomed</option>
                          <option>Negligent</option>
                          <option>Disheveled</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Contact with Surrounding</label>
                        <select
                          value={mseChecklist.contact}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, contact: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Present</option>
                          <option>Partial</option>
                          <option>Absent</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Eye Contact</label>
                        <select
                          value={mseChecklist.eyeContact}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, eyeContact: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>present</option>
                          <option>partial</option>
                          <option>absent</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Rapport</label>
                        <select
                          value={mseChecklist.rapport}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, rapport: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Easily established</option>
                          <option>Established with difficulty</option>
                          <option>Not possible</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Attitude towards Examiner</label>
                        <select
                          value={mseChecklist.attitude}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, attitude: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Cooperative</option>
                          <option>Defensive</option>
                          <option>guarded</option>
                          <option>evasive</option>
                          <option>suspicious</option>
                          <option>hostile</option>
                          <option>distractible</option>
                          <option>uncooperative</option>
                          <option>seductive</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Motor Behavior</label>
                        <select
                          value={mseChecklist.motor}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, motor: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Normal motor activity</option>
                          <option>Hyperactive</option>
                          <option>restless</option>
                          <option>retarded</option>
                          <option>tics</option>
                          <option>mannerisms</option>
                          <option>awkward</option>
                          <option>gestures</option>
                          <option>silly smiling</option>
                          <option>preoccupied</option>
                          <option>stereotypy</option>
                          <option>self-injurious</option>
                          <option>aggressive</option>
                          <option>rigidity</option>
                          <option>touching examiner</option>
                          <option>hallucinatory behavior</option>
                          <option>automatic obedience</option>
                          <option>echopraxia</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2. Speech */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">2. Speech</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Intensity</label>
                        <select
                          value={mseChecklist.intensity}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, intensity: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>soft</option>
                          <option>audible</option>
                          <option>loud</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Reaction Time to Stimulus</label>
                        <select
                          value={mseChecklist.reaction}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, reaction: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>normal</option>
                          <option>shortened</option>
                          <option>delayed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Speed</label>
                        <select
                          value={mseChecklist.speed}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, speed: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>normal</option>
                          <option>very slow</option>
                          <option>rapid</option>
                          <option>pressure of speech</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Prosody / Tempo</label>
                        <select
                          value={mseChecklist.prosody}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, prosody: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>normal fluctuations</option>
                          <option>monotonous</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ease of Speech</label>
                        <select
                          value={mseChecklist.ease}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, ease: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>spontaneous</option>
                          <option>hesitant</option>
                          <option>mute</option>
                          <option>slurring</option>
                          <option>stuttering</option>
                          <option>whispering</option>
                          <option>muttering</option>
                          <option>speaks only when questioned</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Productivity / Volume</label>
                        <select
                          value={mseChecklist.productivity}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, productivity: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Normal</option>
                          <option>overabundant</option>
                          <option>poverty of speech</option>
                          <option>poverty of content</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 3. Mood & Thought */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">3. Clinical Mood & Thought Streams</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mood & Affect</label>
                        <select
                          value={mseChecklist.moodAffect}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, moodAffect: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Euthymic, congruent affect</option>
                          <option>Depressed mood, flat affect</option>
                          <option>Anxious/irritable mood, labile affect</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Thought Process</label>
                        <select
                          value={mseChecklist.thoughtProcess}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, thoughtProcess: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Linear, goal-directed</option>
                          <option>Tangential, loose associations</option>
                          <option>Flight of ideas</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Risk Level</label>
                        <select
                          value={mseChecklist.riskLevel}
                          onChange={(e) => setMseChecklist({ ...mseChecklist, riskLevel: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 font-bold"
                        >
                          <option value="low">Low Risk</option>
                          <option value="medium">Medium Risk (Ideation without intent)</option>
                          <option value="high">High Risk (Active intent, safety plan needed)</option>
                          <option value="severe">Severe Risk (Crisis protocols required)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Clinical Impression & Formulation</label>
                    <textarea
                      value={mseChecklist.clinicalImpression}
                      onChange={(e) => setMseChecklist({ ...mseChecklist, clinicalImpression: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950"
                      rows={3}
                      placeholder="Brief evaluation impression summary..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm hover:shadow"
                  >
                    Save Mental State Exam
                  </button>
                </form>
              </div>

              {/* MSE comparative list */}
              {mseLogs.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Historical MSE logs (Comparative Trail)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mseLogs.map((log, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-2 text-xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400">Date: {new Date(log.created_at).toLocaleDateString()}</span>
                            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                              log.risk_level === 'severe' || log.risk_level === 'high' 
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300' 
                                : 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                            }`}>
                              Risk: {log.risk_level}
                            </span>
                          </div>
                          <p><strong>Appearance:</strong> {log.appearance}</p>
                          <p><strong>Speech:</strong> {log.speech}</p>
                          <p><strong>Mood/Affect:</strong> {log.mood_affect}</p>
                          <p><strong>Thought Process:</strong> {log.thought_process}</p>
                          <p><strong>Clinical Impression:</strong> <span className="italic">{log.clinical_impression}</span></p>
                          <p className="text-[10px] text-slate-400">Log written by: Dr. {log.provider_name}</p>
                        </div>
                        <a
                          href={api.clinical.getMSEPrintUrl(log.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-[11px] transition mt-3 cursor-pointer text-center w-full"
                        >
                          <Printer size={12} />
                          Print / Save PDF Report
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3B: CHILD CASE HISTORY */}
          {activeSection === 'child-case-history' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Child Case History Record Form</h3>
                  <p className="text-xs text-slate-500 mt-1">Audit child developmental milestones and family sociodemographics</p>
                </div>

                <form onSubmit={handleSaveCCH} className="space-y-6">
                  {/* 1. Sociodemographic Details */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">1. Sociodemographic Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Child Name</label>
                        <input
                          type="text"
                          value={cchSociodemographics.name}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Child's full name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Sex</label>
                        <select
                          value={cchSociodemographics.sex}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, sex: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Age</label>
                        <input
                          type="text"
                          value={cchSociodemographics.age}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, age: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Age (e.g. 8 years)"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mother Tongue</label>
                        <input
                          type="text"
                          value={cchSociodemographics.motherTongue}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, motherTongue: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Language spoken at home"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Education</label>
                        <input
                          type="text"
                          value={cchSociodemographics.education}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, education: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Grade / School level"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Religion</label>
                        <input
                          type="text"
                          value={cchSociodemographics.religion}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, religion: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Religion"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Residence Type</label>
                        <select
                          value={cchSociodemographics.residence}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, residence: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Urban</option>
                          <option>Rural</option>
                          <option>Semi-urban</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Family Type & Size</label>
                        <input
                          type="text"
                          value={cchSociodemographics.familyTypeSize}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, familyTypeSize: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="e.g. Joint family, 5 members"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Family Monthly Income</label>
                        <input
                          type="text"
                          value={cchSociodemographics.familyIncome}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, familyIncome: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Monthly income in INR"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
                        <input
                          type="text"
                          value={cchSociodemographics.address}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, address: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Residential address"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Occupation & Marital Status of Parents (if relevant)</label>
                        <input
                          type="text"
                          value={cchSociodemographics.occupationMarital}
                          onChange={(e) => setCchSociodemographics({ ...cchSociodemographics, occupationMarital: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Parent occupational details..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Presenting Complaints & HOPI */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">2. Presenting Complaints & HOPI</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Presenting Complaints</label>
                        <textarea
                          value={cchComplaints}
                          onChange={(e) => setCchComplaints(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          rows={3}
                          placeholder="Primary behavior or clinical concerns reported..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">History of Presenting Illness (HOPI)</label>
                        <textarea
                          value={cchHopi}
                          onChange={(e) => setCchHopi(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          rows={3}
                          placeholder="Precipitating factors, onset, course, and progress..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Treatment and Past History */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">3. Treatment & Past Illnesses</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Treatment History</label>
                        <textarea
                          value={cchTreatmentHistory}
                          onChange={(e) => setCchTreatmentHistory(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          rows={3}
                          placeholder="Past therapies, medical prescriptions, or clinical treatments..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Past History of Illness (Medical & Psychiatric)</label>
                        <textarea
                          value={cchPastHistory}
                          onChange={(e) => setCchPastHistory(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          rows={3}
                          placeholder="Past childhood diseases, hospitalization records..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Family History */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">4. Family History & tree</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Father's Age & Status</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={cchFamilyHistory.fatherAge}
                            onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, fatherAge: e.target.value })}
                            className="w-2/3 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                            placeholder="Age"
                          />
                          <select
                            value={cchFamilyHistory.fatherStatus}
                            onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, fatherStatus: e.target.value })}
                            className="w-1/3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          >
                            <option>Living</option>
                            <option>Deceased</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Father's Education / Occ</label>
                        <input
                          type="text"
                          value={cchFamilyHistory.fatherEducation}
                          onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, fatherEducation: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Education & Job"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Father's Relationship with Patient</label>
                        <input
                          type="text"
                          value={cchFamilyHistory.fatherRelationship}
                          onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, fatherRelationship: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="e.g. Caring, Strict, Distant"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mother's Age & Status</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={cchFamilyHistory.motherAge}
                            onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, motherAge: e.target.value })}
                            className="w-2/3 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                            placeholder="Age"
                          />
                          <select
                            value={cchFamilyHistory.motherStatus}
                            onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, motherStatus: e.target.value })}
                            className="w-1/3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          >
                            <option>Living</option>
                            <option>Deceased</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mother's Education / Occ</label>
                        <input
                          type="text"
                          value={cchFamilyHistory.motherEducation}
                          onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, motherEducation: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Education & Job"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mother's Relationship with Patient</label>
                        <input
                          type="text"
                          value={cchFamilyHistory.motherRelationship}
                          onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, motherRelationship: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="e.g. Supportive, Overprotective"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Family Tree structure / Notes</label>
                        <textarea
                          value={cchFamilyHistory.familyTree}
                          onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, familyTree: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          rows={2}
                          placeholder="Structure of immediate/extended family, parentage order..."
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Family History of Psychiatric illness/dependency/epilepsy</label>
                        <input
                          type="text"
                          value={cchFamilyHistory.psychiatricHistory}
                          onChange={(e) => setCchFamilyHistory({ ...cchFamilyHistory, psychiatricHistory: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Notes about any generational medical/psychiatric triggers..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Personal History */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">5. Personal History (Birth & Development)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Type of Birth</label>
                        <select
                          value={cchPersonalHistory.birthType}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, birthType: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Normal (Vaginal)</option>
                          <option>Caesarean (C-section)</option>
                          <option>Forceps / Assisted</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Birth Cry</label>
                        <select
                          value={cchPersonalHistory.birthCry}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, birthCry: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                        >
                          <option>Immediate</option>
                          <option>Delayed (Blue baby, asphyxia)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Birth Complications</label>
                        <input
                          type="text"
                          value={cchPersonalHistory.birthComplication}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, birthComplication: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="e.g. Cord wrap, low weight"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Significant Prenatal Factors</label>
                        <input
                          type="text"
                          value={cchPersonalHistory.prenatalFactors}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, prenatalFactors: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Mother illness during pregnancy..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Significant Perinatal Factors</label>
                        <input
                          type="text"
                          value={cchPersonalHistory.perinatalFactors}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, perinatalFactors: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Incubator stay, jaundice..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Developmental Milestones</label>
                        <input
                          type="text"
                          value={cchPersonalHistory.milestones}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, milestones: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Walked at 1 yr, talked at..."
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Relationship of Parents with Children & Play Behaviour</label>
                        <textarea
                          value={cchPersonalHistory.parentsRelationship}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, parentsRelationship: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          rows={2}
                          placeholder="Shared activities, family stress triggers, play style with peers..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Academic History */}
                  <div>
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">6. Academic History</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Age of School Admission</label>
                        <input
                          type="text"
                          value={cchPersonalHistory.schoolAdmissionAge}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, schoolAdmissionAge: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Admission age (e.g. 4 years)"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Highest Grade Completed</label>
                        <input
                          type="text"
                          value={cchPersonalHistory.highestGrade}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, highestGrade: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="Grade levels"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Academic Performance</label>
                        <input
                          type="text"
                          value={cchPersonalHistory.academicPerformance}
                          onChange={(e) => setCchPersonalHistory({ ...cchPersonalHistory, academicPerformance: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950"
                          placeholder="e.g. Above average, failing grades"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-sm hover:shadow"
                  >
                    Save Child Case History
                  </button>
                </form>
              </div>

              {/* Historical CCH Logs comparative list */}
              {cchLogs.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Historical Child Case History Logs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cchLogs.map((log, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-2 text-xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                            <span className="font-bold text-blue-600 dark:text-blue-400">Date: {new Date(log.created_at).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[9px] uppercase font-black">
                              ID: CCH-{log.id}
                            </span>
                          </div>
                          <p><strong>Child Name:</strong> {log.sociodemographics?.name || 'N/A'}</p>
                          <p><strong>Age / Gender:</strong> {log.sociodemographics?.age || 'N/A'} / {log.sociodemographics?.sex || 'N/A'}</p>
                          <p><strong>Presenting Complaints:</strong> <span className="italic">{log.presenting_complaints || 'None'}</span></p>
                          <p className="text-[10px] text-slate-400">Log written by: Dr. {log.provider_name}</p>
                        </div>
                        <a
                          href={api.clinical.getChildCaseHistoryPrintUrl(log.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-[11px] transition mt-3 cursor-pointer text-center w-full"
                        >
                          <Printer size={12} />
                          Print / Save PDF Report
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: AI CLINICAL ASSIST */}
          {activeSection === 'ai-helper' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">AI Clinical Helper (Assistive Only)</h3>
                <p className="text-xs text-slate-500 mt-1">Assistive diagnostic suggestions, risk scans, and treatment planning</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={handleAIRiskScan}
                  disabled={aiLoading}
                  className="flex items-center justify-center gap-2 p-3 border border-red-200 dark:border-red-900/60 bg-red-50/20 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs transition hover:bg-red-50 hover:text-red-700 cursor-pointer disabled:opacity-50"
                >
                  <ShieldAlert size={16} /> Run Suicide Risk Scan
                </button>
                <button
                  onClick={handleAIGenerateSOAP}
                  disabled={aiLoading}
                  className="flex items-center justify-center gap-2 p-3 border border-blue-200 dark:border-blue-900/60 bg-blue-50/20 text-blue-600 dark:text-blue-400 font-bold rounded-xl text-xs transition hover:bg-blue-50 hover:text-blue-700 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={16} /> Generate SOAP Draft
                </button>
                <button
                  onClick={handleAISuggestDiagnoses}
                  disabled={aiLoading}
                  className="flex items-center justify-center gap-2 p-3 border border-purple-200 dark:border-purple-900/60 bg-purple-50/20 text-purple-600 dark:text-purple-400 font-bold rounded-xl text-xs transition hover:bg-purple-50 hover:text-purple-700 cursor-pointer disabled:opacity-50"
                >
                  <ClipboardList size={16} /> ICD-11 / DSM-5 Mappings
                </button>
              </div>

              {aiLoading && <div className="text-center py-4 text-xs font-bold text-slate-500">AI Assistant Processing...</div>}

              {/* Diagnosis Suggestions Results */}
              {aiSuggestions && (
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 space-y-3 animate-fade-in-up">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wide">Symptom-Diagnosis Matches</h4>
                  <div className="space-y-2">
                    {aiSuggestions.map((diag: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <div>
                          <span className="font-bold text-xs block text-slate-850 dark:text-white">{diag.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{diag.code}</span>
                          <div className="flex gap-1.5 mt-1.5">
                            {diag.matchingSymptoms.map((sym: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded text-[9px] font-medium font-sans">
                                {sym}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleApplyDiagnosis(diag.code, diag.name)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] cursor-pointer"
                        >
                          Apply Diagnosis
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
