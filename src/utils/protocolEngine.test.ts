import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAddresseeBlock,
  generateCorrespondenceNumber,
  selectProtocolFormulas,
  paginateCorrespondenceContent,
  mergeUniqueRecords,
} from './protocolEngine';
import { NumberingConfig, ProtocolPhrase, BordereauRow } from '../types/correspondence';

test('formatAddresseeBlock formats central Ministry of Justice addressee in Arabic and French', () => {
  const budgetDirector = {
    category: 'central' as const,
    ministryNameAr: 'وزارة العدل',
    ministryNameFr: 'Ministère de la Justice',
    directorateAr: 'مديرية الميزانية',
    directorateFr: 'Direction du Budget',
    roleTitleAr: 'مدير الميزانية بوزارة العدل',
    roleTitleFr: 'Directeur du Budget',
    institutionNameAr: 'وزارة العدل',
    institutionNameFr: 'Ministère de la Justice',
    cityAr: 'الرباط',
    cityFr: 'Rabat',
  };

  // Standard hierarchical routing via Minister
  const viaMinisterAr = formatAddresseeBlock(budgetDirector, 'ar', { directToOfficial: false });
  assert.deepEqual(viaMinisterAr.lines, ['إلى', 'السيد وزير العدل', 'مديرية الميزانية', 'الرباط']);

  // Direct routing to Budget Director
  const directAr = formatAddresseeBlock(budgetDirector, 'ar', { directToOfficial: true });
  assert.deepEqual(directAr.lines, ['إلى', 'السيد مدير الميزانية بوزارة العدل', 'الرباط']);

  // French routing
  const viaMinisterFr = formatAddresseeBlock(budgetDirector, 'fr', { directToOfficial: false });
  assert.deepEqual(viaMinisterFr.lines, [
    'A',
    'Monsieur le Ministre de la Justice',
    'Direction du Budget',
    'RABAT',
  ]);
});

test('formatAddresseeBlock formats local court official with optional supervisory line', () => {
  const chiefClerkSettat = {
    category: 'judicial_first_instance' as const,
    ministryNameAr: 'وزارة العدل',
    ministryNameFr: 'Ministère de la Justice',
    institutionNameAr: 'المحكمة الابتدائية بسطات',
    institutionNameFr: 'au Tribunal de Première Instance de Settat',
    roleTitleAr: 'رئيس كتابة الضبط',
    roleTitleFr: 'Chef du Greffe',
    cityAr: 'سطات',
    cityFr: 'Settat',
  };

  const result = formatAddresseeBlock(chiefClerkSettat, 'ar', {
    useSupervisoryRouting: true,
    customSupervisoryLine: 'تحت إشراف السيد رئيس المحكمة الابتدائية بسطات',
  });

  assert.deepEqual(result.lines, ['إلى', 'السيد رئيس كتابة الضبط بالمحكمة الابتدائية بسطات']);
  assert.equal(result.supervisoryLine, 'تحت إشراف السيد رئيس المحكمة الابتدائية بسطات');
});

test('generateCorrespondenceNumber increments and skips existing numbers when preventDuplicates is enabled', () => {
  const config: NumberingConfig = {
    prefix: '',
    separator: '/',
    includeYear: true,
    yearPosition: 'end',
    padDigits: 4,
    nextSequenceNumber: 2619,
    useDocTypeCode: false,
    preventDuplicates: true,
  };

  const existing = [{ number: '2619/2026', docType: 'كتاب إداري رسمي' as const }];
  const generated = generateCorrespondenceNumber(config, existing, 2026);
  assert.equal(generated, '2620/2026');
});

test('selectProtocolFormulas picks protocol-appropriate opening and closing formulas', () => {
  const phrases: ProtocolPhrase[] = [
    {
      id: 'p1',
      type: 'opening',
      language: 'ar',
      protocolLevel: 1,
      context: 'reply',
      text: 'وبعد، علاقة بالموضوع والمرجع المشار إليهما أعلاه، يشرفني أن أوافي سيادتكم بـ',
      description: 'مخاطبة السيد الوزير',
    },
    {
      id: 'p2',
      type: 'closing',
      language: 'ar',
      protocolLevel: 1,
      context: 'reply',
      text: 'وتفضلوا، بقبول فائق الاحترام والتقدير. والسلام./.',
      description: 'خاتمة السيد الوزير',
    },
    {
      id: 'p3',
      type: 'closing',
      language: 'ar',
      protocolLevel: 4,
      context: 'company',
      text: 'والسلام./.',
      description: 'خاتمة الشركات',
    },
  ];

  const ministerFormulas = selectProtocolFormulas(phrases, 'ar', 1, 'reply');
  assert.ok(ministerFormulas.opening.includes('سيادتكم'));
  assert.equal(ministerFormulas.closing, 'وتفضلوا، بقبول فائق الاحترام والتقدير. والسلام./.');

  const companyFormulas = selectProtocolFormulas(phrases, 'ar', 4, 'company');
  assert.equal(companyFormulas.closing, 'والسلام./.');
});

test('paginateCorrespondenceContent splits long Bordereau rows across multiple A4 pages', () => {
  const rows: BordereauRow[] = Array.from({ length: 12 }, (_, idx) => ({
    id: `r-${idx + 1}`,
    orderNumber: idx + 1,
    documentNature: `وثيقة رقم ${idx + 1}`,
    copiesCount: '01',
    observations: 'قصد الدراسة وإبداء الرأي',
  }));

  const pages = paginateCorrespondenceContent('', rows, true, { bordereauRowsPerPage: 5 });
  assert.equal(pages.length, 3);
  assert.equal(pages[0].bordereauRowsSubset.length, 5);
  assert.equal(pages[1].bordereauRowsSubset.length, 5);
  assert.equal(pages[2].bordereauRowsSubset.length, 2);
  assert.equal(pages[0].includeSignatureBlock, false);
  assert.equal(pages[2].includeSignatureBlock, true);
});

test('mergeUniqueRecords prevents duplicates during backup import', () => {
  const existing = [
    { id: 'c1', name: 'مديرية الميزانية' },
    { id: 'c2', name: 'مديرية التحديث ونظم المعلومات' },
  ];
  const incoming = [
    { id: 'c2', name: 'مديرية التحديث ونظم المعلومات - محين' },
    { id: 'c3', name: 'مديرية الموارد البشرية' },
  ];

  const { merged, addedCount, updatedCount } = mergeUniqueRecords(existing, incoming);
  assert.equal(merged.length, 3);
  assert.equal(addedCount, 1);
  assert.equal(updatedCount, 1);
});
