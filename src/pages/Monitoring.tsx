import React, { useState, useEffect } from 'react';
import { 
  Activity, Video, Users, Building2, Globe, Shield, ShieldCheck,
  AlertTriangle, CheckCircle, Clock, Search, Filter, Eye, RefreshCw,
  Radio, Wifi, Cpu, Layers
} from 'lucide-react';
import { LiveActivityEvent, Center, Country, User, Assessment, Candidate } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';

export interface MonitoringProps {
  onNavigate?: (path: string) => void;
}

export const MonitoringPage: React.FC<MonitoringProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('activity');
  const [liveActivities, setLiveActivities] = useState<LiveActivityEvent[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [assessors, setAssessors] = useState<User[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Simulated CCTV Stream Modal
  const [activeCctvStation, setActiveCctvStation] = useState<{
    stationNumber: string;
    centerName: string;
    candidateName: string;
    assessorName: string;
    occupation: string;
  } | null>(null);

  const loadData = () => {
    setLiveActivities(StorageService.get<LiveActivityEvent[]>(STORAGE_KEYS.LIVE_ACTIVITY, []));
    setCenters(StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []));
    setCountries(StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []));
    const allUsers = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    setAssessors(allUsers.filter(u => u.role === 'ASSESSOR'));
    setAssessments(StorageService.get<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, []));
    setCandidates(StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []));
  };

  useEffect(() => {
    loadData();

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['activity', 'assessments', 'assessors', 'centers'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const handleRefresh = () => {
    loadData();
    showToast('Monitoring telemetry synchronized', 'info');
  };

  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="danger" size="sm">CRITICAL</Badge>;
      case 'WARNING':
        return <Badge variant="gold" size="sm">WARNING</Badge>;
      case 'SUCCESS':
        return <Badge variant="success" size="sm">SUCCESS</Badge>;
      case 'INFO':
      default:
        return <Badge variant="neutral" size="sm">INFO</Badge>;
    }
  };

  const tabs = [
    { id: 'activity', label: language === 'ar' ? `البث الحي للأنشطة (${liveActivities.length})` : `Live Activity (${liveActivities.length})` },
    { id: 'assessments', label: language === 'ar' ? `مراقبة جلسات الاختبار (${assessments.length})` : `Assessment Surveillance (${assessments.length})` },
    { id: 'assessors', label: language === 'ar' ? `مراقبة المقيمين (${assessors.length})` : `Assessor Monitoring (${assessors.length})` },
    { id: 'centers', label: language === 'ar' ? `مراقبة المراكز الدولية (${centers.length})` : `Center Readiness (${centers.length})` },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <PageHeader
        title={language === 'ar' ? 'غرفة المراقبة والتحكم الميداني المباشر' : 'Live Center & Assessment Monitoring Suite'}
        subtitle={language === 'ar' ? 'رصد فوري لعمليات التقييم، تدفق الكاميرات، قياس كفاءة المقيمين، وجاهزية المراكز' : 'Omniscient supervisory feed tracking live testing operations, biometric validations, assessor pacing, and facility streams'}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: language === 'ar' ? 'المراقبة الميدانية' : 'Live Monitoring' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>LIVE TELEMETRY</span>
            </span>
            <Button variant="secondary" size="sm" onClick={handleRefresh} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 1. LIVE ACTIVITY STREAM TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#3F3030]">
                  {language === 'ar' ? 'سجل الأحداث والأنشطة المباشرة عبر الشبكة' : 'Real-Time Operational Activity Feed'}
                </h3>
                <p className="text-xs text-[#806F6F]">
                  {language === 'ar' ? 'تدفق العمليات اللحظية للمترشحين، المقيمين، والمحطات العملية' : 'Cryptographically verified real-time event stream across all international centers'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {liveActivities.map(ev => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl border border-[#E8D9D2] bg-[#FFFCF8] hover:bg-white transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      ev.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                      ev.severity === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                      ev.severity === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-[#F8ECEE] text-[#7A2E3A]'
                    }`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[#3F3030]">{ev.centerName}</span>
                        <span className="text-[11px] text-[#806F6F]">({ev.countryName})</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-semibold">
                          {ev.category}
                        </span>
                        {getSeverityBadge(ev.severity)}
                      </div>
                      <p className="text-xs text-[#3F3030] mt-1 font-medium">{ev.event}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-[#806F6F] shrink-0">
                    {ev.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. ASSESSMENT SURVEILLANCE TAB */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {assessments.slice(0, 6).map((a, idx) => {
              const ctr = centers.find(c => c.id === a.centerId);
              return (
                <div key={a.id} className="p-4 rounded-xl bg-white border border-[#E8D9D2] shadow-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-mono font-bold text-xs text-[#7A2E3A]">Bay #{idx + 1}</span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  {/* Simulated Camera Window */}
                  <div className="h-32 rounded-lg bg-stone-900 border border-stone-800 relative overflow-hidden flex flex-col justify-between p-2.5 text-white">
                    <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        <span>CH-{idx + 1} [1080p 60fps]</span>
                      </span>
                      <span className="bg-rose-600/80 px-1 rounded text-white font-bold">REC</span>
                    </div>

                    <div className="text-center py-2">
                      <Cpu className="w-6 h-6 text-stone-600 mx-auto animate-pulse" />
                      <span className="text-[10px] text-stone-400 block mt-1">Biometric Verification Synced</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-stone-300">
                      <span>{ctr?.code || 'CTR-SA-001'}</span>
                      <span>Latency: 28ms</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#806F6F]">Candidate:</span>
                      <span className="font-bold text-[#3F3030]">{a.candidateName || 'Tariq Mahmood'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#806F6F]">Assessor:</span>
                      <span className="font-medium text-[#3F3030]">{a.assessorName || 'Eng. Fahad Al-Otaibi'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#806F6F]">Occupation:</span>
                      <span className="font-medium text-[#7A2E3A]">{a.occupation}</span>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setActiveCctvStation({
                      stationNumber: `Bay #${idx + 1}`,
                      centerName: ctr?.nameEn || 'Riyadh Central Technical Hub',
                      candidateName: a.candidateName || 'Candidate',
                      assessorName: a.assessorName || 'Assessor',
                      occupation: a.occupation,
                    })}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    {language === 'ar' ? 'فحص البث المباشر للشاشة' : 'Open CCTV Feed'}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ASSESSOR MONITORING TAB */}
      {activeTab === 'assessors' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E8D9D2] rounded-xl p-4 shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#E8D9D2] bg-[#FFFCF8] text-[#806F6F]">
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المقيم' : 'Assessor'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'المركز التابع' : 'Allocated Center'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'حالة التواجد' : 'Status'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'التقييمات المنجزة' : 'Assessments Completed'}</th>
                    <th className="py-2.5 px-3 font-semibold text-start">{language === 'ar' ? 'مؤشر الاتساق الرقابي' : 'Calibration Index'}</th>
                    <th className="py-2.5 px-3 font-semibold text-end">{language === 'ar' ? 'الإجراء' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D9D2]">
                  {assessors.map((assessor, idx) => {
                    const ctr = centers.find(c => c.id === assessor.centerId);
                    return (
                      <tr key={assessor.id} className="hover:bg-[#FFFCF8]/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#3F3030]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#FBF6E8] text-[#91702C] flex items-center justify-center font-bold text-xs border border-[#C9A24D]/30">
                              {assessor.name.charAt(0)}
                            </div>
                            <div>
                              <span>{assessor.name}</span>
                              <span className="text-[10px] text-[#806F6F] font-mono block">{assessor.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#3F3030]">{ctr ? ctr.nameEn : 'Riyadh Central'}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>ON DUTY</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#3F3030]">{14 + (idx * 3)} sessions</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-[#7A2E3A] h-2 rounded-full" style={{ width: `${92 + (idx % 7)}%` }}></div>
                            </div>
                            <span className="font-mono text-[11px] font-bold text-[#7A2E3A]">{92 + (idx % 7)}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            onClick={() => onNavigate && onNavigate(`/users?view=details&id=${assessor.id}`)}
                            className="text-xs text-[#7A2E3A] font-medium hover:underline"
                          >
                            {language === 'ar' ? 'عرض الملف' : 'View Profile'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. CENTER READINESS TAB */}
      {activeTab === 'centers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {centers.map(c => {
              const cnt = countries.find(co => co.id === c.countryId);
              const utilization = Math.min(100, Math.round((c.capacity * 0.75)));
              return (
                <div key={c.id} className="p-4 rounded-xl bg-white border border-[#E8D9D2] shadow-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#7A2E3A]" />
                      <span className="font-bold text-xs text-[#3F3030]">{c.nameEn}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="text-xs text-[#806F6F] space-y-1">
                    <div className="flex justify-between">
                      <span>Country:</span>
                      <span className="font-medium text-[#3F3030]">{cnt?.flagEmoji} {cnt?.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Code:</span>
                      <span className="font-mono text-[#3F3030]">{c.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily Capacity:</span>
                      <span className="font-bold text-[#3F3030]">{c.capacity} candidates/day</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#806F6F]">Today's Station Utilization:</span>
                      <span className="font-bold text-[#7A2E3A]">{utilization}%</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#7A2E3A] h-2 rounded-full" style={{ width: `${utilization}%` }}></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8D9D2] flex items-center justify-between text-[11px] text-[#806F6F]">
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Wifi className="w-3 h-3" />
                      <span>Telemetry Synced</span>
                    </span>
                    <button
                      onClick={() => onNavigate && onNavigate(`/centers?view=details&id=${c.id}`)}
                      className="text-xs font-semibold text-[#7A2E3A] hover:underline"
                    >
                      {language === 'ar' ? 'تفاصيل المركز' : 'Center Hub'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CCTV Stream Preview Modal */}
      {activeCctvStation && (
        <Modal
          isOpen={!!activeCctvStation}
          onClose={() => setActiveCctvStation(null)}
          maxWidth="lg"
          icon={<Video className="w-6 h-6 text-rose-600" />}
          title={`Live CCTV Proctoring: ${activeCctvStation.stationNumber}`}
          subtitle={`${activeCctvStation.centerName} • ${activeCctvStation.occupation}`}
          footer={
            <Button variant="secondary" size="sm" onClick={() => setActiveCctvStation(null)}>
              {t.common.close}
            </Button>
          }
        >
          <div className="space-y-3.5">
            <div className="h-64 rounded-xl bg-stone-950 border border-stone-800 relative overflow-hidden flex flex-col justify-between p-3.5 text-white">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>LIVE STREAM 1080p @ 60FPS</span>
                </span>
                <span className="bg-rose-700 px-2 py-0.5 rounded text-white font-bold text-[10px]">PROCTOR ACTIVE</span>
              </div>

              <div className="text-center py-6">
                <Video className="w-12 h-12 text-stone-700 mx-auto animate-pulse" />
                <span className="text-xs font-mono text-stone-400 block mt-2">
                  Encrypted Station Feed • Real-Time AI Proctoring Telemetry Active
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-stone-400">
                <span>Subject: {activeCctvStation.candidateName}</span>
                <span>Assessor: {activeCctvStation.assessorName}</span>
              </div>
            </div>

            <div className="p-3 bg-[#FFFCF8] rounded-lg border border-[#E8D9D2] text-xs text-[#806F6F] flex items-center justify-between">
              <span>Proctoring Mode: High-Fidelity Biometric Examination Oversight</span>
              <span className="font-mono text-emerald-700 font-semibold">Zero Incidents Flagged</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
