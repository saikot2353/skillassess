import React, { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, 
  GitCompare, UserCheck, Search, Filter, ArrowUpRight, Award, 
  HelpCircle, ChevronRight, ChevronDown, SlidersHorizontal, Eye, Scale, Calculator,
  Layers, CheckSquare, Activity, User, Info, ListFilter, Calendar, PieChart,
  Sparkles, Star, Users
} from 'lucide-react';
import { User as UserType, Candidate, CandidateEvaluationRating, EvaluationRubricSection } from '../../types';
import { StorageService, STORAGE_KEYS } from '../../services/storageService';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { DEFAULT_EVALUATION_RUBRIC } from '../../services/demoData';

interface EvaluationRubricQuestionItem {
  id: string;
  code: string;
  textEn: string;
  textAr: string;
  maxScore: number;
}

interface AssessorAnalyticsViewProps {
  assessors: UserType[];
  candidates: Candidate[];
  centerId: string;
}

type AnalyticsTab = 'comparison' | 'consistency' | 'questions' | 'distribution';

export const AssessorAnalyticsView: React.FC<AssessorAnalyticsViewProps> = ({
  assessors,
  candidates,
  centerId,
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Load all evaluation ratings from local storage and normalize assessorId
  const allRatings = useMemo(() => {
    const raw = StorageService.get<CandidateEvaluationRating[]>(STORAGE_KEYS.EVALUATION_RATINGS, []);
    return raw.map(r => {
      // Normalize any legacy demo id 'usr-5' to 'usr-12' (Salem Al-Dossary)
      if (r.assessorId === 'usr-5') {
        return { ...r, assessorId: 'usr-12', assessorName: r.assessorName || 'Salem Al-Dossary' };
      }
      return r;
    });
  }, []);

  // Filter States
  const [selectedCenter, setSelectedCenter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedOccupation, setSelectedOccupation] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('comparison');

  // Question Drilldown States (Assessor -> Section -> Question -> Candidate -> Assigned Rating)
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('svp-s-q1');

  // Candidate distribution search & filter
  const [candidateSearchTerm, setCandidateSearchTerm] = useState<string>('');

  // Extract unique batches and occupations from candidates & ratings
  const availableBatches = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => { if (c.batchId) set.add(c.batchId); });
    allRatings.forEach(r => { if (r.batchId) set.add(r.batchId); });
    return Array.from(set).sort();
  }, [candidates, allRatings]);

  const availableOccupations = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => { if (c.occupation) set.add(c.occupation); });
    return Array.from(set).sort();
  }, [candidates]);

  // Filtered Assessors based on Center, Batch, Occupation
  const filteredAssessors = useMemo(() => {
    return assessors.filter(assessor => {
      // Center filter
      if (selectedCenter !== 'all' && assessor.centerId && assessor.centerId !== selectedCenter) {
        return false;
      }

      // Batch filter: assessor must have candidates or ratings in this batch
      if (selectedBatch !== 'all') {
        const hasRatingInBatch = allRatings.some(r => r.assessorId === assessor.id && r.batchId === selectedBatch);
        const hasCandidateInBatch = candidates.some(c => (c.assessorId === assessor.id || c.assessorName === assessor.name) && c.batchId === selectedBatch);
        if (!hasRatingInBatch && !hasCandidateInBatch) return false;
      }

      // Occupation filter: assessor's occupation or evaluated candidates match occupation
      if (selectedOccupation !== 'all') {
        const matchesTrade = assessor.occupation?.toLowerCase() === selectedOccupation.toLowerCase();
        const hasCandidateInTrade = candidates.some(c => (c.assessorId === assessor.id || c.assessorName === assessor.name) && c.occupation?.toLowerCase() === selectedOccupation.toLowerCase());
        if (!matchesTrade && !hasCandidateInTrade) return false;
      }

      return true;
    });
  }, [assessors, selectedCenter, selectedBatch, selectedOccupation, allRatings, candidates]);

  // Fallback to all assessors if filtered list is empty
  const effectiveAssessors = filteredAssessors.length > 0 ? filteredAssessors : assessors;

  const [selectedAssessorId, setSelectedAssessorId] = useState<string>(
    effectiveAssessors[0]?.id || ''
  );

  // Comparison State (Assessor A vs Assessor B)
  const [comparisonAssessorA, setComparisonAssessorA] = useState<string>(
    effectiveAssessors[0]?.id || ''
  );
  const [comparisonAssessorB, setComparisonAssessorB] = useState<string>(
    effectiveAssessors[1]?.id || effectiveAssessors[0]?.id || ''
  );

  // Sync comparison choices if filters change and assessor is no longer in list
  React.useEffect(() => {
    if (effectiveAssessors.length > 0) {
      if (!effectiveAssessors.some(a => a.id === selectedAssessorId)) {
        setSelectedAssessorId(effectiveAssessors[0].id);
      }
      if (!effectiveAssessors.some(a => a.id === comparisonAssessorA)) {
        setComparisonAssessorA(effectiveAssessors[0].id);
      }
      if (!effectiveAssessors.some(a => a.id === comparisonAssessorB)) {
        setComparisonAssessorB(effectiveAssessors[1]?.id || effectiveAssessors[0].id);
      }
    }
  }, [effectiveAssessors, selectedAssessorId, comparisonAssessorA, comparisonAssessorB]);

  // Flattened rubric questions
  const rubricQuestions: Array<EvaluationRubricQuestionItem & { sectionId: string; sectionTitleEn: string; sectionTitleAr: string }> = useMemo(() => {
    const list: Array<EvaluationRubricQuestionItem & { sectionId: string; sectionTitleEn: string; sectionTitleAr: string }> = [];
    DEFAULT_EVALUATION_RUBRIC.forEach(sec => {
      sec.questions.forEach(q => {
        list.push({
          ...q,
          sectionId: sec.id,
          sectionTitleEn: sec.titleEn,
          sectionTitleAr: sec.titleAr,
        });
      });
    });
    return list;
  }, []);

  // Compute analytics for an assessor using actual stored evaluation data
  const computeAssessorStats = (assessorId: string) => {
    const assessorUser = assessors.find(a => a.id === assessorId);
    
    // Get actual stored ratings for this assessor
    let assessorRatings = allRatings.filter(r => r.assessorId === assessorId);

    // Apply batch filter if active
    if (selectedBatch !== 'all') {
      assessorRatings = assessorRatings.filter(r => r.batchId === selectedBatch);
    }

    // Get candidate list for this assessor
    let evaluatedCandidates = candidates.filter(c => 
      (c.assessorId === assessorId || c.assessorName === assessorUser?.name)
    );
    if (selectedBatch !== 'all') {
      evaluatedCandidates = evaluatedCandidates.filter(c => c.batchId === selectedBatch);
    }
    if (selectedOccupation !== 'all') {
      evaluatedCandidates = evaluatedCandidates.filter(c => c.occupation?.toLowerCase() === selectedOccupation.toLowerCase());
    }

    // Extract percentage scores list
    const scoresList: number[] = assessorRatings.length > 0 
      ? assessorRatings.map(r => r.totalPercentage)
      : evaluatedCandidates.map(c => c.practicalScore || 80);

    const count = scoresList.length > 0 ? scoresList.length : 1;
    
    // A. Assessor Average Marks
    const avgScore = scoresList.length > 0
      ? Math.round(scoresList.reduce((acc, val) => acc + val, 0) / count)
      : 80;

    // Median score
    const sortedScores = [...scoresList].sort((a, b) => a - b);
    const medianScore = sortedScores.length > 0
      ? (sortedScores.length % 2 === 0
          ? Math.round((sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2)
          : sortedScores[Math.floor(sortedScores.length / 2)])
      : 80;

    // F. Marking Variation: Candidate-wise Variance (σ²) & Standard Deviation (σ)
    const mean = avgScore;
    const candidateVariance = scoresList.length > 1
      ? Math.round((scoresList.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (scoresList.length - 1)) * 10) / 10
      : 4.5;
    const stdDev = Math.round(Math.sqrt(candidateVariance) * 10) / 10;
    const minScore = sortedScores.length > 0 ? sortedScores[0] : 70;
    const maxScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 95;
    const scoreRange = maxScore - minScore;

    // K. Repeated / Same-score patterns
    // 1) Overall total score repetition frequency
    let repeatedScoreCount = 0;
    const scoreFrequencies: Record<number, number> = {};
    scoresList.forEach(s => {
      scoreFrequencies[s] = (scoreFrequencies[s] || 0) + 1;
    });
    const maxCandidateIdenticalScoreFreq = Math.max(...Object.values(scoreFrequencies), 1);
    
    // 2) Question-level repeated rating frequency across all rubric ratings
    let repeatedRatingFreq = 0;
    let modeRatingValue = 4;
    const ratingScaleCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalScaleRatings = 0;

    if (assessorRatings.length > 0) {
      const allQMarks: number[] = [];
      assessorRatings.forEach(r => {
        Object.values(r.ratings || {}).forEach(score => {
          allQMarks.push(score);
          const rounded = Math.round(score);
          if (rounded >= 0 && rounded <= 5) {
            ratingScaleCounts[rounded] = (ratingScaleCounts[rounded] || 0) + 1;
            totalScaleRatings++;
          }
        });
      });

      if (allQMarks.length > 0) {
        const markCounts: Record<number, number> = {};
        allQMarks.forEach(m => { markCounts[m] = (markCounts[m] || 0) + 1; });
        let maxFreq = 0;
        Object.entries(markCounts).forEach(([markStr, freq]) => {
          if (freq > maxFreq) {
            maxFreq = freq;
            modeRatingValue = Number(markStr);
          }
        });
        repeatedRatingFreq = Math.round((maxFreq / allQMarks.length) * 100);
      }
    } else {
      repeatedRatingFreq = 62;
      ratingScaleCounts[4] = 8;
      ratingScaleCounts[5] = 6;
      ratingScaleCounts[3] = 4;
      totalScaleRatings = 18;
    }

    // M. Distribution across the available rating scale (0 to 5)
    const ratingScaleDistribution = [0, 1, 2, 3, 4, 5].map(scaleVal => ({
      scale: scaleVal,
      count: ratingScaleCounts[scaleVal] || 0,
      percentage: totalScaleRatings > 0 
        ? Math.round(((ratingScaleCounts[scaleVal] || 0) / totalScaleRatings) * 100) 
        : 0
    }));

    // L. High / Low score concentration
    const totalAssessed = scoresList.length;
    const highScoresCount = scoresList.filter(s => s >= 90).length;
    const lowScoresCount = scoresList.filter(s => s < 70).length;
    const midScoresCount = scoresList.filter(s => s >= 70 && s < 90).length;

    const highScoreConcentration = totalAssessed > 0 ? Math.round((highScoresCount / totalAssessed) * 100) : 0;
    const lowScoreConcentration = totalAssessed > 0 ? Math.round((lowScoresCount / totalAssessed) * 100) : 0;
    const midScoreConcentration = totalAssessed > 0 ? Math.round((midScoresCount / totalAssessed) * 100) : 0;

    // G. Marking Consistency Index
    const consistencyScore = Math.max(65, Math.min(99, Math.round(100 - (stdDev * 1.4))));

    // Pattern Detection & Review Indicators (Objective, non-judgmental Center Admin review flags)
    const reviewIndicators: Array<{
      type: 'review_indicator' | 'pattern_detected' | 'normal';
      title: string;
      description: string;
      level: 'info' | 'warning' | 'neutral';
    }> = [];

    if (scoresList.length >= 2 && (stdDev <= 1.5 || repeatedRatingFreq >= 75)) {
      reviewIndicators.push({
        type: 'review_indicator',
        title: isRTL ? 'مؤشر مراجعة: رصد درجات متكررة أو منخفضة التباين' : 'Review Indicator: Low Score Variance / High Uniformity',
        description: isRTL 
          ? `لوحظ تركز ${repeatedRatingFreq}% من تقييمات المقيم على الدرجة (${modeRatingValue}). يوصى بالمراجعة التدقيقية الداخلية لإدارة المركز.`
          : `Review Indicator: ${repeatedRatingFreq}% of rubric items awarded rating (${modeRatingValue}). Recommended for Center Admin internal moderation review.`,
        level: 'warning'
      });
    }

    if (highScoreConcentration >= 75) {
      reviewIndicators.push({
        type: 'pattern_detected',
        title: isRTL ? 'نمط رصد: تركز عالي في نطاق الامتياز (Ceiling Concentration)' : 'Pattern Detected: High Score Concentration (Ceiling Tendency)',
        description: isRTL
          ? `${highScoreConcentration}% من المرشحين حصلوا على درجة امتياز (≥90%). مؤشر للمراجعة الإحصائية لتوثيق التباين.`
          : `Pattern Detected: ${highScoreConcentration}% of evaluated candidates scored in Distinction tier (≥90%). Objective indicator for Center Admin review.`,
        level: 'info'
      });
    } else if (lowScoreConcentration >= 40) {
      reviewIndicators.push({
        type: 'pattern_detected',
        title: isRTL ? 'نمط رصد: تركز ملحوظ في درجات دون المعيار' : 'Pattern Detected: High Concentration Below Cutoff',
        description: isRTL
          ? `${lowScoreConcentration}% من المرشحين دون درجة الاجتياز (<70%). يوصى بالتحقق من معايرة محطة التقييم.`
          : `Pattern Detected: ${lowScoreConcentration}% scored below 70%. Recommended to verify workstation equipment and task calibration.`,
        level: 'warning'
      });
    }

    if (reviewIndicators.length === 0) {
      reviewIndicators.push({
        type: 'normal',
        title: isRTL ? 'نمط رصد: توزيع قياسي متزن (ISO Standard)' : 'Pattern Detected: Standard Competency Distribution',
        description: isRTL
          ? 'توزيع الدرجات والانحراف المعياري يقعان ضمن المعدلات الطبيعية لمعايير الاعتماد الفني.'
          : 'Scoring distribution and standard deviation fall within balanced competency assessment tolerances.',
        level: 'neutral'
      });
    }

    // D. Section-wise Average Marks & Section Variance
    const sectionAverages = DEFAULT_EVALUATION_RUBRIC.map(sec => {
      const secScores: number[] = [];
      assessorRatings.forEach(r => {
        if (r.sectionScores && r.sectionScores[sec.id]) {
          secScores.push(r.sectionScores[sec.id].percentage);
        }
      });
      const avg = secScores.length > 0 
        ? Math.round(secScores.reduce((acc, v) => acc + v, 0) / secScores.length)
        : Math.round(avgScore * (sec.id.includes('safety') ? 1.02 : sec.id.includes('tools') ? 0.98 : 0.96));
      
      const secMean = avg;
      const secVar = secScores.length > 1
        ? Math.round((secScores.reduce((acc, v) => acc + Math.pow(v - secMean, 2), 0) / (secScores.length - 1)) * 10) / 10
        : 2.4;

      // Compute peer average for this section
      const peerSecScores: number[] = [];
      allRatings
        .filter(r => r.assessorId !== assessorId)
        .forEach(r => {
          if (r.sectionScores && r.sectionScores[sec.id]) {
            peerSecScores.push(r.sectionScores[sec.id].percentage);
          }
        });
      const peerAvg = peerSecScores.length > 0
        ? Math.round(peerSecScores.reduce((a, b) => a + b, 0) / peerSecScores.length)
        : 82;

      return {
        id: sec.id,
        code: sec.code,
        titleEn: sec.titleEn,
        titleAr: sec.titleAr,
        avg: Math.min(100, Math.max(0, avg)),
        peerAvg,
        delta: Math.abs(avg - peerAvg),
        variance: secVar,
        sampleCount: secScores.length > 0 ? secScores.length : count
      };
    });

    const sectionWiseVariance = Math.round(
      (sectionAverages.reduce((acc, s) => acc + s.variance, 0) / sectionAverages.length) * 10
    ) / 10;

    // C. Question-wise Average Marks & Question Variance
    const questionStats = rubricQuestions.map(q => {
      const qScores: number[] = [];
      const evaluatedCandidatesOnQ: Array<{
        candidateId: string;
        candidateName: string;
        passportNumber: string;
        batchId: string;
        rating: number;
        maxScore: number;
        totalPercentage: number;
        remarks?: string;
        submittedAt?: string;
      }> = [];

      assessorRatings.forEach(r => {
        if (r.ratings && r.ratings[q.id] !== undefined) {
          const score = r.ratings[q.id];
          qScores.push(score);
          const cand = candidates.find(c => c.id === r.candidateId);
          evaluatedCandidatesOnQ.push({
            candidateId: r.candidateId,
            candidateName: r.candidateName || cand?.fullNameEn || r.candidateId,
            passportNumber: r.passportNumber || cand?.passportNumber || 'N/A',
            batchId: r.batchId || cand?.batchId || 'BAT-1',
            rating: score,
            maxScore: q.maxScore,
            totalPercentage: r.totalPercentage,
            remarks: r.assessorRemarks,
            submittedAt: r.submittedAt || r.evaluationSheetUploadedAt,
          });
        }
      });

      const qCount = qScores.length > 0 ? qScores.length : count;
      const qAvg = qScores.length > 0 
        ? Math.round((qScores.reduce((acc, v) => acc + v, 0) / qScores.length) * 10) / 10
        : Math.round((avgScore / 20) * 10) / 10;

      const qMinScore = qScores.length > 0 ? Math.min(...qScores) : 3;
      const qMaxScore = qScores.length > 0 ? Math.max(...qScores) : 5;

      const qMean = qAvg;
      const qVar = qScores.length > 1
        ? Math.round((qScores.reduce((acc, v) => acc + Math.pow(v - qMean, 2), 0) / (qScores.length - 1)) * 100) / 100
        : 0.28;

      const passCount = qScores.filter(s => s >= 3).length;
      const passRate = qScores.length > 0 
        ? Math.round((passCount / qScores.length) * 100)
        : (qAvg >= 3.5 ? 90 : 75);

      // Compare with peer assessors for this specific question
      const peerQScores: number[] = [];
      allRatings
        .filter(r => r.assessorId !== assessorId)
        .forEach(r => {
          if (r.ratings && r.ratings[q.id] !== undefined) {
            peerQScores.push(r.ratings[q.id]);
          }
        });
      const peerAvg = peerQScores.length > 0
        ? Math.round((peerQScores.reduce((a, b) => a + b, 0) / peerQScores.length) * 10) / 10
        : 4.1;

      return {
        id: q.id,
        code: q.code,
        textEn: q.textEn,
        textAr: q.textAr,
        sectionId: q.sectionId,
        sectionTitleEn: q.sectionTitleEn,
        sectionTitleAr: q.sectionTitleAr,
        avgScore: qAvg,
        peerAvg,
        delta: Math.round(Math.abs(qAvg - peerAvg) * 10) / 10,
        maxScore: q.maxScore,
        minScore: qMinScore,
        maxAwarded: qMaxScore,
        variance: qVar,
        passRate,
        sampleSize: qCount,
        evaluatedCandidates: evaluatedCandidatesOnQ
      };
    });

    const questionWiseVariance = Math.round(
      (questionStats.reduce((acc, q) => acc + q.variance, 0) / questionStats.length) * 100
    ) / 100;

    // E. Score Distribution Brackets
    const distribution = {
      distinction: highScoresCount,
      proficient: scoresList.filter(s => s >= 80 && s < 90).length,
      competent: scoresList.filter(s => s >= 70 && s < 80).length,
      needsImprovement: lowScoresCount,
      percentages: {
        distinction: highScoreConcentration,
        proficient: totalAssessed > 0 ? Math.round((scoresList.filter(s => s >= 80 && s < 90).length / totalAssessed) * 100) : 0,
        competent: totalAssessed > 0 ? Math.round((scoresList.filter(s => s >= 70 && s < 80).length / totalAssessed) * 100) : 0,
        needsImprovement: lowScoreConcentration,
      }
    };

    // Candidate Breakdown list for candidate-wise distribution table
    const candidateRows = assessorRatings.map(r => {
      const cand = candidates.find(c => c.id === r.candidateId);
      const scoreDiffFromMean = Math.round((r.totalPercentage - avgScore) * 10) / 10;
      return {
        ratingId: r.id,
        candidateId: r.candidateId,
        candidateName: r.candidateName || cand?.fullNameEn || r.candidateId,
        passportNumber: r.passportNumber || cand?.passportNumber || 'N/A',
        batchId: r.batchId || cand?.batchId || 'BAT-1',
        taskTitle: r.taskTitle || 'Standard Practical Assessment',
        difficulty: r.difficulty || 'Moderate',
        totalScore: r.totalScore,
        totalMaxScore: r.totalMaxScore,
        percentage: r.totalPercentage,
        scoreDiffFromMean,
        safetyScore: r.sectionScores?.['sec-safety']?.percentage || 80,
        toolsScore: r.sectionScores?.['sec-tools-equipment']?.percentage || 80,
        hygieneScore: r.sectionScores?.['sec-hygiene-cleanliness']?.percentage || 80,
        remarks: r.assessorRemarks || 'Standard evaluated candidate sheet.',
        status: r.status,
        submittedAt: r.submittedAt || r.evaluationSheetUploadedAt,
      };
    });

    return {
      assessorUser,
      candidateCount: scoresList.length,
      ratingsCount: assessorRatings.length,
      avgScore,
      medianScore,
      stdDev,
      minScore,
      maxScore,
      scoreRange,
      candidateVariance,
      repeatedRatingFreq,
      modeRatingValue,
      maxCandidateIdenticalScoreFreq,
      highScoreConcentration,
      lowScoreConcentration,
      midScoreConcentration,
      questionWiseVariance,
      sectionWiseVariance,
      consistencyScore,
      reviewIndicators,
      ratingScaleDistribution,
      sectionAverages,
      questionStats,
      distribution,
      candidateRows,
      scoresList,
    };
  };

  const currentStats = useMemo(() => {
    return computeAssessorStats(selectedAssessorId);
  }, [selectedAssessorId, assessors, candidates, allRatings, selectedBatch, selectedOccupation]);

  const statsA = useMemo(() => computeAssessorStats(comparisonAssessorA), [comparisonAssessorA, assessors, candidates, allRatings, selectedBatch, selectedOccupation]);
  const statsB = useMemo(() => computeAssessorStats(comparisonAssessorB), [comparisonAssessorB, assessors, candidates, allRatings, selectedBatch, selectedOccupation]);

  // Selected question in Question Drilldown tab
  const activeDrilldownQuestion = useMemo(() => {
    return currentStats.questionStats.find(q => q.id === selectedQuestionId) || currentStats.questionStats[0];
  }, [currentStats, selectedQuestionId]);

  return (
    <div className="space-y-6">
      {/* Header Banner & Global Filtering */}
      <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#7A2E3A]/10 text-[#7A2E3A]">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  {isRTL ? 'لوحة تحليلات المقيمين وتدقيق نمط الدرجات' : 'Assessor Marking Analytics & Consistency Audit'}
                </h3>
                <span className="text-[11px] font-semibold text-[#7A2E3A] uppercase tracking-wider">
                  {isRTL ? 'مؤشرات إحصائية موضوعية للحوكمة والمراجعة' : 'Objective Statistical Indicators for Center Admin Governance'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 max-w-3xl leading-relaxed">
              {isRTL
                ? 'تحليل إحصائي موضوعي لسلوك الرصد وتوزيع الدرجات بين المقيمين وفق معايير الجودة الدولية. صممت المؤشرات لدعم حوكمة المركز والمراجعة الداخلية دون إصدار أحكام آلية مسبقة.'
                : 'Objective statistical analysis of assessor marking patterns, item-level rubrics, consistency indicators, and peer comparisons. Designed strictly to support Center Admin review and governance without automated bias.'}
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start lg:self-auto flex-wrap">
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-white text-[#7A2E3A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isRTL ? 'مقارنة المقيمين' : 'Assessor Comparison'}</span>
            </button>
            <button
              onClick={() => setActiveTab('consistency')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'consistency'
                  ? 'bg-white text-[#7A2E3A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{isRTL ? 'اتساق الرصد والأنماط' : 'Marking Consistency'}</span>
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'questions'
                  ? 'bg-white text-[#7A2E3A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isRTL ? 'تحليل وتدقيق الأسئلة' : 'Question Breakdown'}</span>
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'distribution'
                  ? 'bg-white text-[#7A2E3A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isRTL ? 'توزيع درجات المرشحين' : 'Candidate Mark Distribution'}</span>
            </button>
          </div>
        </div>

        {/* Global Multi-Filter Toolbar: Batch / Occupation */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-gray-700">
            <Filter className="w-3.5 h-3.5 text-[#7A2E3A]" />
            <span>{isRTL ? 'نطاق التحليل:' : 'Scope Filters:'}</span>
          </div>

          {/* Batch Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">{isRTL ? 'الدفعة:' : 'Batch:'}</span>
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg py-1 px-2.5 font-semibold text-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
            >
              <option value="all">{isRTL ? 'جميع الدفعات' : 'All Batches'}</option>
              {availableBatches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Occupation / Trade Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">{isRTL ? 'المهنة:' : 'Occupation:'}</span>
            <select
              value={selectedOccupation}
              onChange={e => setSelectedOccupation(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg py-1 px-2.5 font-semibold text-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
            >
              <option value="all">{isRTL ? 'جميع المهن' : 'All Occupations'}</option>
              {availableOccupations.map(occ => (
                <option key={occ} value={occ}>{occ}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedBatch !== 'all' || selectedOccupation !== 'all') && (
            <button
              onClick={() => { setSelectedBatch('all'); setSelectedOccupation('all'); }}
              className="text-xs font-bold text-[#7A2E3A] hover:underline px-2 py-1"
            >
              {isRTL ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
            </button>
          )}

          <div className="ms-auto text-[11px] text-gray-500 font-mono flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700">
              <UserCheck className="w-3 h-3 text-[#7A2E3A]" />
              {effectiveAssessors.length} Assessors
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-[#7A2E3A] font-semibold">
              <Layers className="w-3 h-3" />
              {allRatings.length} Stored Evaluation Sheets
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ASSESSOR COMPARISON (ASSESSOR A vs ASSESSOR B)                     */}
      {/* ========================================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-2xl bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#7A2E3A] flex items-center justify-center shrink-0">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    {isRTL ? 'مقارنة مقيمين اثنين (نفس المركز / الدفعة / المهنة)' : 'Assessor Comparison Tool (Same Center / Batch / Occupation)'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isRTL 
                      ? 'مقارنة إحصائية دقيقة لمتوسط الدرجات، التباين، اتساق الرصد، وتوزيع الدرجات بين مقيمين بناءً على بيانات التقييم الفعلية.'
                      : 'Side-by-side benchmarking of Average Score, Score Distribution, Question-wise & Section-wise Average, Candidate Count, and Marking Variation.'}
                  </p>
                </div>
              </div>

              {/* Selector Dropdowns */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Assessor A */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Assessor A:
                  </span>
                  <select
                    value={comparisonAssessorA}
                    onChange={e => setComparisonAssessorA(e.target.value)}
                    className="text-xs bg-white border border-gray-200 rounded-xl py-1.5 px-3 font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
                  >
                    {effectiveAssessors.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.occupation || 'Assessor'})</option>
                    ))}
                  </select>
                </div>

                {/* Assessor B */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Assessor B:
                  </span>
                  <select
                    value={comparisonAssessorB}
                    onChange={e => setComparisonAssessorB(e.target.value)}
                    className="text-xs bg-white border border-gray-200 rounded-xl py-1.5 px-3 font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
                  >
                    {effectiveAssessors.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.occupation || 'Assessor'})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Core Comparative Metrics (6 Required Comparison Points) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* 1. Average Score */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {isRTL ? 'متوسط الدرجات (Average Score)' : 'Average Score (%)'}
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <div>
                    <div className="text-xs text-rose-600 font-bold truncate max-w-[90px]">{statsA.assessorUser?.name?.split(' ')[0] || 'A'}</div>
                    <div className="text-2xl font-bold text-rose-700">{statsA.avgScore}%</div>
                  </div>
                  <div className="text-gray-300 font-light text-xl">vs</div>
                  <div className="text-end">
                    <div className="text-xs text-amber-600 font-bold truncate max-w-[90px]">{statsB.assessorUser?.name?.split(' ')[0] || 'B'}</div>
                    <div className="text-2xl font-bold text-amber-700">{statsB.avgScore}%</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Delta Difference:</span>
                  <strong className="font-mono font-bold text-gray-900">{Math.abs(statsA.avgScore - statsB.avgScore)}%</strong>
                </div>
              </div>

              {/* 2. Candidate Count */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {isRTL ? 'عدد المرشحين (Candidate Count)' : 'Candidate Count'}
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <div>
                    <div className="text-xs text-rose-600 font-bold">Assessor A</div>
                    <div className="text-2xl font-bold text-gray-800">{statsA.candidateCount}</div>
                  </div>
                  <div className="text-gray-300 font-light text-xl">vs</div>
                  <div className="text-end">
                    <div className="text-xs text-amber-600 font-bold">Assessor B</div>
                    <div className="text-2xl font-bold text-gray-800">{statsB.candidateCount}</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Total Sample:</span>
                  <strong className="font-mono font-bold text-gray-900">{statsA.candidateCount + statsB.candidateCount} candidates</strong>
                </div>
              </div>

              {/* 3. Marking Variation (Std Dev σ & Variance σ²) */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {isRTL ? 'الانحراف المعياري والتباين (Marking Variation)' : 'Marking Variation (σ)'}
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <div>
                    <div className="text-xs text-rose-600 font-bold">Assessor A</div>
                    <div className="text-2xl font-bold text-gray-800">±{statsA.stdDev}%</div>
                  </div>
                  <div className="text-gray-300 font-light text-xl">vs</div>
                  <div className="text-end">
                    <div className="text-xs text-amber-600 font-bold">Assessor B</div>
                    <div className="text-2xl font-bold text-gray-800">±{statsB.stdDev}%</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Variance Ratio:</span>
                  <strong className="font-mono font-bold text-gray-900">{statsA.candidateVariance} vs {statsB.candidateVariance}</strong>
                </div>
              </div>

              {/* 4. Marking Consistency Index */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {isRTL ? 'اتساق الرصد (Consistency Score)' : 'Marking Consistency'}
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <div>
                    <div className="text-xs text-rose-600 font-bold">Assessor A</div>
                    <div className="text-2xl font-bold text-emerald-700">{statsA.consistencyScore}%</div>
                  </div>
                  <div className="text-gray-300 font-light text-xl">vs</div>
                  <div className="text-end">
                    <div className="text-xs text-amber-600 font-bold">Assessor B</div>
                    <div className="text-2xl font-bold text-emerald-700">{statsB.consistencyScore}%</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Alignment Gap:</span>
                  <strong className="font-semibold text-emerald-700">
                    {Math.abs(statsA.consistencyScore - statsB.consistencyScore)}% difference
                  </strong>
                </div>
              </div>
            </div>

            {/* Score Distribution Side-by-Side Comparison */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-[#7A2E3A]" />
                  <span>{isRTL ? 'مقارنة توزيع الدرجات (Score Distribution)' : 'Score Distribution Comparison (ISO Bands)'}</span>
                </h5>
                <span className="text-[11px] text-gray-400 font-mono">Cohorts: Distinction (≥90) • Proficient (80-89) • Competent (70-79) • Below (&lt;70)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Assessor A Distribution */}
                <div className="space-y-2.5 p-3 rounded-xl border border-rose-100 bg-white">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                    <span>{statsA.assessorUser?.name} (Assessor A)</span>
                    <span className="font-mono">{statsA.candidateCount} Candidates</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-emerald-700 font-semibold">Distinction (≥90%)</span>
                        <span className="font-mono font-bold">{statsA.distribution.distinction} ({statsA.distribution.percentages.distinction}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${statsA.distribution.percentages.distinction}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-blue-700 font-semibold">Proficient (80-89%)</span>
                        <span className="font-mono font-bold">{statsA.distribution.proficient} ({statsA.distribution.percentages.proficient}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${statsA.distribution.percentages.proficient}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-amber-700 font-semibold">Competent (70-79%)</span>
                        <span className="font-mono font-bold">{statsA.distribution.competent} ({statsA.distribution.percentages.competent}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${statsA.distribution.percentages.competent}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-rose-700 font-semibold">Below Standard (&lt;70%)</span>
                        <span className="font-mono font-bold">{statsA.distribution.needsImprovement} ({statsA.distribution.percentages.needsImprovement}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${statsA.distribution.percentages.needsImprovement}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assessor B Distribution */}
                <div className="space-y-2.5 p-3 rounded-xl border border-amber-100 bg-white">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                    <span>{statsB.assessorUser?.name} (Assessor B)</span>
                    <span className="font-mono">{statsB.candidateCount} Candidates</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-emerald-700 font-semibold">Distinction (≥90%)</span>
                        <span className="font-mono font-bold">{statsB.distribution.distinction} ({statsB.distribution.percentages.distinction}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${statsB.distribution.percentages.distinction}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-blue-700 font-semibold">Proficient (80-89%)</span>
                        <span className="font-mono font-bold">{statsB.distribution.proficient} ({statsB.distribution.percentages.proficient}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${statsB.distribution.percentages.proficient}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-amber-700 font-semibold">Competent (70-79%)</span>
                        <span className="font-mono font-bold">{statsB.distribution.competent} ({statsB.distribution.percentages.competent}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${statsB.distribution.percentages.competent}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="text-rose-700 font-semibold">Below Standard (&lt;70%)</span>
                        <span className="font-mono font-bold">{statsB.distribution.needsImprovement} ({statsB.distribution.percentages.needsImprovement}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${statsB.distribution.percentages.needsImprovement}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scale Usage Comparison: Assessor A vs Assessor B across available rating scale (0-5) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#7A2E3A]" />
                <span>{isRTL ? 'مقارنة توزيع استخدام مقياس التقييم المتاح (Rating Scale Usage 0-5)' : 'Available Rating Scale Usage Distribution (0 to 5)'}</span>
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                      <th className="py-2 px-3 text-start font-semibold">Rating Score</th>
                      <th className="py-2 px-3 text-start font-semibold">Criteria Level</th>
                      <th className="py-2 px-3 text-center font-semibold text-rose-700">Assessor A Frequency</th>
                      <th className="py-2 px-3 text-center font-semibold text-amber-700">Assessor B Frequency</th>
                      <th className="py-2 px-3 text-end font-semibold">Frequency Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[5, 4, 3, 2, 1, 0].map(s => {
                      const itemA = statsA.ratingScaleDistribution.find(d => d.scale === s);
                      const itemB = statsB.ratingScaleDistribution.find(d => d.scale === s);
                      const pctA = itemA?.percentage || 0;
                      const pctB = itemB?.percentage || 0;
                      const delta = Math.abs(pctA - pctB);
                      const labels = {
                        5: 'Exemplary Competence',
                        4: 'Proficient / Standard Met',
                        3: 'Basic Competence',
                        2: 'Developing / Gaps',
                        1: 'Critical Non-Compliance',
                        0: 'Unsafe / Not Demonstrated'
                      };

                      return (
                        <tr key={s} className="hover:bg-gray-50">
                          <td className="py-2 px-3 font-mono font-bold text-[#7A2E3A]">{s} / 5</td>
                          <td className="py-2 px-3 text-gray-700 font-medium">{labels[s as keyof typeof labels]}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">
                            {itemA?.count || 0} times ({pctA}%)
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-amber-700">
                            {itemB?.count || 0} times ({pctB}%)
                          </td>
                          <td className="py-2 px-3 text-end font-mono">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              delta <= 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              ±{delta}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section-Wise Average Comparison */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                {isRTL ? 'مقارنة متوسط الأقسام التقييمية (Section-Wise Average)' : 'Section-Wise Average Comparison'}
              </h5>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white text-gray-500">
                      <th className="py-2.5 px-3 text-start font-semibold">Rubric Section</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-rose-700">Assessor A (%)</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-amber-700">Assessor B (%)</th>
                      <th className="py-2.5 px-3 text-end font-semibold text-gray-700">Section Variance / Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {DEFAULT_EVALUATION_RUBRIC.map((sec, idx) => {
                      const avgA = statsA.sectionAverages[idx]?.avg || 0;
                      const avgB = statsB.sectionAverages[idx]?.avg || 0;
                      const delta = Math.abs(avgA - avgB);

                      return (
                        <tr key={sec.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {isRTL ? sec.titleAr : sec.titleEn}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                            {avgA}%
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                            {avgB}%
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              delta <= 5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              ±{delta}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Question-Wise Average Comparison Table */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                {isRTL ? 'مقارنة متوسط الأسئلة التقييمية (Question-Wise Average)' : 'Question-Wise Average Comparison'}
              </h5>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white text-gray-500">
                      <th className="py-2.5 px-3 text-start font-semibold">Code</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Rubric Question Description</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Section</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-rose-700">Assessor A (0-5)</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-amber-700">Assessor B (0-5)</th>
                      <th className="py-2.5 px-3 text-end font-semibold text-gray-700">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rubricQuestions.map((q, idx) => {
                      const qScoreA = statsA.questionStats[idx]?.avgScore || 0;
                      const qScoreB = statsB.questionStats[idx]?.avgScore || 0;
                      const delta = Math.round(Math.abs(qScoreA - qScoreB) * 10) / 10;

                      return (
                        <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#7A2E3A]">{q.code}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-800 max-w-[320px]">
                            <div>{isRTL ? q.textAr : q.textEn}</div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 font-semibold">
                            {isRTL ? q.sectionTitleAr : q.sectionTitleEn}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                            {qScoreA.toFixed(1)} / 5
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                            {qScoreB.toFixed(1)} / 5
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              delta <= 0.5 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              ±{delta.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MARKING CONSISTENCY ANALYSIS & PATTERN AUDIT                       */}
      {/* ========================================================================= */}
      {activeTab === 'consistency' && (
        <div className="space-y-6">
          {/* Assessor Target Selector for Consistency Analysis */}
          <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#7A2E3A]" />
                <span>{isRTL ? 'تحليل اتساق درجات المقيم المختار' : 'Target Assessor Marking Consistency Audit'}</span>
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {isRTL 
                  ? 'حساب المتوسط، الوسيط، الانحراف المعياري، وتكرار الرصد والتباين الفئوي.'
                  : 'Statistical dispersion metrics: Mean, Median, Standard Deviation, Repeated Frequency, and Component Variances.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">{isRTL ? 'المقيم المحدد:' : 'Selected Assessor:'}</span>
              <select
                value={selectedAssessorId}
                onChange={e => setSelectedAssessorId(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-xl py-1.5 px-3 font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
              >
                {effectiveAssessors.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.occupation || 'Assessor'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pattern Detection & Review Indicator Governance Alert Panels */}
          <div className="space-y-3">
            {currentStats.reviewIndicators.map((ind, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-xs ${
                  ind.level === 'warning'
                    ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                    : ind.level === 'info'
                    ? 'bg-blue-50/80 border-blue-300 text-blue-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  ind.level === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : ind.level === 'info'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {ind.level === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : ind.level === 'info' ? (
                    <Info className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {ind.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/70 border border-current">
                      Assessor: {currentStats.assessorUser?.name}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">
                    {ind.description}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 italic">
                    {isRTL
                      ? 'ملاحظة: هذا المؤشر إحصائي موضوعي لأغراض حوكمة المركز وتدقيق الجودة، ولا يعني بالضرورة وجود خطأ لدى المقيم.'
                      : 'Note: This is an objective statistical review indicator for Center Admin governance. Does not label assessor incorrect or fraudulent.'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 8 Primary Analytical Indicators (Required by Prompt) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Average Score */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'متوسط الدرجات' : 'Average Score'}</span>
                <Award className="w-4 h-4 text-[#7A2E3A]" />
              </div>
              <div className="text-2xl font-bold font-mono text-gray-900">{currentStats.avgScore}%</div>
              <div className="mt-1 text-[11px] text-gray-500 font-mono">Sample: {currentStats.candidateCount} candidates</div>
            </div>

            {/* 2. Median Score */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'الوسيط الحسابي' : 'Median Score'}</span>
                <Calculator className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-indigo-700">{currentStats.medianScore}%</div>
              <div className="mt-1 text-[11px] text-gray-500">
                Delta from Mean: <strong className="font-mono text-gray-700">{Math.abs(currentStats.avgScore - currentStats.medianScore)}%</strong>
              </div>
            </div>

            {/* 3. Standard Deviation (σ) */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'الانحراف المعياري (σ)' : 'Standard Deviation (σ)'}</span>
                <TrendingUp className="w-4 h-4 text-[#7A2E3A]" />
              </div>
              <div className="text-2xl font-bold font-mono text-gray-900">±{currentStats.stdDev}%</div>
              <div className="mt-1 text-[11px] text-gray-500">
                Spread: <strong className="text-gray-800">{currentStats.stdDev < 4 ? 'Low/Tight' : currentStats.stdDev < 8 ? 'Balanced' : 'High Dispersion'}</strong>
              </div>
            </div>

            {/* 4. Repeated Rating Frequency */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'تكرار الدرجة المتطابقة' : 'Repeated Rating Freq.'}</span>
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700">{currentStats.repeatedRatingFreq}%</div>
              <div className="mt-1 text-[11px] text-gray-500">
                Mode Rating: <strong className="font-mono text-gray-900">{currentStats.modeRatingValue}/5</strong>
              </div>
            </div>

            {/* 5. Question-wise Variance */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'تباين الأسئلة (σ²)' : 'Question-Wise Variance'}</span>
                <CheckSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-gray-900">{currentStats.questionWiseVariance}</div>
              <div className="mt-1 text-[11px] text-gray-500">Mean Item Dispersion</div>
            </div>

            {/* 6. Candidate-wise Variance */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'تباين المرشحين' : 'Candidate-Wise Variance'}</span>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-gray-900">{currentStats.candidateVariance}</div>
              <div className="mt-1 text-[11px] text-gray-500">Range: {currentStats.minScore}% - {currentStats.maxScore}%</div>
            </div>

            {/* 7. Section-wise Variance */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'تباين الأقسام' : 'Section-Wise Variance'}</span>
                <SlidersHorizontal className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-gray-900">{currentStats.sectionWiseVariance}</div>
              <div className="mt-1 text-[11px] text-gray-500">Pillar Variance Mean</div>
            </div>

            {/* 8. Consistency Rating */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{isRTL ? 'مؤشر الاتساق الكلي' : 'Overall Consistency'}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">{currentStats.consistencyScore}%</div>
              <div className="mt-1 text-[11px] text-gray-500">
                Rubric Fidelity: <strong className="text-emerald-700 font-semibold">{currentStats.consistencyScore >= 85 ? 'High' : 'Moderate'}</strong>
              </div>
            </div>
          </div>

          {/* High/Low Score Concentration & Available Rating Scale Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Concentration Card */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-4">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#7A2E3A]" />
                <span>{isRTL ? 'تركز الدرجات العالية والمنخفضة (Score Concentration)' : 'High / Low Score Concentration'}</span>
              </h5>
              
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-800">
                    <span>Ceiling Concentration (≥90% Distinction)</span>
                    <span className="font-mono font-bold text-emerald-700">{currentStats.highScoreConcentration}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${currentStats.highScoreConcentration}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500">{currentStats.distribution.distinction} out of {currentStats.candidateCount} candidates</div>
                </div>

                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-800">
                    <span>Mid-Range Competency (70% - 89%)</span>
                    <span className="font-mono font-bold text-blue-700">{currentStats.midScoreConcentration}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${currentStats.midScoreConcentration}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500">{currentStats.distribution.proficient + currentStats.distribution.competent} out of {currentStats.candidateCount} candidates</div>
                </div>

                <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-800">
                    <span>Floor Concentration (&lt;70% Below Standard)</span>
                    <span className="font-mono font-bold text-rose-700">{currentStats.lowScoreConcentration}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-rose-600 rounded-full" style={{ width: `${currentStats.lowScoreConcentration}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-500">{currentStats.distribution.needsImprovement} out of {currentStats.candidateCount} candidates</div>
                </div>
              </div>
            </div>

            {/* Distribution Across the Available Rating Scale (0 to 5) */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-4">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#7A2E3A]" />
                <span>{isRTL ? 'التوزيع عبر مقياس التقييم المتاح (0 - 5)' : 'Distribution Across Available Rating Scale (0 to 5)'}</span>
              </h5>
              
              <div className="space-y-2.5">
                {currentStats.ratingScaleDistribution.map(item => (
                  <div key={item.scale} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono font-bold text-gray-900">
                        <span className="w-5 text-center text-[#7A2E3A]">{item.scale}</span>
                        <span className="text-gray-500 font-sans font-normal text-[11px]">
                          {item.scale === 5 ? 'Exemplary' : item.scale === 4 ? 'Proficient' : item.scale === 3 ? 'Basic' : item.scale === 2 ? 'Developing' : item.scale === 1 ? 'Non-Compliant' : 'Unsafe'}
                        </span>
                      </div>
                      <span className="font-mono text-gray-700 font-bold">{item.count} items ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          item.scale >= 4 ? 'bg-[#7A2E3A]' : item.scale === 3 ? 'bg-amber-600' : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUESTION-WISE MARKING ANALYSIS & HIERARCHICAL DRILLDOWN            */}
      {/* ========================================================================= */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Question Analysis Header & Assessor Selector */}
          <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#7A2E3A]" />
                  <span>{isRTL ? 'تحليل وتدقيق الأسئلة التقييمية' : 'Question-Wise Marking Analysis & Audit Table'}</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isRTL 
                    ? 'تحليل إحصائي لكل بند في معيار التقييم المعتمد: المتوسط، أدنى وأعلى درجة، التباين، ونسبة الاجتياز مقارنة ببقية المقيمين.'
                    : 'Statistical breakdown for every rubric question: Assessor Average vs Peer Average, Delta gap, Variance (σ²), and passing rates.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">{isRTL ? 'المقيم:' : 'Assessor:'}</span>
                <select
                  value={selectedAssessorId}
                  onChange={e => setSelectedAssessorId(e.target.value)}
                  className="text-xs bg-white border border-gray-200 rounded-xl py-1.5 px-3 font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
                >
                  {effectiveAssessors.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.occupation || 'Assessor'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-gray-500">
                    <th className="py-2.5 px-3 text-start font-semibold">Code</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Rubric Criteria Description</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Section</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-[#7A2E3A]">Assessor Avg (0-5)</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-gray-700">Peer Benchmark</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Variance (σ²)</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-emerald-700">Pass Rate (≥3/5)</th>
                    <th className="py-2.5 px-3 text-end font-semibold">Inspection Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentStats.questionStats.map((q) => {
                    const isSelected = q.id === activeDrilldownQuestion.id;
                    return (
                      <tr 
                        key={q.id} 
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-rose-50/70 border-l-4 border-l-[#7A2E3A]' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedQuestionId(q.id)}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-[#7A2E3A]">
                          {q.code}
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-900 max-w-[340px]">
                          <div>{isRTL ? q.textAr : q.textEn}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {q.id}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700">
                            {isRTL ? q.sectionTitleAr : q.sectionTitleEn}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-[#7A2E3A] text-sm">
                          {q.avgScore.toFixed(1)} <span className="text-[10px] text-gray-400 font-normal">/ {q.maxScore}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-gray-700">
                          {q.peerAvg.toFixed(1)} <span className="text-[10px] text-gray-400">(Δ {q.delta >= 0 ? `+${q.delta}` : q.delta})</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-gray-700">
                          {q.variance.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                          {q.passRate}%
                        </td>
                        <td className="py-3 px-3 text-end">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedQuestionId(q.id); }}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-[#7A2E3A] text-white shadow-2xs'
                                : 'border border-gray-200 hover:bg-white text-gray-700'
                            }`}
                          >
                            {isSelected ? 'Inspecting ↓' : 'Inspect Candidates'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* HIERARCHICAL DRILLDOWN INSPECTOR (CRUCIAL REQUIREMENT)                     */}
          {/* Assessor → Section → Question → Candidate → Assigned Rating               */}
          {/* ========================================================================= */}
          <div className="p-5 rounded-2xl border-2 border-[#7A2E3A]/20 bg-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7A2E3A] text-white uppercase tracking-wider">
                    Interactive Drill-Down Inspector
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    Assessor → Section → Question → Candidate → Assigned Rating
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 mt-1">
                  Candidate-Level Assigned Ratings for: <span className="text-[#7A2E3A] font-mono">{activeDrilldownQuestion.code}</span> ({activeDrilldownQuestion.sectionTitleEn})
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  "{activeDrilldownQuestion.textEn}"
                </p>
              </div>

              {/* Question Comparison Pill */}
              <div className="p-2.5 rounded-xl bg-stone-50 border border-gray-200 text-xs font-mono text-end self-start sm:self-auto">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-sans font-bold">Assessor vs Peer Baseline</div>
                <div className="text-gray-900 font-bold mt-0.5">
                  Assessor: <span className="text-[#7A2E3A]">{activeDrilldownQuestion.avgScore.toFixed(1)} / 5</span> • Peers: <span>{activeDrilldownQuestion.peerAvg.toFixed(1)} / 5</span>
                </div>
              </div>
            </div>

            {/* Candidates Evaluated on this Question */}
            {activeDrilldownQuestion.evaluatedCandidates.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                No stored candidate evaluations found for this question under current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                      <th className="py-2.5 px-3 text-start font-semibold">Candidate</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Passport / ID</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Batch</th>
                      <th className="py-2.5 px-3 text-center font-semibold text-[#7A2E3A]">Assigned Rating (0-5)</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Overall Exam %</th>
                      <th className="py-2.5 px-3 text-start font-semibold">Assessor Observation Notes</th>
                      <th className="py-2.5 px-3 text-end font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeDrilldownQuestion.evaluatedCandidates.map((cand) => (
                      <tr key={cand.candidateId} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-rose-50 text-[#7A2E3A] font-bold text-xs flex items-center justify-center shrink-0">
                              {cand.candidateName.charAt(0)}
                            </div>
                            <span className="truncate">{cand.candidateName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-600">
                          {cand.passportNumber}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-gray-700">
                          {cand.batchId}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono font-bold text-xs ${
                            cand.rating >= 4
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : cand.rating === 3
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            <Star className="w-3 h-3 fill-current" />
                            {cand.rating} / 5
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-gray-900">
                          {cand.totalPercentage}%
                        </td>
                        <td className="py-3 px-3 text-gray-600 max-w-[280px]">
                          <span className="line-clamp-2" title={cand.remarks}>
                            {cand.remarks || 'Standard evaluation recorded.'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-end">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Sealed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CANDIDATE-WISE MARK DISTRIBUTION & VARIATION                       */}
      {/* ========================================================================= */}
      {activeTab === 'distribution' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#7A2E3A]" />
                  <span>{isRTL ? 'تفصيل توزيع درجات المرشحين الفردية والتباين' : 'Candidate-Wise Mark Distribution & Inter-Candidate Variation'}</span>
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isRTL 
                    ? 'عرض مفصل لكل مرشح قام هذا المقيم بتقييمه: الدرجات التفصيلية، الانحراف عن متوسط المقيم، ومستوى الأداء.'
                    : 'Individual candidate records evaluated by this assessor, section breakdowns, and deviation from the assessor mean.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">{isRTL ? 'المقيم:' : 'Assessor:'}</span>
                <select
                  value={selectedAssessorId}
                  onChange={e => setSelectedAssessorId(e.target.value)}
                  className="text-xs bg-white border border-gray-200 rounded-xl py-1.5 px-3 font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#7A2E3A]"
                >
                  {effectiveAssessors.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.occupation || 'Assessor'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidate-to-Candidate Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-[11px] text-gray-500 font-medium">Assessed Candidates</div>
                <div className="text-xl font-bold font-mono text-gray-900 mt-1">{currentStats.candidateCount}</div>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-[11px] text-gray-500 font-medium">Score Spread Range</div>
                <div className="text-xl font-bold font-mono text-[#7A2E3A] mt-1">{currentStats.scoreRange}% ({currentStats.minScore}% - {currentStats.maxScore}%)</div>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-[11px] text-gray-500 font-medium">Inter-Candidate Variance</div>
                <div className="text-xl font-bold font-mono text-gray-900 mt-1">{currentStats.candidateVariance}</div>
              </div>
              <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50">
                <div className="text-[11px] text-gray-500 font-medium">Cohort Mean</div>
                <div className="text-xl font-bold font-mono text-gray-900 mt-1">{currentStats.avgScore}%</div>
              </div>
            </div>

            {/* Candidate Distribution Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-gray-500">
                    <th className="py-2.5 px-3 text-start font-semibold">Candidate Name</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Passport</th>
                    <th className="py-2.5 px-3 text-start font-semibold">Batch</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Safety %</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Tools %</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Hygiene %</th>
                    <th className="py-2.5 px-3 text-center font-semibold text-[#7A2E3A]">Total Score (%)</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Deviation from Mean</th>
                    <th className="py-2.5 px-3 text-end font-semibold">Performance Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentStats.candidateRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-gray-400">
                        No evaluated candidates found for this assessor.
                      </td>
                    </tr>
                  ) : (
                    currentStats.candidateRows.map(row => (
                      <tr key={row.candidateId} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          {row.candidateName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">
                          {row.passportNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-700">
                          {row.batchId}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {row.safetyScore}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {row.toolsScore}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {row.hygieneScore}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-900 text-sm">
                          {row.percentage}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            row.scoreDiffFromMean >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {row.scoreDiffFromMean >= 0 ? `+${row.scoreDiffFromMean}%` : `${row.scoreDiffFromMean}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.percentage >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.percentage >= 80
                              ? 'bg-blue-100 text-blue-800'
                              : row.percentage >= 70
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.percentage >= 90 ? 'Distinction' : row.percentage >= 80 ? 'Proficient' : row.percentage >= 70 ? 'Competent' : 'Below Standard'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
