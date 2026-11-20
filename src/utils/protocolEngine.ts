import {
  RecipientContact,
  LanguageCode,
  NumberingConfig,
  CorrespondenceDocument,
  ProtocolPhrase,
  ProtocolLevel,
  BordereauRow,
} from '../types/correspondence';

/**
 * Formats the official addressee block (صياغة المرسل إليه) according to the authentic
 * Settat Provincial Directorate of Justice correspondence conventions (2020-2026).
 */
export function formatAddresseeBlock(
  contact: Pick<
    RecipientContact,
    | 'category'
    | 'ministryNameAr'
    | 'ministryNameFr'
    | 'directorateAr'
    | 'directorateFr'
    | 'divisionAr'
    | 'divisionFr'
    | 'serviceAr'
    | 'serviceFr'
    | 'institutionNameAr'
    | 'institutionNameFr'
    | 'roleTitleAr'
    | 'roleTitleFr'
    | 'cityAr'
    | 'cityFr'
    | 'addressAr'
    | 'addressFr'
  >,
  language: LanguageCode,
  options?: {
    directToOfficial?: boolean;
    useSupervisoryRouting?: boolean;
    customSupervisoryLine?: string;
  }
): {
  lines: string[];
  supervisoryLine?: string;
} {
  if (language === 'fr') {
    const lines: string[] = ['A'];
    if (contact.category === 'central') {
      if (options?.directToOfficial && contact.roleTitleFr && !contact.roleTitleFr.toLowerCase().includes('ministre')) {
        lines.push(`Monsieur le ${contact.roleTitleFr}`);
        if (contact.directorateFr) lines.push(contact.directorateFr);
        if (contact.divisionFr) lines.push(contact.divisionFr);
        if (contact.serviceFr) lines.push(contact.serviceFr);
      } else {
        lines.push('Monsieur le Ministre de la Justice');
        if (contact.directorateFr) lines.push(contact.directorateFr);
        if (contact.divisionFr) lines.push(contact.divisionFr);
        if (contact.serviceFr) lines.push(contact.serviceFr);
      }
      if (contact.cityFr) lines.push(contact.cityFr.toUpperCase());
    } else if (contact.category === 'external') {
      lines.push(`Monsieur le ${contact.roleTitleFr || 'Directeur de la société'}`);
      if (contact.institutionNameFr) lines.push(contact.institutionNameFr);
      if (contact.addressFr) lines.push(contact.addressFr);
      if (contact.cityFr) lines.push(contact.cityFr.toUpperCase());
    } else {
      lines.push(`Monsieur le ${contact.roleTitleFr} ${contact.institutionNameFr}`);
      if (contact.cityFr) lines.push(contact.cityFr);
    }

    const supervisoryLine =
      options?.useSupervisoryRouting && options?.customSupervisoryLine
        ? options.customSupervisoryLine
        : undefined;

    return { lines, supervisoryLine };
  }

  // Arabic formatting matching Settat official samples
  const lines: string[] = ['إلى'];

  if (contact.category === 'central') {
    // In Settat samples, central correspondence either goes via "السيد وزير العدل / مديرية ..."
    // or directly to "السيد مدير ..." / "السيد الكاتب العام" when selected directly
    if (options?.directToOfficial && !contact.roleTitleAr.includes('وزير العدل')) {
      lines.push(`السيد ${contact.roleTitleAr}`);
      const directorateCore = contact.directorateAr?.replace(/^مديرية\s+/, '').trim() || '';
      if (
        contact.directorateAr &&
        !contact.roleTitleAr.includes(contact.directorateAr) &&
        (!directorateCore || !contact.roleTitleAr.includes(directorateCore))
      ) {
        lines.push(contact.directorateAr);
      }
      if (contact.divisionAr && !contact.roleTitleAr.includes(contact.divisionAr)) {
        lines.push(contact.divisionAr);
      }
      if (contact.serviceAr && !contact.roleTitleAr.includes(contact.serviceAr)) {
        lines.push(contact.serviceAr);
      }
    } else {
      lines.push('السيد وزير العدل');
      if (contact.directorateAr) lines.push(contact.directorateAr);
      if (contact.divisionAr) lines.push(contact.divisionAr);
      if (contact.serviceAr) lines.push(contact.serviceAr);
    }
    if (contact.cityAr) lines.push(contact.cityAr);
  } else if (contact.category === 'external') {
    if (contact.institutionNameAr && !contact.roleTitleAr.includes(contact.institutionNameAr)) {
      lines.push(`السيد ${contact.roleTitleAr} ${contact.institutionNameAr}`);
    } else {
      lines.push(`السيد ${contact.roleTitleAr}`);
    }
    if (contact.addressFr || contact.addressAr) {
      lines.push((contact.addressAr || contact.addressFr)!);
    }
    if (contact.cityAr) lines.push(contact.cityAr);
  } else {
    // Judicial appeal or first instance court
    const fullRole = contact.institutionNameAr && !contact.roleTitleAr.includes(contact.institutionNameAr)
      ? `السيد ${contact.roleTitleAr} ب${contact.institutionNameAr}`
      : `السيد ${contact.roleTitleAr}`;
    lines.push(fullRole);
  }

  const supervisoryLine =
    options?.useSupervisoryRouting && options?.customSupervisoryLine
      ? options.customSupervisoryLine
      : undefined;

  return { lines, supervisoryLine };
}

