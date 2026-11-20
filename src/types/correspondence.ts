export type LanguageCode = 'ar' | 'fr';

export type RecipientCategoryType =
  | 'central'
  | 'judicial_appeal'
  | 'judicial_first_instance'
  | 'external';

export type ProtocolLevel = 1 | 2 | 3 | 4;

export type CorrespondenceStatus =
  | 'مسودة'
  | 'قيد التحرير'
  | 'جاهزة للمراجعة'
  | 'معتمدة'
  | 'صادرة'
  | 'مؤرشفة'
  | 'ملغاة';

export type DocumentType =
  | 'كتاب إداري رسمي'
  | 'إرسالية إدارية'
  | 'ورقة إرسال'
  | 'مذكرة توضيحية'
  | 'مذكرة مصلحية'
  | 'دورية'
  | 'مراسلة جوابية'
  | 'طلب معلومات'
  | 'طلب موافقة أو ترخيص'
  | 'إحالة وثائق أو ملفات'
  | 'جواب عن مراسلة واردة'
  | 'مراسلة تقنية'
  | 'مراسلة متعلقة بالصفقات العمومية'
  | 'مراسلة متعلقة بالميزانية'
  | 'مراسلة متعلقة بالتجهيزات والمعدات'
  | 'مراسلة متعلقة بالموارد البشرية'
  | 'مراسلة متعلقة بالتنظيم والتنسيق'
  | 'محضر تسلم (Décharge)'
  | 'مراسلة أخرى مخصصة';

export interface OfficerHistoryEntry {
  officerName: string;
  roleTitleAr: string;
  roleTitleFr: string;
  fromDate: string;
  toDate: string;
  notes?: string;
}

export interface RecipientContact {
  id: string;
  category: RecipientCategoryType;
  parentOrgId?: string;
  ministryNameAr: string;
  ministryNameFr: string;
  directorateAr?: string;
  directorateFr?: string;
  divisionAr?: string;
  divisionFr?: string;
  serviceAr?: string;
  serviceFr?: string;
  institutionNameAr: string;
  institutionNameFr: string;
  roleTitleAr: string;
  roleTitleFr: string;
  officerName?: string;
  protocolLevel: ProtocolLevel;
  defaultSupervisoryRoleAr?: string;
  defaultSupervisoryRoleFr?: string;
  cityAr: string;
  cityFr: string;
  addressAr?: string;
  addressFr?: string;
  phone?: string;
  fax?: string;
  email?: string;
  active: boolean;
  lastVerifiedDate: string;
  verificationSource: string;
  notes?: string;
  officerHistory: OfficerHistoryEntry[];
}

export interface InstitutionalIdentityVersion {
  id: string;
  versionName: string;
  createdAt: string;
  isCurrent: boolean;
  headerImageUrl: string;
  footerImageUrl: string;
  headerImageFrUrl?: string;
  footerImageFrUrl?: string;
  useImageHeader: boolean;
  useImageFooter: boolean;
  headerHeightMm: number;
  footerHeightMm: number;
  headerMarginBottomMm: number;
  footerMarginTopMm: number;
  pageMarginTopMm: number;
  pageMarginBottomMm: number;
  pageMarginRightMm: number;
  pageMarginLeftMm: number;
  orgTitleAr: string;
  orgSubtitleAr: string;
  orgDepartmentAr: string;
  orgTitleFr: string;
  orgSubtitleFr: string;
  orgDepartmentFr: string;
  addressAr: string;
  addressFr: string;
  phone: string;
  fax: string;
  email: string;
}

export interface SignatureProfile {
  id: string;
  titleAr: string;
  titleFr: string;
  signerNameAr: string;
  signerNameFr: string;
  isDelegated: boolean;
  delegationTextAr?: string;
  delegationTextFr?: string;
  showSignerName: boolean;
  showManualSignatureSpace: boolean;
  signatureImageUrl?: string;
  stampImageUrl?: string;
  showSignatureImage: boolean;
  showStampImage: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface AttachmentItem {
  id: string;
  name: string;
  description?: string;
  pagesCount: number;
  copiesCount: number;
  fileType: 'PDF' | 'Word' | 'Excel' | 'Image' | 'Table' | 'Other';
  fileDataUrl?: string;
  notes?: string;
}

export interface BordereauRow {
  id: string;
  orderNumber: number;
  documentNature: string;
  copiesCount: string;
  observations: string;
  purposeTag?:
    | 'للإخبار'
    | 'للإدلاء بالرأي'
    | 'للدراسة'
    | 'للمصادقة'
    | 'للتأشير'
    | 'لاتخاذ المتعين'
    | 'للحفظ'
    | 'للإرجاع بعد التأشير'
    | 'لكل غاية مفيدة'
    | 'قصد الإنجاز والموافاة';
}

export interface TechnicalTableData {
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  footerSummaryRows?: { label: string; value: string }[];
}

export interface RevisionLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  statusAfter: CorrespondenceStatus;
  summary: string;
}

