import { StorageService, STORAGE_KEYS } from './storageService';
import { APROConfig, SerialConfig, Candidate, Result } from '../types';

export class SerialService {
  /**
   * Generates the next sequential, guaranteed-unique APRO Candidate Reference.
   * Format: {PREFIX}-{COUNTRY_CODE}-{SEQUENCE_NUM:6} e.g. APRO-SA-092825
   */
  static generateNextApro(countryCode: string = 'SA'): string {
    const aproConfig = StorageService.get<APROConfig>(STORAGE_KEYS.CONFIG_APRO, {
      format: '{PREFIX}-{COUNTRY_CODE}-{SEQUENCE_NUM}',
      prefix: 'APRO',
      sequence: 92825,
      sampleGenerated: 'APRO-SA-092825',
      status: 'ACTIVE',
      isConfigurable: true,
      note: 'Assessment reference identifier format (Configurable / TBC).'
    });

    const candidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const existingApros = new Set(candidates.map(c => c.aproReference?.toUpperCase()));

    let currentSeq = aproConfig.sequence || 92825;
    let candidateApro = '';
    let isUnique = false;

    // Increment until uniqueness is guaranteed across current database
    while (!isUnique) {
      currentSeq += 1;
      const paddedSeq = String(currentSeq).padStart(6, '0');
      candidateApro = `${aproConfig.prefix || 'APRO'}-${countryCode.toUpperCase()}-${paddedSeq}`;

      if (!existingApros.has(candidateApro.toUpperCase())) {
        isUnique = true;
      }
    }

    // Persist updated sequence counter back to config
    const updatedConfig: APROConfig = {
      ...aproConfig,
      sequence: currentSeq,
      sampleGenerated: candidateApro
    };
    StorageService.set(STORAGE_KEYS.CONFIG_APRO, updatedConfig);

    return candidateApro;
  }

  /**
   * Validates if a proposed APRO string is syntactically valid and unique
   */
  static validateApro(apro: string, excludeCandidateId?: string): { valid: boolean; reason?: string } {
    if (!apro || apro.trim().length === 0) {
      return { valid: false, reason: 'APRO reference is required' };
    }

    const trimmed = apro.trim().toUpperCase();
    // Pattern: 2-8 uppercase alphanumeric prefix, 2-4 country code, 4-8 digit sequence
    const aproRegex = /^[A-Z0-9]{2,8}-[A-Z0-9]{2,4}-\d{4,8}$/;
    if (!aproRegex.test(trimmed)) {
      return { 
        valid: false, 
        reason: 'APRO format must match pattern {PREFIX}-{COUNTRY}-{NUMBER} (e.g. APRO-SA-092825)' 
      };
    }

    const candidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const duplicate = candidates.find(c => 
      c.aproReference?.toUpperCase() === trimmed && c.id !== excludeCandidateId
    );

    if (duplicate) {
      return { 
        valid: false, 
        reason: `APRO ${trimmed} is already assigned to candidate ${duplicate.fullNameEn} (${duplicate.passportNumber})` 
      };
    }

    return { valid: true };
  }

  /**
   * Generates the next sequential, guaranteed-unique Competency Certificate Serial.
   * Format: CERT-{COUNTRY}-{YEAR}-{NUMBER:5} e.g. CERT-SA-2026-10494
   */
  static generateNextCertificateSerial(countryCode: string = 'SA'): string {
    const serialConfig = StorageService.get<SerialConfig>(STORAGE_KEYS.CONFIG_SERIAL, {
      prefix: 'CERT',
      startingNumber: 10001,
      currentNumber: 10493,
      format: 'CERT-{COUNTRY}-{YEAR}-{NUMBER:5}',
      status: 'ACTIVE',
      note: 'Serial tracking for digital competency certificates (Configurable / TBC).'
    });

    const results = StorageService.get<Result[]>(STORAGE_KEYS.RESULTS, []);
    const existingSerials = new Set(results.map(r => r.certificateNumber?.toUpperCase()).filter(Boolean));

    let currentNum = serialConfig.currentNumber || 10493;
    let candidateSerial = '';
    let isUnique = false;
    const year = new Date().getFullYear();

    while (!isUnique) {
      currentNum += 1;
      candidateSerial = `${serialConfig.prefix || 'CERT'}-${countryCode.toUpperCase()}-${year}-${currentNum}`;

      if (!existingSerials.has(candidateSerial.toUpperCase())) {
        isUnique = true;
      }
    }

    // Persist updated currentNumber back to config
    const updatedConfig: SerialConfig = {
      ...serialConfig,
      currentNumber: currentNum
    };
    StorageService.set(STORAGE_KEYS.CONFIG_SERIAL, updatedConfig);

    return candidateSerial;
  }

  /**
   * Generates the next unique Digital Skill ID Card Number.
   * Format: IDC-{COUNTRY}-{YEAR}-{NUMBER:5} e.g. IDC-SA-2026-00482
   */
  static generateNextIdCardSerial(countryCode: string = 'SA'): string {
    const candidates = StorageService.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    const existingIdCards = new Set(candidates.map(c => c.idCardNumber?.toUpperCase()).filter(Boolean));

    const year = new Date().getFullYear();
    let isUnique = false;
    let seq = 480;
    let idCardNumber = '';

    while (!isUnique) {
      seq += 1;
      const padded = String(seq).padStart(5, '0');
      idCardNumber = `IDC-${countryCode.toUpperCase()}-${year}-${padded}`;

      if (!existingIdCards.has(idCardNumber.toUpperCase())) {
        isUnique = true;
      }
    }

    return idCardNumber;
  }
}