/**
 * Generates the next official outgoing correspondence number while preventing duplicates.
 */
export function generateCorrespondenceNumber(
  config: NumberingConfig,
  existingDocuments: Pick<CorrespondenceDocument, 'number' | 'docType'>[],
  year: number = new Date().getFullYear(),
  docTypeCode?: string
): string {
  const existingNumbers = new Set(existingDocuments.map((d) => d.number.trim()));
  let seq = Math.max(1, config.nextSequenceNumber);

  const buildCandidate = (n: number): string => {
    const padded = String(n).padStart(config.padDigits, '0');
    const parts: string[] = [];
    if (config.prefix.trim()) parts.push(config.prefix.trim());
    if (config.useDocTypeCode && docTypeCode) parts.push(docTypeCode);

    if (config.includeYear) {
      if (config.yearPosition === 'start') {
        parts.push(String(year));
        parts.push(padded);
      } else {
        parts.push(padded);
        parts.push(String(year));
      }
    } else {
      parts.push(padded);
    }
    return parts.join(config.separator || '/');
  };

  let candidate = buildCandidate(seq);
  if (config.preventDuplicates) {
    while (existingNumbers.has(candidate)) {
      seq += 1;
      candidate = buildCandidate(seq);
    }
  }
  return candidate;
}

/**
 * Selects the recommended opening and closing formulas according to recipient protocol level,
 * language, and correspondence context.
 */
export function selectProtocolFormulas(
  phrases: ProtocolPhrase[],
  language: LanguageCode,
  protocolLevel: ProtocolLevel,
  context: 'initial' | 'reply' | 'transmission' | 'reminder' | 'company' = 'initial'
): {
  opening: string;
  closing: string;
} {
  const langPhrases = phrases.filter((p) => p.language === language);

  const matchingOpening =
    langPhrases.find(
      (p) => p.type === 'opening' && p.protocolLevel === protocolLevel && p.context === context
    ) ||
    langPhrases.find((p) => p.type === 'opening' && p.protocolLevel === protocolLevel) ||
    langPhrases.find((p) => p.type === 'opening');

  const matchingClosing =
    langPhrases.find(
      (p) => p.type === 'closing' && p.protocolLevel === protocolLevel && p.context === context
    ) ||
    langPhrases.find((p) => p.type === 'closing' && p.protocolLevel === protocolLevel) ||
    langPhrases.find((p) => p.type === 'closing');

  return {
    opening: matchingOpening?.text || '',
    closing: matchingClosing?.text || '',
  };
}

