import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Search, Filter } from 'lucide-react';
import { AuditLog, AuditAction } from '../types';
import { AuditService } from '../services/auditService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Table, Column } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Pagination } from '../components/ui/Pagination';

export const AuditLogsPage: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setLogs(AuditService.getLogs());
  }, []);

  const handleExport = () => {
    showToast('Audit trail exported successfully as ISO compliance archive.', 'success');
  };

  const getActionBadgeVariant = (action: AuditAction) => {
    switch (action) {
      case 'LOGIN':
      case 'LOGOUT':
        return 'info';
      case 'CREATE':
        return 'success';
      case 'UPDATE':
      case 'ASSIGN':
        return 'gold';
      case 'DELETE':
      case 'LOCK':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const filtered = logs.filter(l => {
    const matchesSearch =
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entity.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: t.auditModule.timestamp,
      render: l => (
        <span className="font-mono text-[11px] text-stone-500">
          {new Date(l.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: t.auditModule.user,
      render: l => (
        <div>
          <span className="font-semibold text-stone-900 block">{l.userName}</span>
          <span className="text-[10px] text-stone-400 font-mono">{l.role}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: t.auditModule.action,
      render: l => (
        <Badge variant={getActionBadgeVariant(l.action)} size="sm">
          {l.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: t.auditModule.entity,
      render: l => (
        <span className="text-xs font-mono font-medium text-stone-700">
          {l.entity}
        </span>
      ),
    },
    {
      key: 'details',
      header: t.auditModule.details,
      render: l => (
        <span className="text-xs text-stone-600 truncate max-w-sm block">
          {l.details}
        </span>
      ),
    },
    {
      key: 'ip',
      header: t.auditModule.ip,
      render: l => (
        <span className="font-mono text-[11px] text-stone-400">
          {l.ipAddress}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.auditModule.title}
        subtitle={t.auditModule.subtitle}
        breadcrumbs={[
          { label: t.nav.dashboard, href: '/dashboard' },
          { label: t.auditModule.title },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {t.auditModule.exportLogs}
          </Button>
        }
      />

      {/* Filter and Search */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-borderlight rounded-lg shadow-soft">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search action, actor, or entity details..."
            className="w-full text-xs sm:text-sm bg-white border border-borderlight rounded-md py-1.5 ps-9 pe-3 focus:outline-none focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-stone-400" />
          <select
            value={actionFilter}
            onChange={e => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-borderlight rounded-md py-1.5 px-2.5 focus:outline-none focus:border-maroon-700 text-stone-700"
          >
            <option value="ALL">{t.common.all} Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="ASSIGN">ASSIGN</option>
          </select>
        </div>
      </div>

      <Table
        columns={columns}
        data={paginated}
        keyExtractor={l => l.id}
      />

      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
