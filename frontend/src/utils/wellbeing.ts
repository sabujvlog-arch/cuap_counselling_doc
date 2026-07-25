export interface WellbeingResult {
  score: number;
  tier: 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Critical Risk';
  colorClass: string;
  badgeClass: string;
  progressColor: string;
}

export function calculateWellbeingScore(studentData: {
  assessments?: any[];
  sessionsCount?: number;
  emergencyCount?: number;
  highSeverityCount?: number;
}): WellbeingResult {
  let score = 100;

  // Deductions for emergency cases
  if (studentData.emergencyCount) {
    score -= studentData.emergencyCount * 25;
  }

  // Deductions for high severity sessions
  if (studentData.highSeverityCount) {
    score -= studentData.highSeverityCount * 15;
  }

  // Deductions for recent assessments
  if (studentData.assessments && studentData.assessments.length > 0) {
    studentData.assessments.forEach((ass) => {
      const type = (ass.type || '').toLowerCase();
      if (type.includes('phq') || type.includes('depression')) score -= 15;
      if (type.includes('gad') || type.includes('anxiety')) score -= 15;
      if (type.includes('mse') || type.includes('suicide')) score -= 30;
    });
  }

  score = Math.max(5, Math.min(100, score));

  if (score >= 80) {
    return {
      score,
      tier: 'Low Risk',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      badgeClass:
        'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50',
      progressColor: 'bg-emerald-500',
    };
  } else if (score >= 55) {
    return {
      score,
      tier: 'Moderate Risk',
      colorClass: 'text-amber-600 dark:text-amber-400',
      badgeClass:
        'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50',
      progressColor: 'bg-amber-500',
    };
  } else if (score >= 30) {
    return {
      score,
      tier: 'High Risk',
      colorClass: 'text-orange-600 dark:text-orange-400',
      badgeClass:
        'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50',
      progressColor: 'bg-orange-500',
    };
  } else {
    return {
      score,
      tier: 'Critical Risk',
      colorClass: 'text-rose-600 dark:text-rose-400',
      badgeClass:
        'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 animate-pulse',
      progressColor: 'bg-rose-600',
    };
  }
}
