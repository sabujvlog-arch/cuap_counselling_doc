import React, { useState } from 'react';
import { api } from '@/lib/api';

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead or of hurting yourself in some way"
];

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen"
];

const OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 }
];

interface AssessmentProps {
  studentId: number;
  onSuccess: () => void;
}

export default function AssessmentModule({ studentId, onSuccess }: AssessmentProps) {
  const [activeTab, setActiveTab] = useState<'PHQ-9' | 'GAD-7'>('PHQ-9');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; interpretation: string } | null>(null);

  const questions = activeTab === 'PHQ-9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;

  const handleAnswerSelect = (qIdx: number, val: number) => {
    setAnswers(prev => ({
      ...prev,
      [`q${qIdx + 1}`]: val
    }));
  };

  const resetForm = () => {
    setAnswers({});
    setResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verify all questions are answered
    if (Object.keys(answers).length < questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.assessments.submit({
        studentId,
        type: activeTab,
        answers
      });
      setResult({
        score: res.score,
        interpretation: res.interpretation
      });
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 gap-4">
        <button
          onClick={() => { setActiveTab('PHQ-9'); resetForm(); }}
          className={`pb-2 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'PHQ-9' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          PHQ-9 (Depression Screen)
        </button>
        <button
          onClick={() => { setActiveTab('GAD-7'); resetForm(); }}
          className={`pb-2 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'GAD-7' 
              ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          GAD-7 (Anxiety Screen)
        </button>
      </div>

      {result ? (
        <div className="bg-blue-50 dark:bg-slate-850 p-6 rounded-xl text-center border border-blue-100 dark:border-slate-800 animate-fade-in-up">
          <h3 className="text-blue-900 dark:text-blue-300 font-bold text-lg mb-2">Screening Result</h3>
          <p className="text-4xl font-black text-blue-600 dark:text-blue-400 my-4">{result.score}</p>
          <div className="inline-block px-4 py-1.5 bg-blue-100 dark:bg-slate-800 text-blue-800 dark:text-blue-300 rounded-full font-semibold text-sm">
            {result.interpretation}
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed max-w-md mx-auto">
            This screening questionnaire is an initial clinical evaluation indicator. For a complete diagnosis and guidance plan, please consult with our counseling centre specialists.
          </p>
          <button
            onClick={resetForm}
            className="mt-6 px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm text-sm"
          >
            Take Another Assessment
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            <strong>Instructions:</strong> Over the last 2 weeks, how often have you been bothered by any of the following problems? Select the option that matches best.
          </div>

          <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2">
            {questions.map((q, qIdx) => (
              <div key={qIdx} className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {qIdx + 1}. {q}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {OPTIONS.map(opt => {
                    const isSelected = answers[`q${qIdx + 1}`] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleAnswerSelect(qIdx, opt.value)}
                        className={`py-2 px-3 border rounded-lg text-xs font-semibold transition text-center cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? "Submitting..." : "Submit Screening Survey"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
