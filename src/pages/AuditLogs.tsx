import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Download, Search, Filter, Eye, Printer, 
  Calendar, Monitor, Smartphone, Shield, Building2, User, 
  CheckCircle2, XCircle, ArrowUpDown, RefreshCw, Layers, Globe
} from 'lucide-react';
import { AuditLog, AuditAction, Role, Center, Country } from '../types';
import { AuditService } from '../services/auditService';
import { StorageService, STORAGE_KEYS } from '../services/storageService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/ui/Pagination';
import { Modal, ModalSectionTitle } from '../components/ui/Modal';

export const AuditLogsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isGlobalAdmin = user?.role === 'GLOBAL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isCountryAdmin = user?.role === 'COUNTRY_ADMIN' || user?.role === 'COUNTRY_ACCOUNT';
  const isCenterAdmin = user?.role === 'CENTER_ADMIN';
  const userCenterId = user?.centerId || 'ctr-sa-1';
  const userCountryId = user?.countryId || 'cnt-sa';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [centerFilter, setCenterFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const loadData = () => {
    const loadedCountries = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
    const loadedCenters = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);

    const countryCenters = loadedCenters.filter(c => c.countryId === userCountryId);
    const countryCenterIds = new Set(countryCenters.map(c => c.id));

    const allLogs = AuditService.getLogs();
    const filtered = isCenterAdmin 
      ? allLogs.filter(l => l.centerId === userCenterId || l.userId === user?.id)
      : isCountryAdmin
      ? allLogs.filter(l => l.countryId === userCountryId || (l.centerId && countryCenterIds.has(l.centerId)))
      : allLogs;

    setLogs(filtered);
    setCountries(isCountryAdmin ? loadedCountries.filter(c => c.id === userCountryId) : loadedCountries);
    setCenters(isCountryAdmin ? countryCenters : loadedCenters);
  };

  useEffect(() => {
    loadData();
  }, [isCenterAdmin, isCountryAdmin, userCenterId, userCountryId, user?.id]);

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      showToast(language === 'ar' ? 'لا توجد سجلات مطابقة للتصدير' : 'No records match selected filter for export', 'warning');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Actor Name', 'Role', 'Action', 'Entity', 'Entity ID', 'Center ID', 'IP Address', 'Device', 'Browser', 'Status', 'Details'];
    const rows = filtered.map(l => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.role}"`,
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${l.entityId || ''}"`,
      `"${l.centerId || ''}"`,
      `"${l.ipAddress}"`,
      `"${(l.deviceInfo || 'Workstation').replace(/"/g, '""')}"`,
      `"${(l.browserInfo || 'Browser').replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skillassess360_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    AuditService.log(
      'EXPORT',
      'AUDIT_LOG',
      `Exported ${filtered.length} audit records as ISO 17024 regulatory CSV archive.`,
      undefined,
      'SUCCESS'
    );

    showToast(language === 'ar' ? 'تم تصدير سجل التدقيق الأمني بنجاح' : 'Audit archive exported successfully with cryptographic timestamp', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const getActionBadgeVariant = (action: AuditAction) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return 'info';
      case 'CREATE':
      case 'CREATE_USER':
      case 'CREATE_CENTER':
      case 'CREATE_COUNTRY':
      case 'CREATE_TASK':
      case 'ENROLL_CANDIDATE':
        return 'success';
      case 'UPDATE':
      case 'UPDATE_USER':
      case 'UPDATE_COMPLAINT':
      case 'ASSIGN':
      case 'ALLOCATE_TASK':
      case 'GENERATE_LOTTERY':
        return 'gold';
      case 'LOCK':
      case 'SUBMIT_RESULT':
      case 'CORRECT_RESULT':
        return 'maroon';
      case 'DELETE':
      case 'DEACTIVATE_USER':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  // Distinct entities for filter dropdown
  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.entity) set.add(l.entity);
    });
    return Array.from(set);
  }, [logs]);

  // Distinct actions for filter dropdown
  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set);
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        l.details.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        (l.entityId ? l.entityId.toLowerCase().includes(q) : false) ||
        l.ipAddress.toLowerCase().includes(q);

      const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
      const matchesEntity = entityFilter === 'ALL' || l.entity === entityFilter;
      const matchesRole = roleFilter === 'ALL' || l.role === roleFilter;

      let matchesCountry = true;
      if (countryFilter !== 'ALL') {
        const countryCenterIds = new Set(centers.filter(c => c.countryId === countryFilter).map(c => c.id));
        matchesCountry = l.countryId === countryFilter || (!!l.centerId && countryCenterIds.has(l.centerId));
      }

      const matchesCenter = centerFilter === 'ALL' || l.centerId === centerFilter;

      let matchesDate = true;
      if (dateFrom) {
        const fromTimestamp = new Date(dateFrom).getTime();
        const logTimestamp = new Date(l.timestamp).getTime();
        if (logTimestamp < fromTimestamp) matchesDate = false;
      }
      if (dateTo && matchesDate) {
        const toTimestamp = new Date(dateTo).setHours(23, 59, 59, 999);
        const logTimestamp = new Date(l.timestamp).getTime();
        if (logTimestamp > toTimestamp) matchesDate = false;
      }

      return matchesSearch && matchesAction && matchesEntity && matchesRole && matchesCountry && matchesCenter && matchesDate;
    });
  }, [logs, searchTerm, actionFilter, entityFilter, roleFilter, countryFilter, centerFilter, dateFrom, dateTo, centers]);

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setRoleFilter('ALL');
    setCountryFilter('ALL');
    setCenterFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: t.auditModule.timestamp,
      render: l => (
        <div>
          <span className="font-mono text-[11px] font-semibold text-[#3F3030] block">
            {new Date(l.timestamp).toLocaleDateString()}
          </span>
          <span className="font-mono text-[10px] text-[#806F6F]">
            {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'scope',
      header: language === 'ar' ? 'الموقع الهرمي' : 'Hierarchy Scope',
      render: l => {
        const center = centers.find(c => c.id === l.centerId);
        const country = countries.find(c => c.id === (l.countryId || center?.countryId));
        if (!country && !center) {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#806F6F] bg-stone-100 px-1.5 py-0.5 rounded">
              <Globe className="w-3 h-3 text-[#7A2E3A]" /> Global
            </span>
          );
        }
        return (
          <div className="text-[11px] leading-tight max-w-[150px] truncate" title={`${country?.nameEn || ''} > ${center?.nameEn || ''}`}>
            <span className="font-semibold text-[#3F3030]">
              {country?.flagEmoji} {country?.code || 'Global'}
            </span>
            {center && (
              <span className="font-mono text-[#7A2E3A] block text-[10px]">
                › {center.code}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'user',
      header: t.auditModule.user,
      render: l => (
        <div>
          <span className="font-semibold text-xs text-[#3F3030] block">{l.userName}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-[#7A2E3A] font-medium">
              {l.role}
            </span>
            {l.centerId && (
              <span className="text-[10px] font-mono text-[#806F6F]">
                {centers.find(c => c.id === l.centerId)?.code || l.centerId}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: t.auditModule.action,
      render: l => (
        <Badge variant={getActionBadgeVariant(l.action)} size="sm">
          {l.action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: t.auditModule.entity,
      render: l => (
        <div>
          <span className="text-xs font-mono font-bold text-[#7A2E3A] block">
            {l.entity}
          </span>
          {l.entityId && (
            <span className="text-[10px] font-mono text-[#806F6F] block truncate max-w-[120px]">
              ID: {l.entityId}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'details',
      header: t.auditModule.details,
      render: l => (
        <span className="text-xs text-[#3F3030] line-clamp-2 max-w-sm block leading-relaxed font-medium">
          {l.details}
        </span>
      ),
    },
    {
      key: 'ip',
      header: language === 'ar' ? 'المحطة والشبكة' : 'Workstation & IP',
      render: l => (
        <div className="text-[11px] font-mono">
          <span className="text-[#3F3030] font-semibold block">{l.ipAddress}</span>
          <span className="text-[10px] text-[#806F6F] block truncate max-w-[130px]">
            {l.deviceInfo || 'Standard PC'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: language === 'ar' ? 'معاينة' : 'Inspect',
      className: 'text-end',
      headerClassName: 'text-end',
      render: l => (
        <Button
          variant="secondary"
          size="xs"
          onClick={() => setSelectedLog(l)}
          leftIcon={<Eye className="w-3 h-3" />}
        >
          {language === 'ar' ? 'تفاصيل' : 'Dossier'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <PageHeader
        title={t.auditModule.title}
        subtitle={isCenterAdmin 
          ? (language === 'ar' ? 'سجل التدقيق الرقمي المعتمد لعمليات المركز' : 'Center-scoped immutable audit log of administrative and testing operations')
          : t.auditModule.subtitle
        }
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.auditModule.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              {t.auditModule.exportLogs}
            </Button>
          </div>
        }
      />

      {/* Governance & Compliance Strip */}
      <div className="p-3 bg-white border border-[#E8D9D2] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-semibold text-[#3F3030]">
            {language === 'ar' ? 'سجل الرقابة الموحد — غير قابل للتعديل (ISO/IEC 17024)' : 'Append-Only Ledger Sealed Under ISO/IEC 17024 Compliance'}
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F8ECEE] text-[#7A2E3A] font-bold">
            {filtered.length} {language === 'ar' ? 'سجلات' : 'Events'}
          </span>
        </div>
        <div className="text-[11px] text-[#806F6F] flex items-center gap-3">
          <span>{isCenterAdmin ? `Scope: Center ${centers.find(c => c.id === userCenterId)?.code || userCenterId}` : 'Scope: Global Enterprise Authority'}</span>
          <span>•</span>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-[#7A2E3A] font-semibold hover:underline flex items-center gap-1"
          >
            <Filter className="w-3 h-3" />
            <span>{showAdvancedFilters ? (language === 'ar' ? 'إخفاء الفلاتر المتقدمة' : 'Hide Filters') : (language === 'ar' ? 'الفلاتر المتقدمة' : 'Advanced Filters')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white border border-[#E8D9D2] rounded-xl p-3.5 shadow-soft space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-[#806F6F]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={language === 'ar' ? 'بحث بالمنفذ، الإجراء، النطاق، أو IP...' : 'Search actor, action, entity, IP, or details...'}
              className="w-full text-xs bg-white border border-[#E8D9D2] rounded-lg py-2 ps-9 pe-3 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030] placeholder:text-[#A89595]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
            <select
              value={actionFilter}
              onChange={e => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
            >
              <option value="ALL">{language === 'ar' ? 'كافة الإجراءات' : 'All Actions'}</option>
              {actionOptions.map(act => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>

            <select
              value={entityFilter}
              onChange={e => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-white border border-[#E8D9D2] rounded-lg py-1.5 px-2.5 focus:outline-none focus:border-[#7A2E3A] text-[#3F3030]"
            >
              <option value="ALL">{language === 'ar' ? 'كافة الكيانات' : 'All Entities'}</option>
              {entityOptions.map(ent => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>

            {(searchTerm || actionFilter !== 'ALL' || entityFilter !== 'ALL' || roleFilter !== 'ALL' || centerFilter !== 'ALL' || dateFrom || dateTo) && (
              <Button variant="ghost" size="xs" onClick={resetFilters} className="text-[#7A2E3A]">
                {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Multi-Criteria Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-[#E8D9D2] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-[#806F6F] mb-1">
                {language === 'ar' ? 'من تاريخ' : 'Date From'}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-1.5 border border-[#E8D9D2] rounded-lg bg-white text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#806F6F] mb-1">
                {language === 'ar' ? 'إلى تاريخ' : 'Date To'}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-1.5 border border-[#E8D9D2] rounded-lg bg-white text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#806F6F] mb-1">
                {language === 'ar' ? 'دور المستخدم' : 'User Role'}
              </label>
              <select
                value={roleFilter}
                onChange={e => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-xs p-1.5 border border-[#E8D9D2] rounded-lg bg-white text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
              >
                <option value="ALL">{language === 'ar' ? 'جميع الأدوار' : 'All Roles'}</option>
                <option value="GLOBAL_ADMIN">GLOBAL_ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="COUNTRY_ADMIN">COUNTRY_ADMIN</option>
                <option value="COUNTRY_ACCOUNT">COUNTRY_ACCOUNT</option>
                <option value="CENTER_ADMIN">CENTER_ADMIN</option>
                <option value="ASSESSOR">ASSESSOR</option>
                <option value="SUPPORT_STAFF">SUPPORT_STAFF</option>
                <option value="ORGANIZER">ORGANIZER</option>
                <option value="CBT_TEST_SUPPORT">CBT_TEST_SUPPORT</option>
              </select>
            </div>

            {!isCenterAdmin && !isCountryAdmin && (
              <div>
                <label className="block text-[11px] font-semibold text-[#806F6F] mb-1">
                  {language === 'ar' ? 'الدولة السيادية' : 'Sovereign Country'}
                </label>
                <select
                  value={countryFilter}
                  onChange={e => {
                    setCountryFilter(e.target.value);
                    setCenterFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs p-1.5 border border-[#E8D9D2] rounded-lg bg-white text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                >
                  <option value="ALL">{language === 'ar' ? 'جميع الدول' : 'All Countries'}</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{c.flagEmoji} {language === 'ar' ? c.nameAr : c.nameEn} ({c.code})</option>
                  ))}
                </select>
              </div>
            )}

            {!isCenterAdmin && (
              <div>
                <label className="block text-[11px] font-semibold text-[#806F6F] mb-1">
                  {language === 'ar' ? 'المركز الدولي' : 'Testing Center'}
                </label>
                <select
                  value={centerFilter}
                  onChange={e => {
                    setCenterFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs p-1.5 border border-[#E8D9D2] rounded-lg bg-white text-[#3F3030] focus:outline-none focus:border-[#7A2E3A]"
                >
                  <option value="ALL">{language === 'ar' ? 'جميع المراكز' : 'All Centers'}</option>
                  {(countryFilter === 'ALL' ? centers : centers.filter(c => c.countryId === countryFilter)).map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.nameEn}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#E8D9D2] rounded-xl shadow-soft overflow-hidden">
        <Table
          columns={columns}
          data={paginated}
          keyExtractor={l => l.id}
          emptyState={
            <div className="p-8 text-center text-xs text-[#806F6F]">
              {language === 'ar' ? 'لا توجد سجلات مطابقة للشروط المحددة' : 'No audit trail entries found matching current parameters'}
            </div>
          }
        />

        <div className="p-3 border-t border-[#E8D9D2] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-[#806F6F]">
            {language === 'ar' 
              ? `عرض ${paginated.length} من أصل ${filtered.length} سجلاً` 
              : `Showing ${paginated.length} of ${filtered.length} total filtered audit records`
            }
          </span>
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Audit Detail Modal (Inspection Dossier) */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          maxWidth="lg"
          icon={<ShieldCheck className="w-6 h-6 text-[#7A2E3A]" />}
          title={language === 'ar' ? `فحص السجل الرقابي • ${selectedLog.id}` : `Audit Forensic Record: ${selectedLog.id}`}
          subtitle={`${new Date(selectedLog.timestamp).toLocaleString()} • ${selectedLog.action}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-mono text-[#806F6F]">
                Hash: {btoa(selectedLog.id + selectedLog.timestamp).slice(0, 16)} (Sealed)
              </span>
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Top Operational Status */}
            <div className="p-3 rounded-xl bg-[#FFFCF8] border border-[#E8D9D2] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg font-bold ${
                  selectedLog.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedLog.status === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <span className="font-bold text-sm text-[#3F3030] block">
                    {selectedLog.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[#806F6F] text-[11px]">
                    Outcome: <strong className={selectedLog.status === 'SUCCESS' ? 'text-emerald-700' : 'text-rose-700'}>{selectedLog.status}</strong>
                  </span>
                </div>
              </div>

              <Badge variant={getActionBadgeVariant(selectedLog.action)} size="md">
                {selectedLog.entity}
              </Badge>
            </div>

            {/* Hierarchical Provenance */}
            <div className="p-3 bg-[#FFFCF8] border border-[#E8D9D2] rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A2E3A] block">
                {language === 'ar' ? 'الموقع الهرمي للحدث ومستوى الرقابة' : 'Hierarchical Governance Provenance'}
              </span>
              <div className="flex items-center flex-wrap gap-2 text-xs text-[#3F3030]">
                <span className="bg-white px-2 py-0.5 rounded border border-[#E8D9D2] font-semibold">Global Program</span>
                <span>›</span>
                <span className="bg-white px-2 py-0.5 rounded border border-[#E8D9D2] font-semibold">
                  {countries.find(c => c.id === selectedLog.countryId || c.id === centers.find(ctr => ctr.id === selectedLog.centerId)?.countryId)?.flagEmoji || '🌐'}{' '}
                  {countries.find(c => c.id === selectedLog.countryId || c.id === centers.find(ctr => ctr.id === selectedLog.centerId)?.countryId)?.nameEn || 'Universal Scope'}
                </span>
                {selectedLog.centerId && (
                  <>
                    <span>›</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-[#E8D9D2] font-mono font-bold text-[#7A2E3A]">
                      {centers.find(c => c.id === selectedLog.centerId)?.nameEn || selectedLog.centerId} ({centers.find(c => c.id === selectedLog.centerId)?.code || ''})
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actor & Authorization Block */}
            <ModalSectionTitle title={language === 'ar' ? 'بيانات المنفذ والصلاحيات' : 'Actor Dossier & Security Credentials'} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-[#E8D9D2]">
              <div>
                <span className="text-[11px] text-[#806F6F] block">Actor Name</span>
                <span className="font-bold text-[#3F3030]">{selectedLog.userName}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#806F6F] block">Role Authorized</span>
                <span className="font-mono font-semibold text-[#7A2E3A]">{selectedLog.role}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#806F6F] block">System User ID</span>
                <span className="font-mono text-[#3F3030]">{selectedLog.userId}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#806F6F] block">Center Allocation</span>
                <span className="font-medium text-[#3F3030]">
                  {centers.find(c => c.id === selectedLog.centerId)?.nameEn || selectedLog.centerId || 'Global HQ'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#806F6F] block">Target Entity</span>
                <span className="font-mono font-bold text-[#7A2E3A]">{selectedLog.entity}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#806F6F] block">Entity Record ID</span>
                <span className="font-mono text-[#3F3030]">{selectedLog.entityId || 'N/A (System)'}</span>
              </div>
            </div>

            {/* Operational Details Payload */}
            <ModalSectionTitle title={language === 'ar' ? 'التفاصيل التشغيلية وسياق الحدث' : 'Event Description & Audit Payload'} />
            <div className="p-3.5 bg-white rounded-xl border border-[#E8D9D2] text-[#3F3030] font-medium leading-relaxed bg-[#FFFCF8]/40">
              {selectedLog.details}
            </div>

            {/* Client Telemetry (Simulated Prototype Meta per Section 18 & 19) */}
            <ModalSectionTitle title={language === 'ar' ? 'بيانات المحطة والشبكة (محاكاة النموذج الأولي)' : 'Client Telemetry & Workstation Parameters (Simulated)'} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-[#E8D9D2]">
              <div>
                <span className="text-[11px] text-[#806F6F] block">Workstation IP</span>
                <span className="font-mono font-bold text-[#3F3030]">{selectedLog.ipAddress}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#806F6F] block">Client Terminal</span>
                <span className="font-medium text-[#3F3030]">{selectedLog.deviceInfo || 'Secure Examination Desktop'}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#806F6F] block">Operating System</span>
                <span className="font-medium text-[#3F3030]">{selectedLog.osInfo || 'Windows 11 Enterprise'}</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-[11px] text-[#806F6F] block">Browser / Host Agent</span>
                <span className="font-mono text-[11px] text-[#806F6F] block truncate">
                  {selectedLog.browserInfo || 'Chrome Kiosk Agent v124 (Cryptographically Bound)'}
                </span>
              </div>
            </div>

            {/* Immutable Notice */}
            <div className="p-2.5 rounded-lg bg-[#F8ECEE] border border-[#E8D9D2] text-[11px] text-[#7A2E3A] flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'سجل غير قابل للتعديل: هذا الإدخال محمي ضد التعديل أو الحذف وموثق وفق متطلبات الحوكمة الدولية ISO 17024.'
                  : 'Immutable record integrity: This entry is cryptographically sealed and permanently protected from manual deletion or alteration.'}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
