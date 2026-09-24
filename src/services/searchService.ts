import { Candidate, Center, User, Batch, Schedule, Country, PracticalTask, Result, Complaint } from '../types';
import { StorageService, STORAGE_KEYS } from './storageService';

export interface SearchResultItem {
  id: string;
  type: 'candidate' | 'center' | 'user' | 'batch' | 'schedule' | 'country' | 'task' | 'result' | 'complaint';
  title: string;
  subtitle: string;
  badge?: string;
  link: string;
}

export class SearchService {
  static search(query: string, user?: User | null): SearchResultItem[] {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim().toLowerCase();
    const results: SearchResultItem[] = [];

    const isAssessor = user?.role === 'ASSESSOR';
    const isCenterAdmin = user?.role === 'CENTER_ADMIN';
    const isCountryAdmin = user?.role === 'COUNTRY_ADMIN' || user?.role === 'COUNTRY_ACCOUNT';
    const userCenterId = user?.centerId;
    const userCountryId = user?.countryId;

    const centers = StorageService.get<Center[]>(STORAGE_KEYS.CENTERS, []);
    const countryCenterIds = new Set(centers.filter(c => c.countryId === userCountryId).map(c => c.id));

    // Search Candidates
    const candidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    candidates.forEach(c => {
      // Assessor scope: only candidates assigned to this assessor
      if (isAssessor && c.assessorId !== user?.id && c.assessorName !== user?.name) {
        return;
      }
      // Center Admin scope: only candidates in their center
      if (isCenterAdmin && userCenterId && c.centerId !== userCenterId) {
        return;
      }
      // Country Admin scope: only candidates in their assigned country or center
      if (isCountryAdmin && userCountryId && c.countryId !== userCountryId && (!c.centerId || !countryCenterIds.has(c.centerId))) {
        return;
      }

      if (
        c.fullNameEn.toLowerCase().includes(q) ||
        c.fullNameAr.toLowerCase().includes(q) ||
        c.passportNumber.toLowerCase().includes(q) ||
        c.aproReference.toLowerCase().includes(q) ||
        (c.nationalId && c.nationalId.toLowerCase().includes(q)) ||
        (c.idCardNumber && c.idCardNumber.toLowerCase().includes(q)) ||
        (c.batchNumber && c.batchNumber.toLowerCase().includes(q)) ||
        c.occupation.toLowerCase().includes(q)
      ) {
        const link = isAssessor
          ? `/assessor/candidate-verification?query=${encodeURIComponent(c.passportNumber)}`
          : `/candidates?search=${encodeURIComponent(c.passportNumber)}`;

        results.push({
          id: c.id,
          type: 'candidate',
          title: `${c.fullNameEn} (${c.passportNumber})`,
          subtitle: `${c.occupation} • Ref: ${c.aproReference}${c.idCardNumber ? ` • ID: ${c.idCardNumber}` : ''}`,
          badge: c.idCardStatus ? `IDC: ${c.idCardStatus}` : c.status,
          link,
        });
      }
    });

    // If Assessor, only candidates and practical tasks are relevant; skip admin entities
    if (isAssessor) {
      // Search Practical Tasks
      const tasks = StorageService.get<PracticalTask[]>(STORAGE_KEYS.TASKS, []);
      tasks.forEach(t => {
        if (
          t.code.toLowerCase().includes(q) ||
          t.titleEn.toLowerCase().includes(q) ||
          t.titleAr.toLowerCase().includes(q) ||
          t.occupation.toLowerCase().includes(q)
        ) {
          results.push({
            id: t.id,
            type: 'task',
            title: `${t.code} - ${t.titleEn}`,
            subtitle: `${t.occupation} • Level: ${t.difficulty}`,
            badge: t.status,
            link: `/assessor/practical-task`
          });
        }
      });

      return results.slice(0, 15);
    }

    // Search Centers (Only Super/Global Admin, or Country Admin in country, or Center Admin own center)
    centers.forEach(c => {
      if (isCenterAdmin && userCenterId && c.id !== userCenterId) return;
      if (isCountryAdmin && userCountryId && c.countryId !== userCountryId) return;

      if (
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      ) {
        results.push({
          id: c.id,
          type: 'center',
          title: `${c.nameEn} (${c.code})`,
          subtitle: `${c.city} • Capacity: ${c.capacity}`,
          badge: c.status,
          link: `/centers?search=${encodeURIComponent(c.code)}`
        });
      }
    });

    // Search Users (Scoped to center for Center Admin, or country for Country Admin)
    const users = StorageService.get<User[]>(STORAGE_KEYS.USERS, []);
    users.forEach(u => {
      if (isCenterAdmin && userCenterId && u.centerId !== userCenterId) return;
      if (isCountryAdmin && userCountryId && u.countryId !== userCountryId && (!u.centerId || !countryCenterIds.has(u.centerId))) return;

      if (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      ) {
        results.push({
          id: u.id,
          type: 'user',
          title: u.name,
          subtitle: `${u.email} • ${u.role.replace('_', ' ')}`,
          badge: u.status,
          link: `/users?search=${encodeURIComponent(u.email)}`
        });
      }
    });

    // Search Batches (Scoped to center for Center Admin, or country for Country Admin)
    const batches = StorageService.get<Batch[]>(STORAGE_KEYS.BATCHES, []);
    batches.forEach(b => {
      if (isCenterAdmin && userCenterId && b.centerId !== userCenterId) return;
      if (isCountryAdmin && userCountryId && (!b.centerId || !countryCenterIds.has(b.centerId))) return;

      if (
        b.batchNumber.toLowerCase().includes(q) ||
        b.occupation.toLowerCase().includes(q)
      ) {
        results.push({
          id: b.id,
          type: 'batch',
          title: b.batchNumber,
          subtitle: `${b.occupation} • ${b.candidateCount} candidates`,
          badge: b.status,
          link: `/batches?search=${encodeURIComponent(b.batchNumber)}`
        });
      }
    });

    // Search Schedules (Scoped to center for Center Admin, or country for Country Admin)
    const schedules = StorageService.get<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    schedules.forEach(s => {
      if (isCenterAdmin && userCenterId && s.centerId !== userCenterId) return;
      if (isCountryAdmin && userCountryId && (!s.centerId || !countryCenterIds.has(s.centerId))) return;

      if (
        s.code.toLowerCase().includes(q) ||
        s.occupation.toLowerCase().includes(q) ||
        s.date.includes(q)
      ) {
        results.push({
          id: s.id,
          type: 'schedule',
          title: `${s.code} - ${s.occupation}`,
          subtitle: `Date: ${s.date} • ${s.timeSlot}`,
          badge: s.status,
          link: `/schedules?search=${encodeURIComponent(s.code)}`
        });
      }
    });

    // Search Countries (Global Admin sees all, Country Admin sees only their assigned country, skip for Center Admin)
    if (!isCenterAdmin) {
      const countries = StorageService.get<Country[]>(STORAGE_KEYS.COUNTRIES, []);
      countries.forEach(c => {
        if (isCountryAdmin && userCountryId && c.id !== userCountryId) return;

        if (
          c.nameEn.toLowerCase().includes(q) ||
          c.nameAr.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q)
        ) {
          results.push({
            id: c.id,
            type: 'country',
            title: `${c.flagEmoji} ${c.nameEn} (${c.code})`,
            subtitle: `${c.region} • ${c.totalCenters} Centers`,
            badge: c.status,
            link: `/countries?view=details&id=${c.id}`
          });
        }
      });
    }