export interface CorrespondenceDocument {
  id: string;
  number: string;
  numberLocked: boolean;
  dateGrego: string;
  dateHijri?: string;
  showHijriDate: boolean;
  cityAr: string;
  cityFr: string;
  showCityDateLine: boolean;
  showOutgoingStampBox: boolean;
  language: LanguageCode;
  docType: DocumentType;
  status: CorrespondenceStatus;
  recipientId: string;
  recipientCategory: RecipientCategoryType;
  protocolLevel: ProtocolLevel;
  // Snapshot of recipient lines so changing contact later doesn't alter historical docs
  addresseeLinesAr: string[];
  addresseeLinesFr: string[];
  supervisoryLineAr?: string;
  supervisoryLineFr?: string;
  useSupervisoryLine: boolean;
  subject: string;
  reference: string;
  showReference: boolean;
  basmalaText: string;
  showBasmala: boolean;
  salutationText: string;
  showSalutation: boolean;
  openingTransition: string;
  bodyText: string;
  closingText: string;
  signatureProfileId: string;
  signatureTitleSnapshotAr: string;
  signatureTitleSnapshotFr: string;
  signatureNameSnapshotAr: string;
  signatureNameSnapshotFr: string;
  attachments: AttachmentItem[];
  bordereauIntroText?: string;
  bordereauRows: BordereauRow[];
  technicalTables: TechnicalTableData[];
  internalNotes: string;
  // Formatting overrides
  fontFamilyAr: string;
  fontFamilyFr: string;
  customFontUrl?: string;
  fontSizePt: number;
  lineHeight: number;
  firstLineIndentMm?: number;
  paragraphSpacingPt?: number;
  showSenderHeader?: boolean;
  textAlign: 'justify' | 'right' | 'left' | 'center';
  repeatHeaderOnMultiPage: boolean;
  showPageNumbers: boolean;
  // Linking to other correspondence
  linkedParentId?: string;
  linkedRelationType?: 'جواب' | 'تذكير' | 'مراسلة تكميلية' | 'إحالة وثائق إضافية';
  templateIdUsed?: string;
  // Locked institutional identity version snapshot
  identitySnapshot: InstitutionalIdentityVersion;
  createdAt: string;
  updatedAt: string;
  revisionHistory: RevisionLogEntry[];
}

export type TemplateApprovalStatus =
  | 'معتمد'
  | 'مرجعي للاستئناس'
  | 'قيد المراجعة'
  | 'قديم'
  | 'ملغى';

export interface ReferenceTemplate {
  id: string;
  title: string;
  code: string;
  status: TemplateApprovalStatus;
  language: LanguageCode;
  docType: DocumentType;
  recipientCategory: RecipientCategoryType;
  targetRecipientRoleAr: string;
  targetRecipientRoleFr: string;
  protocolLevel: ProtocolLevel;
  addresseeFormatAr: string[];
  addresseeFormatFr: string[];
  supervisoryLineAr?: string;
  defaultSubject: string;
  defaultReference: string;
  salutation: string;
  openingFormula: string;
  bodyTemplate: string;
  closingFormula: string;
  defaultAttachments: string[];
  defaultBordereauRows?: BordereauRow[];
  defaultTechnicalTable?: TechnicalTableData;
  // Visual & structural analysis from real Settat sample
  sourceFileName: string;
  sourceAssetUrl: string;
  sourceType: 'PDF' | 'Image' | 'Word' | 'Gmail' | 'Drive' | 'System';
  originalDate: string;
  originalOutgoingNumber: string;
  detectedFontFamily: string;
  detectedFontSizePt: number;
  detectedLineHeight: number;
  visualAnalysisNotes: string;
  linguisticAnalysisNotes: string;
  extractedRawText: string;
}

export interface ProtocolPhrase {
  id: string;
  type: 'opening' | 'closing' | 'transition';
  language: LanguageCode;
  protocolLevel: ProtocolLevel;
  context: 'initial' | 'reply' | 'transmission' | 'reminder' | 'company';
  text: string;
  description: string;
}

export interface NumberingConfig {
  prefix: string;
  separator: string;
  includeYear: boolean;
  yearPosition: 'start' | 'end';
  padDigits: number;
  nextSequenceNumber: number;
  useDocTypeCode: boolean;
  preventDuplicates: boolean;
}

export interface CustomUploadedFont {
  id: string;
  name: string;
  fileName: string;
  dataUrl: string;
  language: LanguageCode;
  uploadedAt: string;
}