/**
 * Paginates long correspondence body paragraphs and tables across multiple A4 sheets
 * so that paragraphs and table rows are never clipped and the signature block is kept intact.
 */
export interface PaginatedSheetContent {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  paragraphs: string[];
  bordereauRowsSubset: BordereauRow[];
  includeSignatureBlock: boolean;
  includeAttachmentsBlock: boolean;
}

export function paginateCorrespondenceContent(
  bodyText: string,
  bordereauRows: BordereauRow[],
  isBordereau: boolean,
  options?: {
    firstPageMaxChars?: number;
    subsequentPageMaxChars?: number;
    bordereauRowsPerPage?: number;
  }
): PaginatedSheetContent[] {
  const firstPageMaxChars = options?.firstPageMaxChars ?? 1350;
  const subsequentPageMaxChars = options?.subsequentPageMaxChars ?? 1950;
  const rowsPerPage = options?.bordereauRowsPerPage ?? 8;

  if (isBordereau) {
    const safeRows = bordereauRows.length > 0 ? bordereauRows : [];
    if (safeRows.length <= rowsPerPage) {
      return [
        {
          pageNumber: 1,
          totalPages: 1,
          isFirstPage: true,
          isLastPage: true,
          paragraphs: [],
          bordereauRowsSubset: safeRows,
          includeSignatureBlock: true,
          includeAttachmentsBlock: false,
        },
      ];
    }

    const chunks: BordereauRow[][] = [];
    for (let i = 0; i < safeRows.length; i += rowsPerPage) {
      chunks.push(safeRows.slice(i, i + rowsPerPage));
    }

    return chunks.map((chunk, idx) => ({
      pageNumber: idx + 1,
      totalPages: chunks.length,
      isFirstPage: idx === 0,
      isLastPage: idx === chunks.length - 1,
      paragraphs: [],
      bordereauRowsSubset: chunk,
      includeSignatureBlock: idx === chunks.length - 1,
      includeAttachmentsBlock: false,
    }));
  }

  const rawParagraphs = bodyText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParagraphs.length === 0) {
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        paragraphs: [''],
        bordereauRowsSubset: [],
        includeSignatureBlock: true,
        includeAttachmentsBlock: true,
      },
    ];
  }

  const pages: string[][] = [];
  let currentParagraphs: string[] = [];
  let currentCharCount = 0;

  for (const para of rawParagraphs) {
    const limit = pages.length === 0 ? firstPageMaxChars : subsequentPageMaxChars;
    if (currentParagraphs.length > 0 && currentCharCount + para.length > limit) {
      pages.push(currentParagraphs);
      currentParagraphs = [para];
      currentCharCount = para.length;
    } else {
      currentParagraphs.push(para);
      currentCharCount += para.length;
    }
  }

  if (currentParagraphs.length > 0) {
    pages.push(currentParagraphs);
  }

  return pages.map((paras, index) => ({
    pageNumber: index + 1,
    totalPages: pages.length,
    isFirstPage: index === 0,
    isLastPage: index === pages.length - 1,
    paragraphs: paras,
    bordereauRowsSubset: [],
    includeSignatureBlock: index === pages.length - 1,
    includeAttachmentsBlock: index === pages.length - 1,
  }));
}

/**
 * Deduplicates imported records by ID or unique composite key during backup restoration.
 */
export function mergeUniqueRecords<T extends { id: string }>(
  existing: T[],
  incoming: T[],
  uniqueKeyFn?: (item: T) => string
): { merged: T[]; addedCount: number; updatedCount: number } {
  const map = new Map<string, T>();
  const getKey = uniqueKeyFn || ((item: T) => item.id);

  for (const item of existing) {
    map.set(getKey(item), item);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const item of incoming) {
    const key = getKey(item);
    if (map.has(key)) {
      updatedCount += 1;
    } else {
      addedCount += 1;
    }
    map.set(key, item);
  }

  return {
    merged: Array.from(map.values()),
    addedCount,
    updatedCount,
  };
}