    // Search Practical Tasks
    const tasks = StorageService.get<PracticalTask[]>(STORAGE_KEYS.TASKS, []);
    tasks.forEach(t => {
      if (
        t.code.toLowerCase().includes(q) ||
        t.titleEn.toLowerCase().includes(q) ||
        t.titleAr.toLowerCase().includes(q) ||
        t.occupation.toLowerCase().includes(q)
      ) {
        results.push({
          id: t.id,
          type: 'task',
          title: `${t.code} - ${t.titleEn}`,
          subtitle: `${t.occupation} • Level: ${t.difficulty}`,
          badge: t.status,
          link: `/tasks?search=${encodeURIComponent(t.code)}`
        });
      }
    });

    // Search Results (Scoped to center for Center Admin)
    const allResults = StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
    allResults.forEach(r => {
      if (isCenterAdmin && userCenterId && r.centerId !== userCenterId) return;

      if (
        (r.candidateName && r.candidateName.toLowerCase().includes(q)) ||
        (r.aproReference && r.aproReference.toLowerCase().includes(q)) ||
        (r.certificateNumber && r.certificateNumber.toLowerCase().includes(q))
      ) {
        results.push({
          id: r.id,
          type: 'result',
          title: `${r.candidateName || 'Result'} (${r.aproReference || '-'})`,
          subtitle: `Score: ${r.score}% • Grade: ${r.grade}`,
          badge: r.status,
          link: `/results`
        });
      }
    });

    // Search Complaints (Scoped to center for Center Admin)
    const complaints = StorageService.get<Complaint[]>(STORAGE_KEYS.COMPLAINTS, []);
    complaints.forEach(cp => {
      if (isCenterAdmin && userCenterId && cp.centerId && cp.centerId !== userCenterId) return;

      if (
        cp.complaintNumber.toLowerCase().includes(q) ||
        cp.subject.toLowerCase().includes(q) ||
        cp.reportedBy.toLowerCase().includes(q)
      ) {
        results.push({
          id: cp.id,
          type: 'complaint',
          title: `${cp.complaintNumber}: ${cp.subject}`,
          subtitle: `Reported by: ${cp.reportedBy}`,
          badge: cp.status,
          link: `/complaints`
        });
      }
    });

    return results.slice(0, 15);
  }
}
