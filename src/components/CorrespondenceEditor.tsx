import React, { useState, useMemo } from 'react';
import {
  CorrespondenceDocument,
  RecipientContact,
  ReferenceTemplate,
  SignatureProfile,
  ProtocolPhrase,
  NumberingConfig,
  InstitutionalIdentityVersion,
  CustomUploadedFont,
  DocumentType,
  CorrespondenceStatus,
  RecipientCategoryType,
  LanguageCode,
  BordereauRow,
  TechnicalTableData,
  AttachmentItem,
} from '../types/correspondence';
import {
  formatAddresseeBlock,
  generateCorrespondenceNumber,
  selectProtocolFormulas,
} from '../utils/protocolEngine';
import { A4DocumentRenderer } from './A4DocumentRenderer';
import {
  Sparkles,
  Printer,
  Copy,
  Save,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Wand2,
  CheckCircle2,
  FileText,
  Table as TableIcon,
  Paperclip,
  Link2,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';

interface CorrespondenceEditorProps {
  document: CorrespondenceDocument;
  allDocuments: CorrespondenceDocument[];
  contacts: RecipientContact[];
  templates: ReferenceTemplate[];
  signatures: SignatureProfile[];
  phrases: ProtocolPhrase[];
  numberingConfig: NumberingConfig;
  currentIdentity: InstitutionalIdentityVersion;
  customFonts: CustomUploadedFont[];
  aiEnabled: boolean;
  onChangeDocument: (updated: CorrespondenceDocument) => void;
  onSaveDocument: (docToSave: CorrespondenceDocument, logAction?: string) => void;
  onDuplicateDocument: (sourceDoc: CorrespondenceDocument) => void;
  onTriggerPrint: (docToPrint: CorrespondenceDocument) => void;
  showWizardInitially?: boolean;
  onCloseWizard?: () => void;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'كتاب إداري رسمي',
  'إرسالية إدارية',
  'ورقة إرسال',
  'مذكرة توضيحية',
  'مذكرة مصلحية',
  'دورية',
  'مراسلة جوابية',
  'طلب معلومات',
  'طلب موافقة أو ترخيص',
  'إحالة وثائق أو ملفات',
  'جواب عن مراسلة واردة',
  'مراسلة تقنية',
  'مراسلة متعلقة بالصفقات العمومية',
  'مراسلة متعلقة بالميزانية',
  'مراسلة متعلقة بالتجهيزات والمعدات',
  'مراسلة متعلقة بالموارد البشرية',
  'مراسلة متعلقة بالتنظيم والتنسيق',
  'محضر تسلم (Décharge)',
  'مراسلة أخرى مخصصة',
];

const STATUS_LIST: CorrespondenceStatus[] = [
  'مسودة',
  'قيد التحرير',
  'جاهزة للمراجعة',
  'معتمدة',
  'صادرة',
  'مؤرشفة',
  'ملغاة',
];

const BORDEREAU_PURPOSES: NonNullable<BordereauRow['purposeTag']>[] = [
  'قصد الإنجاز والموافاة',
  'للإخبار',
  'للإدلاء بالرأي',
  'للدراسة',
  'للمصادقة',
  'للتأشير',
  'لاتخاذ المتعين',
  'للحفظ',
  'للإرجاع بعد التأشير',
  'لكل غاية مفيدة',
];

export const CorrespondenceEditor: React.FC<CorrespondenceEditorProps> = ({
  document: doc,
  allDocuments,
  contacts,
  templates,
  signatures,
  phrases,
  numberingConfig,
  currentIdentity,
  customFonts,
  aiEnabled,
  onChangeDocument,
  onSaveDocument,
  onDuplicateDocument,
  onTriggerPrint,
  showWizardInitially = false,
  onCloseWizard,
}) => {
  const [showWizard, setShowWizard] = useState<boolean>(showWizardInitially);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  React.useEffect(() => {
    if (showWizardInitially) {
      setWizardStep(1);
      setShowWizard(true);
    }
  }, [showWizardInitially, doc.id]);
  const [wizardCategory, setWizardCategory] = useState<RecipientCategoryType>(
    doc.recipientCategory || 'central'
  );
  const [wizardContactId, setWizardContactId] = useState<string>(
    doc.recipientId || contacts[0]?.id || ''
  );
  const [wizardDirectMode, setWizardDirectMode] = useState<boolean>(false);
  const [wizardSupervisory, setWizardSupervisory] = useState<boolean>(false);
  const [wizardLang, setWizardLang] = useState<LanguageCode>(doc.language || 'ar');
  const [wizardDocType, setWizardDocType] = useState<DocumentType>(
    doc.docType || 'كتاب إداري رسمي'
  );

  // Editor active sub-panel
  const [activeTab, setActiveTab] = useState<
    'content' | 'recipient' | 'tables_bordereau' | 'formatting' | 'ai'
  >('content');
  const [previewScale, setPreviewScale] = useState<number>(0.64);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // AI Assistant state
  const [aiMode, setAiMode] = useState<
    | 'draft'
    | 'rephrase'
    | 'grammar'
    | 'summarize_subject'
    | 'suggest_closings'
    | 'translate'
    | 'extract_bordereau'
  >('draft');
  const [aiPromptNotes, setAiPromptNotes] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    suggestedSubject?: string;
    suggestedOpening?: string;
    suggestedBody?: string;
    suggestedClosing?: string;
    alternatives?: string[];
    protocolNotes?: string;
  } | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === doc.recipientId),
    [contacts, doc.recipientId]
  );

  const activeSignature = useMemo(
    () =>
      signatures.find((s) => s.id === doc.signatureProfileId) || signatures[0],
    [signatures, doc.signatureProfileId]
  );

  // Filtered contacts and templates for the 4-step wizard
  const wizardContacts = useMemo(
    () => contacts.filter((c) => c.category === wizardCategory && c.active),
    [contacts, wizardCategory]
  );

  const wizardSuggestedTemplates = useMemo(() => {
    return templates.filter(
      (t) =>
        t.language === wizardLang &&
        (t.recipientCategory === wizardCategory ||
          t.docType === wizardDocType ||
          t.status === 'معتمد')
    );
  }, [templates, wizardLang, wizardCategory, wizardDocType]);

  const updateField = <K extends keyof CorrespondenceDocument>(
    key: K,
    value: CorrespondenceDocument[K]
  ) => {
    onChangeDocument({
      ...doc,
      [key]: value,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectContactInEditor = (
    contactId: string,
    directToOfficial: boolean = false,
    useSupervisory: boolean = doc.useSupervisoryLine
  ) => {
    const target = contacts.find((c) => c.id === contactId);
    if (!target) return;

    const addrAr = formatAddresseeBlock(target, 'ar', {
      directToOfficial,
      useSupervisoryRouting: useSupervisory,
      customSupervisoryLine: target.defaultSupervisoryRoleAr,
    });
    const addrFr = formatAddresseeBlock(target, 'fr', {
      directToOfficial,
      useSupervisoryRouting: useSupervisory,
      customSupervisoryLine: target.defaultSupervisoryRoleFr,
    });

    const formulas = selectProtocolFormulas(
      phrases,
      doc.language,
      target.protocolLevel,
      target.category === 'external' ? 'company' : 'initial'
    );

    onChangeDocument({
      ...doc,
      recipientId: target.id,
      recipientCategory: target.category,
      protocolLevel: target.protocolLevel,
      addresseeLinesAr: addrAr.lines,
      addresseeLinesFr: addrFr.lines,
      supervisoryLineAr: target.defaultSupervisoryRoleAr || '',
      supervisoryLineFr: target.defaultSupervisoryRoleFr || '',
      useSupervisoryLine: useSupervisory && Boolean(target.defaultSupervisoryRoleAr),
      closingText: doc.closingText || formulas.closing,
      updatedAt: new Date().toISOString(),
    });
  };

  const applyTemplateToDocument = (tpl: ReferenceTemplate, contactOverride?: RecipientContact) => {
    const contact = contactOverride || selectedContact || contacts[0];
    const addrAr =
      tpl.addresseeFormatAr?.length > 0 && !contactOverride
        ? tpl.addresseeFormatAr
        : formatAddresseeBlock(contact, 'ar', {
            directToOfficial: wizardDirectMode,
            useSupervisoryRouting: wizardSupervisory,
            customSupervisoryLine: contact.defaultSupervisoryRoleAr,
          }).lines;

    const addrFr =
      tpl.addresseeFormatFr?.length > 0 && !contactOverride
        ? tpl.addresseeFormatFr
        : formatAddresseeBlock(contact, 'fr', {
            directToOfficial: wizardDirectMode,
            useSupervisoryRouting: wizardSupervisory,
            customSupervisoryLine: contact.defaultSupervisoryRoleFr,
          }).lines;

    const nextNum = doc.numberLocked
      ? doc.number
      : generateCorrespondenceNumber(numberingConfig, allDocuments);

    const updated: CorrespondenceDocument = {
      ...doc,
      number: nextNum,
      language: tpl.language,
      docType: tpl.docType,
      recipientId: contact.id,
      recipientCategory: contact.category,
      protocolLevel: contact.protocolLevel,
      addresseeLinesAr: addrAr,
      addresseeLinesFr: addrFr,
      supervisoryLineAr:
        tpl.supervisoryLineAr || contact.defaultSupervisoryRoleAr || '',
      supervisoryLineFr: contact.defaultSupervisoryRoleFr || '',
      useSupervisoryLine: Boolean(
        tpl.supervisoryLineAr ||
          (wizardSupervisory && contact.defaultSupervisoryRoleAr)
      ),
      subject: tpl.defaultSubject,
      reference: tpl.defaultReference,
      showReference: Boolean(tpl.defaultReference.trim()),
      salutationText:
        tpl.salutation ||
        (tpl.language === 'ar' ? 'سلام تام بوجود مولانا الإمام،' : ''),
      showSalutation: tpl.language === 'ar' && tpl.docType !== 'ورقة إرسال',
      openingTransition:
        tpl.language === 'ar' && tpl.docType !== 'ورقة إرسال' ? 'وبعد،' : '',
      bodyText: tpl.bodyTemplate,
      closingText: tpl.closingFormula,
      attachments: (tpl.defaultAttachments || []).map((name, idx) => ({
        id: `att-${Date.now()}-${idx}`,
        name,
        pagesCount: 1,
        copiesCount: 1,
        fileType: 'PDF',
      })),
      bordereauIntroText:
        tpl.docType === 'ورقة إرسال'
          ? tpl.language === 'ar'
            ? 'تجدون رفقته /:'
            : ''
          : doc.bordereauIntroText,
      bordereauRows:
        tpl.defaultBordereauRows && tpl.defaultBordereauRows.length > 0
          ? tpl.defaultBordereauRows
          : doc.bordereauRows,
      technicalTables: tpl.defaultTechnicalTable
        ? [tpl.defaultTechnicalTable]
        : [],
      fontFamilyAr: tpl.detectedFontFamily || doc.fontFamilyAr || 'Amiri',
      fontSizePt: tpl.detectedFontSizePt || 13.5,
      lineHeight: tpl.detectedLineHeight || 1.8,
      templateIdUsed: tpl.id,
      identitySnapshot: currentIdentity,
      updatedAt: new Date().toISOString(),
    };

    onChangeDocument(updated);
    setShowWizard(false);
    if (onCloseWizard) onCloseWizard();
  };

  const handleFinishWizardWithoutTemplate = () => {
    const contact =
      contacts.find((c) => c.id === wizardContactId) || contacts[0];
    const addrAr = formatAddresseeBlock(contact, 'ar', {
      directToOfficial: wizardDirectMode,
      useSupervisoryRouting: wizardSupervisory,
      customSupervisoryLine: contact.defaultSupervisoryRoleAr,
    });
    const addrFr = formatAddresseeBlock(contact, 'fr', {
      directToOfficial: wizardDirectMode,
      useSupervisoryRouting: wizardSupervisory,
      customSupervisoryLine: contact.defaultSupervisoryRoleFr,
    });
    const formulas = selectProtocolFormulas(
      phrases,
      wizardLang,
      contact.protocolLevel,
      contact.category === 'external' ? 'company' : 'initial'
    );

    const updated: CorrespondenceDocument = {
      ...doc,
      language: wizardLang,
      docType: wizardDocType,
      recipientId: contact.id,
      recipientCategory: contact.category,
      protocolLevel: contact.protocolLevel,
      addresseeLinesAr: addrAr.lines,
      addresseeLinesFr: addrFr.lines,
      supervisoryLineAr: contact.defaultSupervisoryRoleAr || '',
      supervisoryLineFr: contact.defaultSupervisoryRoleFr || '',
      useSupervisoryLine:
        wizardSupervisory && Boolean(contact.defaultSupervisoryRoleAr),
      salutationText:
        wizardLang === 'ar' ? 'سلام تام بوجود مولانا الإمام،' : '',
      showSalutation: wizardLang === 'ar' && wizardDocType !== 'ورقة إرسال',
      openingTransition:
        wizardLang === 'ar' && wizardDocType !== 'ورقة إرسال' ? 'وبعد،' : '',
      bodyText: formulas.opening ? `${formulas.opening} ` : '',
      closingText: formulas.closing,
      bordereauIntroText:
        wizardDocType === 'ورقة إرسال' && wizardLang === 'ar'
          ? 'تجدون رفقته /:'
          : '',
      bordereauRows:
        wizardDocType === 'ورقة إرسال' && doc.bordereauRows.length === 0
          ? [
              {
                id: `br-${Date.now()}`,
                orderNumber: 1,
                documentNature:
                  wizardLang === 'ar'
                    ? 'ـ بيان البيوعات العقارية والتفويتات المسجلة خلال الشهر؛'
                    : "- État des actes enregistrés au cours du mois ;",
                copiesCount: wizardLang === 'ar' ? '01' : '01',
                observations:
                  wizardLang === 'ar'
                    ? 'قصد الإنجاز والموافاة'
                    : "J'ai l'honneur de vous transmettre le dossier ci-contre pour attribution.",
                purposeTag: 'قصد الإنجاز والموافاة',
              },
            ]
          : doc.bordereauRows,
      identitySnapshot: currentIdentity,
      updatedAt: new Date().toISOString(),
    };

    onChangeDocument(updated);
    setShowWizard(false);
    if (onCloseWizard) onCloseWizard();
  };

  const handleSaveClick = (statusOverride?: CorrespondenceStatus) => {
    const finalStatus = statusOverride || doc.status;
    const lockNumber =
      finalStatus === 'معتمدة' || finalStatus === 'صادرة' || doc.numberLocked;
    const toSave: CorrespondenceDocument = {
      ...doc,
      status: finalStatus,
      numberLocked: lockNumber,
      updatedAt: new Date().toISOString(),
    };
    onSaveDocument(
      toSave,
      statusOverride ? `تغيير الحالة إلى ${statusOverride}` : 'حفظ المراسلة'
    );
    setSaveToast(`تم حفظ المراسلة بنجاح (${toSave.number}) — الحالة: ${finalStatus}`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Export as Word (.doc) compatible with Microsoft Word with RTL/LTR and images
  const handleExportWordDoc = () => {
    const isFr = doc.language === 'fr';
    const dir = isFr ? 'ltr' : 'rtl';
    const align = isFr ? 'left' : 'right';
    const addresseeHtml = (isFr ? doc.addresseeLinesFr : doc.addresseeLinesAr)
      .map((l) => `<div style="text-align:center;font-weight:bold;font-size:14pt;">${l}</div>`)
      .join('');

    const bodyHtml = doc.bodyText
      .split(/\n+/)
      .filter(Boolean)
      .map(
        (p) =>
          `<p style="text-align:justify;font-size:${doc.fontSizePt}pt;line-height:1.8;text-indent:10mm;">${p}</p>`
      )
      .join('');

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40' dir='${dir}'>
      <head><meta charset='utf-8'><title>${doc.subject}</title></head>
      <body style="font-family:'${isFr ? doc.fontFamilyFr : doc.fontFamilyAr}',serif;direction:${dir};text-align:${align};padding:15mm;">
        <div style="text-align:center;border-bottom:2px solid #1e3a8a;padding-bottom:8px;margin-bottom:16px;">
          <div style="font-weight:bold;font-size:13pt;">${doc.identitySnapshot.orgTitleAr} - ${doc.identitySnapshot.orgSubtitleAr}</div>
          <div style="font-weight:bold;font-size:13pt;">${doc.identitySnapshot.orgDepartmentAr}</div>
          <div style="font-size:10pt;">${doc.identitySnapshot.orgDepartmentFr}</div>
        </div>
        <div style="margin-bottom:12px;font-weight:bold;">
          ${isFr ? `N° : ${doc.number} | ${doc.cityFr}, le ${doc.dateGrego}` : `الصادر الرقم: ${doc.number} | ${doc.cityAr} في: ${doc.dateGrego}`}
        </div>
        ${addresseeHtml}
        ${
          doc.useSupervisoryLine && doc.supervisoryLineAr
            ? `<div style="text-align:center;font-weight:bold;text-decoration:underline;margin-top:4px;">${
                isFr ? doc.supervisoryLineFr : doc.supervisoryLineAr
              }</div>`
            : ''
        }
        <br/>
        <div style="font-weight:bold;font-size:${doc.fontSizePt}pt;margin-bottom:6px;">
          <u>${isFr ? 'Objet :' : 'الموضوع :'}</u> ${doc.subject}
        </div>
        ${
          doc.showReference && doc.reference
            ? `<div style="font-weight:bold;font-size:${doc.fontSizePt}pt;margin-bottom:10px;"><u>${
                isFr ? 'Référence :' : 'المرجع :'
              }</u> ${doc.reference}</div>`
            : ''
        }
        ${
          doc.showSalutation && doc.salutationText
            ? `<div style="text-align:center;font-weight:bold;font-size:${doc.fontSizePt}pt;margin:12px 0;">${doc.salutationText}</div>`
            : ''
        }
        ${
          doc.openingTransition
            ? `<div style="font-weight:bold;font-size:${doc.fontSizePt}pt;">${doc.openingTransition}</div>`
            : ''
        }
        ${bodyHtml}
        <p style="text-align:center;font-weight:bold;font-size:${doc.fontSizePt}pt;margin-top:18px;">${doc.closingText}</p>
        <div style="text-align:${isFr ? 'right' : 'left'};font-weight:bold;font-size:${doc.fontSizePt}pt;margin-top:24px;">
          ${isFr ? doc.signatureTitleSnapshotFr : doc.signatureTitleSnapshotAr}
        </div>
        <hr style="margin-top:40px;"/>
        <div style="text-align:center;font-size:9pt;">
          ${doc.identitySnapshot.addressAr}<br/>
          ${doc.identitySnapshot.addressFr}<br/>
          Tél: ${doc.identitySnapshot.phone} / Fax: ${doc.identitySnapshot.fax} / Email: ${doc.identitySnapshot.email}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `مراسلة_${doc.number.replace(/[\/\\]/g, '-')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Call Server-Side Gemini AI Assistant
  const handleRunAiAssistant = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: aiMode,
          language: doc.language,
          recipientRole:
            selectedContact?.roleTitleAr || doc.addresseeLinesAr.join(' '),
          recipientCategory: doc.recipientCategory,
          protocolLevel: doc.protocolLevel,
          docType: doc.docType,
          subject: doc.subject,
          reference: doc.reference,
          currentBody: aiPromptNotes
            ? `${doc.bodyText}\n\n[توجيهات إضافية من المحرر: ${aiPromptNotes}]`
            : doc.bodyText,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'تعذر الاتصال بالمساعد الإداري الذكي.');
      }
      setAiResult(data);
    } catch (err: any) {
      setAiError(err.message || 'حدث خطأ أثناء معالجة الطلب.');
    } finally {
      setAiLoading(false);
    }
  };

  // Preset technical tables from real Settat correspondence
  const addPresetTechnicalTable = (
    presetType: 'scanners' | 'active_directory' | 'hardware_replace' | 'french_it_lot'
  ) => {
    let newTable: TechnicalTableData;
    if (presetType === 'scanners') {
      newTable = {
        id: `tbl-${Date.now()}`,
        title: 'جدول الماسحات الضوئية المتسلمة بمحاكم الدائرة القضائية بسطات',
        columns: ['نوع الماسحة الضوئية', 'الطراز (Modèle)', 'الكمية المتسلمة', 'مقر التعيين'],
        rows: [
          ['ماسحة ضوئية من الحجم الصغير (A4)', 'Epson WorkForce DS-730N', '20', 'محاكم الدائرة القضائية بسطات'],
          ['ماسحة ضوئية من الحجم الكبير (A3)', 'Avision AD8120U', '12', 'محكمة الاستئناف والمحاكم الابتدائية'],
        ],
      };
    } else if (presetType === 'active_directory') {
      newTable = {
        id: `tbl-${Date.now()}`,
        title: 'الوضعية الحالية لنظام Active Directory بمحاكم الدائرة القضائية بسطات',
        columns: [
          'المقر القضائي',
          'عنوان IP للخادم',
          'اسم النطاق (Nom de domaine)',
          'إصدار نظام التشغيل',
          'وضعية التثبيت',
        ],
        rows: [
          ['محكمة الاستئناف بسطات', '10.28.0.50', 'ca-settat.justice.gov.ma', 'Windows Server 2016', 'مثبت ومفعل'],
          ['المحكمة الابتدائية بسطات', '10.28.4.50', 'tpi-settat.justice.gov.ma', 'Windows Server 2016', 'مثبت ومفعل'],
          ['المحكمة الابتدائية ببرشيد', '10.28.8.50', 'tpi-berrechid.justice.gov.ma', 'Windows Server 2016', 'مثبت ومفعل'],
          ['المحكمة الابتدائية بابن أحمد', '10.28.12.50', 'tpi-benahmed.justice.gov.ma', 'Windows Server 2016', 'مثبت ومفعل'],
        ],
      };
    } else if (presetType === 'french_it_lot') {
      newTable = {
        id: `tbl-${Date.now()}`,
        title: 'Tableau récapitulatif du matériel informatique et numéros de série',
        columns: ['Désignation', 'Modèle / Marque', 'N° de série (S/N)', 'Quantité', 'Affectation'],
        rows: [
          ['Ordinateur de bureau complet', 'ASUS ExpertCenter D9 SFF', 'SN-2026-SET-00142', '15', 'TPI Settat'],
          ['Scanner professionnel A4', 'Epson WorkForce DS-730N', 'SN-2026-SET-00891', '08', 'Cour d\'Appel Settat'],
          ['Imprimante Laser Réseau', 'HP LaserJet Pro M404dn', 'SN-2026-SET-00512', '10', 'TPI Berrechid & Ben Ahmed'],
        ],
      };
    } else {
      newTable = {
        id: `tbl-${Date.now()}`,
        title: 'جدول المقارنة التقنية للعتاد المعلوماتي المقترح في إطار الصفقة',
        columns: ['الحصة (Lot)', 'الطراز المتعاقد عليه في CPS', 'الطراز الحديث المقترح', 'الكمية'],
        rows: [
          ['الحصة 1: حواسيب مكتبية', 'ASUS ExpertCenter D8 SFF', 'ASUS ExpertCenter D9 SFF', '30'],
          ['الحصة 2: حواسيب محمولة', 'ASUS ExpertBook B2 Flip', 'ASUS ExpertBook B3 Flip', '15'],
        ],
      };
    }
    updateField('technicalTables', [...(doc.technicalTables || []), newTable]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 4-Stage Guided Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Wizard Header */}
            <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-amber-400" />
                  <span>معالج الإنشاء الذكي للمراسلات الرسمية — المديرية الإقليمية للعدل بسطات</span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  اختر الجهة المرسل إليها واللغة ليقترح عليك النظام صياغة المخاطب الرسمية والنموذج الأنسب
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWizard(false);
                  if (onCloseWizard) onCloseWizard();
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg"
                title="إغلاق المعالج"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-semibold">
              {[
                { step: 1, label: '1. تصنيف الجهة المرسل إليها' },
                { step: 2, label: '2. تحديد المخاطب وصيغة الإشراف' },
                { step: 3, label: '3. لغة المراسلة ونوع الوثيقة' },
                { step: 4, label: '4. اختيار النموذج المرجعي المعتمد' },
              ].map((item) => (
                <button
                  key={item.step}
                  onClick={() => setWizardStep(item.step as 1 | 2 | 3 | 4)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                    wizardStep === item.step
                      ? 'bg-[#1e3a8a] text-white'
                      : wizardStep > item.step
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-500'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Step Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    الخطوة 1: إلى أي صنف من الجهات توجه هذه المراسلة؟
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        id: 'central' as RecipientCategoryType,
                        title: 'الإدارة المركزية لوزارة العدل (الرباط)',
                        subtitle:
                          'السيد وزير العدل، الكتابة العامة، المفتشية العامة، المديريات المركزية والأقسام (القرار 1501.22)',
                        badge: 'المستوى البروتوكولي 1 - 2',
                      },
                      {
                        id: 'judicial_appeal' as RecipientCategoryType,
                        title: 'محكمة الاستئناف بسطات',
                        subtitle:
                          'السيد الرئيس الأول، السيد الوكيل العام للملك، رئاسة كتابة الضبط وكتابة النيابة العامة',
                        badge: 'الدائرة القضائية بسطات',
                      },
                      {
                        id: 'judicial_first_instance' as RecipientCategoryType,
                        title: 'المحاكم الابتدائية والمراكز القضائية (سطات، برشيد، ابن أحمد، البروج)',
                        subtitle:
                          'السادة رؤساء المحاكم، وكلاء الملك، رؤساء كتابة الضبط وكتابة النيابة العامة، القاضي المقيم بالبروج',
                        badge: 'محاكم الدائرة القضائية',
                      },
                      {
                        id: 'external' as RecipientCategoryType,
                        title: 'شركاء مؤسساتيون وشركات متعاقدة (صفقات وسندات طلب)',
                        subtitle:
                          'المؤسسة المحمدية للأعمال الاجتماعية، عمالة سطات، الخزينة الإقليمية، والشركات نائلة الصفقات',
                        badge: 'عربي / فرنسي',
                      },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setWizardCategory(cat.id);
                          const firstInCat = contacts.find((c) => c.category === cat.id);
                          if (firstInCat) setWizardContactId(firstInCat.id);
                          setWizardStep(2);
                        }}
                        className={`text-right p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                          wizardCategory === cat.id
                            ? 'border-[#1e3a8a] bg-blue-50/40'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 text-base">
                              {cat.title}
                            </span>
                            <span className="text-xs font-semibold text-blue-800">
                              {cat.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {cat.subtitle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    الخطوة 2: اختر المخاطب الرسمي وطريقة توجيه المراسلة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                    {wizardContacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setWizardContactId(c.id)}
                        className={`text-right p-3 rounded-lg border transition-all ${
                          wizardContactId === c.id
                            ? 'border-[#1e3a8a] bg-blue-50/60 ring-1 ring-[#1e3a8a]'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold text-sm text-slate-900">
                          السيد {c.roleTitleAr}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {c.institutionNameAr} · {c.cityAr}
                        </div>
                        {c.roleTitleFr && (
                          <div className="text-[11px] text-slate-500 mt-0.5" dir="ltr">
                            {c.roleTitleFr}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Addressing options */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800">
                      خيارات البروتوكول الإداري للمخاطب المختار:
                    </div>
                    {wizardCategory === 'central' && (
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!wizardDirectMode}
                          onChange={(e) => setWizardDirectMode(!e.target.checked)}
                          className="rounded border-slate-300 text-[#1e3a8a]"
                        />
                        <span>
                          توجيه المراسلة عبر الصيغة الهرمية الوزارية المعتمدة:{' '}
                          <strong>«إلى السيد وزير العدل / المديرية أو القسم المختص»</strong> (أو قم بإلغاء التحديد لمخاطبة السيد المدير مباشرة)
                        </span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wizardSupervisory}
                        onChange={(e) => setWizardSupervisory(e.target.checked)}
                        className="rounded border-slate-300 text-[#1e3a8a]"
                      />
                      <span>
                        إضافة عبارة التسلسل الإداري{' '}
                        <strong>«تحت إشراف السيد الرئيس الأول / رئيس المحكمة / وكيل الملك»</strong>{' '}
                        (معتمدة في أوراق الإرسال الموجهة لرؤساء كتابات الضبط والنيابة العامة)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      الخطوة 3: حدد لغة التحرير ونوع الوثيقة الإدارية
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setWizardLang('ar')}
                        className={`p-4 rounded-xl border-2 text-right ${
                          wizardLang === 'ar'
                            ? 'border-[#1e3a8a] bg-blue-50/40'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="font-bold text-base text-slate-900">
                          اللغة العربية (RTL — اتجاه يمين إلى يسار)
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          الصياغة الإدارية المغربية الرسمية («سلام تام بوجود مولانا الإمام، وبعد، ...»)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWizardLang('fr')}
                        className={`p-4 rounded-xl border-2 text-left ${
                          wizardLang === 'fr'
                            ? 'border-[#1e3a8a] bg-blue-50/40'
                            : 'border-slate-200'
                        }`}
                        dir="ltr"
                      >
                        <div className="font-bold text-base text-slate-900">
                          Langue Française (LTR — Gauche à droite)
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Correspondances techniques, marchés publics, bordereaux d'envoi et décharges
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      نوع الوثيقة الإدارية:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {DOCUMENT_TYPES.map((dt) => (
                        <button
                          key={dt}
                          type="button"
                          onClick={() => setWizardDocType(dt)}
                          className={`px-3 py-2 rounded-lg border text-xs font-semibold text-right transition-colors ${
                            wizardDocType === dt
                              ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {dt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">
                      الخطوة 4: النماذج الرسمية المقترحة من أرشيف المديرية الإقليمية بسطات
                    </h3>
                    <button
                      type="button"
                      onClick={handleFinishWizardWithoutTemplate}
                      className="text-xs font-bold text-[#1e3a8a] hover:underline"
                    >
                      تخطي النموذج وبدء مراسلة فارغة مهيأة للمخاطب ←
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {wizardSuggestedTemplates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-[#1e3a8a] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-bold text-emerald-700">{tpl.status}</span>
                            <span>·</span>
                            <span>{tpl.docType}</span>
                            <span>·</span>
                            <span>المصدر: {tpl.sourceFileName}</span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">{tpl.title}</div>
                          <div className="text-xs text-slate-600 line-clamp-1">
                            <strong>الموضوع:</strong> {tpl.defaultSubject}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const chosenContact = contacts.find(
                              (c) => c.id === wizardContactId
                            );
                            applyTemplateToDocument(tpl, chosenContact);
                          }}
                          className="shrink-0 bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
                        >
                          اعتماد هذا النموذج وفتحه للتحرير
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer Navigation */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() =>
                  setWizardStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)
                }
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <div className="flex items-center gap-2">
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setWizardStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4)
                    }
                    className="px-5 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-bold flex items-center gap-1"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishWizardWithoutTemplate}
                    className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    بدء التحرير المباشر بالمعطيات المختارة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setShowWizard(true);
            }}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Wand2 className="w-4 h-4 text-amber-700" />
            <span>معالج التوجيه السريع (4 خطوات)</span>
          </button>

          <div className="text-xs text-slate-600 hidden sm:flex items-center gap-1.5">
            <span className="font-bold text-slate-900 tabular-nums">
              رقم المراسلة: {doc.number}
            </span>
            <span>·</span>
            <span>{doc.docType}</span>
            <span>·</span>
            <span className="font-semibold text-[#1e3a8a]">{doc.status}</span>
          </div>
        </div>

        {/* Save, Export & Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={doc.status}
            onChange={(e) =>
              handleSaveClick(e.target.value as CorrespondenceStatus)
            }
            className="text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800"
            aria-label="حالة المراسلة"
          >
            {STATUS_LIST.map((st) => (
              <option key={st} value={st}>
                الحالة: {st}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleSaveClick()}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ المراسلة</span>
          </button>

          <button
            type="button"
            onClick={() => onDuplicateDocument(doc)}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
            title="إنشاء نسخة جديدة انطلاقاً من هذه المراسلة"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ</span>
          </button>

          <button
            type="button"
            onClick={handleExportWordDoc}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Word (.doc)</span>
          </button>

          <button
            type="button"
            onClick={() => onTriggerPrint(doc)}
            className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة / PDF رسمي (A4)</span>
          </button>
        </div>
      </div>

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="bg-emerald-900 text-white px-5 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-emerald-200">
            إغلاق
          </button>
        </div>
      )}

      {/* Main Split Workspace: Editor Form + Live A4 Sheet Preview */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left/Right Form Pane (6 Columns on Desktop) */}
        <div className="lg:col-span-6 flex flex-col border-l border-slate-200 bg-white overflow-hidden">
          {/* Sub-navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 overflow-x-auto shrink-0">
            {[
              { id: 'content', label: 'المتن والموضوع', icon: FileText },
              { id: 'recipient', label: 'المرسل إليه والترقيم', icon: Link2 },
              {
                id: 'tables_bordereau',
                label:
                  doc.docType === 'ورقة إرسال'
                    ? 'جدول ورقة الإرسال (3 أعمدة)'
                    : 'الجداول التقنية والمرفقات',
                icon: TableIcon,
              },
              { id: 'formatting', label: 'الخطوط والهوامش والتوقيع', icon: Sliders },
              ...(aiEnabled
                ? [{ id: 'ai', label: 'المساعد الإداري الذكي', icon: Sparkles }]
                : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white text-[#1e3a8a] border-[#1e3a8a]'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeTab === 'content' && (
              <div className="space-y-4">
                {/* Language & Document Type quick row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      لغة التحرير واتجاه الوثيقة
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateField('language', 'ar')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold ${
                          doc.language === 'ar'
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        العربية (RTL)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('language', 'fr')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold ${
                          doc.language === 'fr'
                            ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                            : 'bg-white text-slate-700 border-slate-300'
                        }`}
                      >
                        Français (LTR)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      نوع الوثيقة الرسمية
                    </label>
                    <select
                      value={doc.docType}
                      onChange={(e) =>
                        updateField('docType', e.target.value as DocumentType)
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white"
                    >
                      {DOCUMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {doc.language === 'fr'
                      ? 'Objet de la correspondance (الموضوع)'
                      : 'الموضوع (واضح، مختصر، ويعبر بدقة عن مضمون المراسلة)'}
                  </label>
                  <input
                    type="text"
                    dir={doc.language === 'fr' ? 'ltr' : 'rtl'}
                    value={doc.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    placeholder={
                      doc.language === 'fr'
                        ? "Ex: Rappel de la présentation de l'attestation de garantie."
                        : 'مثال: حول عقلنة اقتناء شهادات التوقيع الإلكتروني والتحقق من صحة البيانات المصرح بها.'
                    }
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
                  />
                </div>

                {/* Reference Field with Hide Toggle */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {doc.language === 'fr'
                        ? 'Référence (المرجع: مراسلة سابقة، دورية، صفقة، سند طلب)'
                        : 'المرجع (كتاب وزاري، منشور، دورية، صفقة عمومية، أو مراسلة سابقة)'}
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doc.showReference}
                        onChange={(e) =>
                          updateField('showReference', e.target.checked)
                        }
                        className="rounded border-slate-300 text-[#1e3a8a]"
                      />
                      <span>إظهار سطر المرجع في الوثيقة المطبوعة</span>
                    </label>
                  </div>
                  {doc.showReference && (
                    <textarea
                      rows={2}
                      dir={doc.language === 'fr' ? 'ltr' : 'rtl'}
                      value={doc.reference}
                      onChange={(e) => updateField('reference', e.target.value)}
                      placeholder={
                        doc.language === 'fr'
                          ? "Ex: Marché N° : 03/2024 relatif à l'Achat de Fournitures Informatiques."
                          : 'مثال: منشور السيد الكاتب العام لوزارة العدل عدد /1515ك.ع بتاريخ 31 غشت 2026.'
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium bg-white text-slate-900"
                    />
                  )}
                </div>

                {/* Ornamental Basmala & Salutation & Opening Formula */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={doc.showBasmala}
                        onChange={(e) => updateField('showBasmala', e.target.checked)}
                        className="rounded border-slate-300 text-[#1e3a8a]"
                      />
                      <span>إدراج البسملة الرسمية المشكولة في أعلى الوثيقة</span>
                    </label>
                    {doc.showBasmala && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateField('basmalaText', 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')
                          }
                          className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800"
                        >
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField('basmalaText', 'بسم الله الرحمن الرحيم')}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700"
                        >
                          بدون تشكيل
                        </button>
                      </div>
                    )}
                  </div>

                  {doc.docType !== 'ورقة إرسال' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            عبارة التحية الرسمية (وسط الصفحة)
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateField('salutationText', e.target.value);
                                  updateField('showSalutation', true);
                                }
                              }}
                              className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                            >
                              <option value="">صيغة التحية...</option>
                              <option value="سلام تام بوجود مولانا الإمام،">
                                سلام تام بوجود مولانا الإمام،
                              </option>
                              <option value="سلام تام بوجود مولانا الإمام المؤيد بالله،">
                                سلام تام بوجود مولانا الإمام المؤيد بالله،
                              </option>
                            </select>
                            <input
                              type="checkbox"
                              checked={doc.showSalutation}
                              onChange={(e) =>
                                updateField('showSalutation', e.target.checked)
                              }
                              title="إظهار أو إخفاء التحية"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          value={doc.salutationText}
                          onChange={(e) =>
                            updateField('salutationText', e.target.value)
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          مفتتح الانتقال للمتن + ديباجة جاهزة حسب البروتوكول
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            updateField(
                              'bodyText',
                              `${e.target.value} ${doc.bodyText}`
                            );
                          }}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        >
                          <option value="">
                            + إدراج صيغة افتتاحية رسمية حسب مستوى المخاطب...
                          </option>
                          {phrases
                            .filter(
                              (p) =>
                                p.type === 'opening' && p.language === doc.language
                            )
                            .map((p) => (
                              <option key={p.id} value={p.text}>
                                [مستوى {p.protocolLevel}] {p.text}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Body Textarea */}
                {doc.docType !== 'ورقة إرسال' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        متن المراسلة الرسمي (ينقسم تلقائياً على صفحات A4 متعددة عند الطول)
                      </label>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {doc.bodyText.length} حرف
                      </span>
                    </div>
                    <textarea
                      rows={10}
                      dir={doc.language === 'fr' ? 'ltr' : 'rtl'}
                      value={doc.bodyText}
                      onChange={(e) => updateField('bodyText', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-3.5 text-sm leading-relaxed text-slate-900 focus:border-[#1e3a8a] focus:outline-none"
                      placeholder="حرر نص المراسلة الإدارية هنا..."
                    />
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-950">
                    <div className="font-bold mb-1">
                      أنت تحرر الآن «ورقة إرسال / Bordereau d'envoi»
                    </div>
                    <p className="mb-2">
                      يتم تحرير عناصر ورقة الإرسال داخل الجدول الرسمي ذي الأعمدة الثلاثة (نوع المراسلات وتلخيص موضوعها | عدد المرفقات | ملاحظات).
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tables_bordereau')}
                      className="bg-amber-800 text-white px-3 py-1.5 rounded-md font-bold"
                    >
                      الانتقال إلى جدول ورقة الإرسال (3 أعمدة) ←
                    </button>
                  </div>
                )}

                {/* Closing Formula Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      عبارة الختام والاحترام البروتوكولية
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) updateField('closingText', e.target.value);
                      }}
                      className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-slate-50"
                    >
                      <option value="">اختيار خاتمة بروتوكولية معتمدة...</option>
                      {phrases
                        .filter(
                          (p) =>
                            p.type === 'closing' && p.language === doc.language
                        )
                        .map((p) => (
                          <option key={p.id} value={p.text}>
                            [مستوى {p.protocolLevel}] {p.text}
                          </option>
                        ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    dir={doc.language === 'fr' ? 'ltr' : 'rtl'}
                    value={doc.closingText}
                    onChange={(e) => updateField('closingText', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                {/* Internal Non-Printing Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    ملاحظات داخلية للأرشفة والتتبع (لا تظهر في الطباعة ولا في PDF)
                  </label>
                  <input
                    type="text"
                    value={doc.internalNotes}
                    onChange={(e) => updateField('internalNotes', e.target.value)}
                    placeholder="ملاحظات خاصة بالملف أو الموظف المكلف بالتتبع..."
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-1.5 text-xs text-slate-700"
                  />
                </div>
              </div>
            )}

            {activeTab === 'recipient' && (
              <div className="space-y-4">
                {/* Number & Date Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم الصادر (تلقائي أو يدوي)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        disabled={doc.numberLocked}
                        value={doc.number}
                        onChange={(e) => updateField('number', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums bg-white disabled:bg-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateField('numberLocked', !doc.numberLocked)
                        }
                        className="p-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
                        title={
                          doc.numberLocked
                            ? 'الرقم مقفل بعد الاعتماد (اضغط لفتح القفل)'
                            : 'قفل الرقم لمنع التغيير'
                        }
                      >
                        {doc.numberLocked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تاريخ المراسلة (الميلادي)
                    </label>
                    <input
                      type="date"
                      value={doc.dateGrego}
                      onChange={(e) => updateField('dateGrego', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white tabular-nums"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        التاريخ الهجري (اختياري)
                      </label>
                      <input
                        type="checkbox"
                        checked={doc.showHijriDate}
                        onChange={(e) =>
                          updateField('showHijriDate', e.target.checked)
                        }
                      />
                    </div>
                    <input
                      type="text"
                      value={doc.dateHijri || ''}
                      onChange={(e) => updateField('dateHijri', e.target.value)}
                      placeholder="مثال: 06 ربيع الأول 1448"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Outgoing Stamp Box & City/Date & Sender Header toggles */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doc.showOutgoingStampBox}
                      onChange={(e) =>
                        updateField('showOutgoingStampBox', e.target.checked)
                      }
                    />
                    <span>إظهار إطار ختم الصادر في أعلى اليمين (الصادر الرقم / التاريخ)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doc.showCityDateLine}
                      onChange={(e) =>
                        updateField('showCityDateLine', e.target.checked)
                      }
                    />
                    <span>إظهار سطر المكان والتاريخ (سطات في : ...)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(doc.showSenderHeader)}
                      onChange={(e) =>
                        updateField('showSenderHeader', e.target.checked)
                      }
                    />
                    <span>إظهار سطر المرسل: «من المدير الإقليمي للعدل بسطات»</span>
                  </label>
                </div>

                {/* Select Contact from Database */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    اختيار الجهة المرسل إليها من قاعدة بيانات التنظيم الهيكلي والمحاكم
                  </label>
                  <select
                    value={doc.recipientId}
                    onChange={(e) =>
                      handleSelectContactInEditor(e.target.value, false)
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
                  >
                    <optgroup label="أ. الإدارة المركزية لوزارة العدل (الرباط)">
                      {contacts
                        .filter((c) => c.category === 'central')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            السيد {c.roleTitleAr} ({c.directorateAr || 'وزارة العدل'})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="ب. محكمة الاستئناف بسطات">
                      {contacts
                        .filter((c) => c.category === 'judicial_appeal')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            السيد {c.roleTitleAr}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="ج. المحاكم الابتدائية والمراكز القضائية (سطات، برشيد، ابن أحمد، البروج)">
                      {contacts
                        .filter((c) => c.category === 'judicial_first_instance')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            السيد {c.roleTitleAr}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="د. شركاء مؤسساتيون وشركات متعاقدة">
                      {contacts
                        .filter((c) => c.category === 'external')
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.roleTitleAr} — {c.institutionNameAr}
                          </option>
                        ))}
                    </optgroup>
                  </select>

                  {selectedContact?.category === 'central' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectContactInEditor(selectedContact.id, false)
                        }
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-900 border border-blue-200"
                      >
                        صيغة: إلى السيد وزير العدل / {selectedContact.directorateAr}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectContactInEditor(selectedContact.id, true)
                        }
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-300"
                      >
                        صيغة مباشرة: إلى السيد {selectedContact.roleTitleAr}
                      </button>
                    </div>
                  )}

                  {/* Quick Denomination Evolution Toggle for Greffe / Parquet */}
                  {(doc.addresseeLinesAr.join(' ').includes('كتابة الضبط') ||
                    doc.addresseeLinesAr.join(' ').includes('النيابة العامة')) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[11px] font-semibold text-slate-600">
                        تطور التسمية الإدارية المعتمدة:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'addresseeLinesAr',
                            doc.addresseeLinesAr.map((l) =>
                              l
                                .replace('رئيس مصلحة كتابة الضبط', 'رئيس كتابة الضبط')
                                .replace('رئيس مصلحة كتابة النيابة العامة', 'رئيس كتابة النيابة العامة')
                            )
                          )
                        }
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-emerald-50 text-emerald-900 border border-emerald-200"
                      >
                        اعتماد التسمية الحديثة: «رئيس كتابة الضبط / النيابة العامة»
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'addresseeLinesAr',
                            doc.addresseeLinesAr.map((l) =>
                              l
                                .replace('رئيس كتابة الضبط', 'رئيس مصلحة كتابة الضبط')
                                .replace('رئيس كتابة النيابة العامة', 'رئيس مصلحة كتابة النيابة العامة')
                            )
                          )
                        }
                        className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-300"
                      >
                        التسمية السابقة: «رئيس مصلحة كتابة الضبط»
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct manual editing of Addressee Lines (Snapshot preserved per document) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      أسطر المخاطب بالعربية (كل سطر في سطر مستقل)
                    </label>
                    <textarea
                      rows={4}
                      dir="rtl"
                      value={doc.addresseeLinesAr.join('\n')}
                      onChange={(e) =>
                        updateField(
                          'addresseeLinesAr',
                          e.target.value.split('\n')
                        )
                      }
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      أسطر المخاطب بالفرنسية (Destinataire FR)
                    </label>
                    <textarea
                      rows={4}
                      dir="ltr"
                      value={doc.addresseeLinesFr.join('\n')}
                      onChange={(e) =>
                        updateField(
                          'addresseeLinesFr',
                          e.target.value.split('\n')
                        )
                      }
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Supervisory Line ("تحت إشراف / Sous couvert de") */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doc.useSupervisoryLine}
                      onChange={(e) =>
                        updateField('useSupervisoryLine', e.target.checked)
                      }
                    />
                    <span>
                      تفعيل سطر التسلسل الإداري («تحت إشراف السيد...» / «Sous couvert de...»)
                    </span>
                  </label>
                  {doc.useSupervisoryLine && (
                    <input
                      type="text"
                      value={
                        doc.language === 'fr'
                          ? doc.supervisoryLineFr || ''
                          : doc.supervisoryLineAr || ''
                      }
                      onChange={(e) =>
                        doc.language === 'fr'
                          ? updateField('supervisoryLineFr', e.target.value)
                          : updateField('supervisoryLineAr', e.target.value)
                      }
                      placeholder="تحت إشراف السيد رئيس المحكمة الابتدائية بسطات"
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white"
                    />
                  )}
                </div>

                {/* Correspondence Linking (الربط بين المراسلات) */}
                <div className="bg-blue-50/40 p-3.5 rounded-lg border border-blue-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#1e3a8a]" />
                    <span>الربط بمراسلة سابقة في السجل (جواب، تذكير، مراسلة تكميلية)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={doc.linkedParentId || ''}
                      onChange={(e) =>
                        updateField(
                          'linkedParentId',
                          e.target.value || undefined
                        )
                      }
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    >
                      <option value="">-- بدون ربط بمراسلة سابقة --</option>
                      {allDocuments
                        .filter((d) => d.id !== doc.id)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            [{d.number}] {d.subject.slice(0, 55)}
                          </option>
                        ))}
                    </select>
                    <select
                      value={doc.linkedRelationType || 'جواب'}
                      onChange={(e) =>
                        updateField('linkedRelationType', e.target.value as any)
                      }
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    >
                      <option value="جواب">جواب عن مراسلة</option>
                      <option value="تذكير">تذكير بمراسلة سابقة</option>
                      <option value="مراسلة تكميلية">مراسلة تكميلية</option>
                      <option value="إحالة وثائق إضافية">إحالة وثائق إضافية</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tables_bordereau' && (
              <div className="space-y-6">
                {/* Section 1: 3-Column Bordereau d'envoi Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        جدول ورقة الإرسال الرسمية (Bordereau d'envoi — 3 أعمدة)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        يظهر هذا الجدول تلقائياً عند اختيار نوع الوثيقة «ورقة إرسال»
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextOrder = (doc.bordereauRows?.length || 0) + 1;
                        const newRow: BordereauRow = {
                          id: `br-${Date.now()}`,
                          orderNumber: nextOrder,
                          documentNature:
                            doc.language === 'fr'
                              ? '- Dossier administratif complet ;'
                              : 'ـ ملف إداري مرفق بجميع الوثائق الثبوتية؛',
                          copiesCount: '01',
                          observations:
                            doc.language === 'fr'
                              ? 'Pour attribution et suite à donner'
                              : 'قصد الإنجاز والموافاة',
                          purposeTag: 'قصد الإنجاز والموافاة',
                        };
                        updateField('bordereauRows', [
                          ...(doc.bordereauRows || []),
                          newRow,
                        ]);
                      }}
                      className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة سطر لورقة الإرسال</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 shrink-0">
                      عبارة التقديم أعلى العمود الأول:
                    </label>
                    <input
                      type="text"
                      value={doc.bordereauIntroText || ''}
                      onChange={(e) =>
                        updateField('bordereauIntroText', e.target.value)
                      }
                      placeholder="تجدون رفقته /: أو يصلكم /:"
                      className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold w-64"
                    />
                  </div>

                  <div className="space-y-3">
                    {(doc.bordereauRows || []).map((row, idx) => (
                      <div
                        key={row.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            المرفق / السطر رقم {idx + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <select
                              value={row.purposeTag || 'قصد الإنجاز والموافاة'}
                              onChange={(e) => {
                                const tag = e.target.value as any;
                                const updatedRows = [...doc.bordereauRows];
                                updatedRows[idx] = {
                                  ...row,
                                  purposeTag: tag,
                                  observations: tag,
                                };
                                updateField('bordereauRows', updatedRows);
                              }}
                              className="text-[11px] border border-slate-300 rounded px-2 py-0.5 bg-white font-semibold"
                            >
                              {BORDEREAU_PURPOSES.map((p) => (
                                <option key={p} value={p}>
                                  الغرض: {p}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                updateField(
                                  'bordereauRows',
                                  doc.bordereauRows.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-red-600 hover:bg-red-50 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-7">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              نوع المراسلات وتلخيص موضوعها (Objet d'Envoi)
                            </label>
                            <textarea
                              rows={3}
                              value={row.documentNature}
                              onChange={(e) => {
                                const updatedRows = [...doc.bordereauRows];
                                updatedRows[idx] = {
                                  ...row,
                                  documentNature: e.target.value,
                                };
                                updateField('bordereauRows', updatedRows);
                              }}
                              className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              العدد (Nombre)
                            </label>
                            <input
                              type="text"
                              value={row.copiesCount}
                              onChange={(e) => {
                                const updatedRows = [...doc.bordereauRows];
                                updatedRows[idx] = {
                                  ...row,
                                  copiesCount: e.target.value,
                                };
                                updateField('bordereauRows', updatedRows);
                              }}
                              className="w-full border border-slate-300 rounded p-2 text-xs text-center font-bold bg-white tabular-nums"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              ملاحظات (Observations)
                            </label>
                            <textarea
                              rows={3}
                              value={row.observations}
                              onChange={(e) => {
                                const updatedRows = [...doc.bordereauRows];
                                updatedRows[idx] = {
                                  ...row,
                                  observations: e.target.value,
                                };
                                updateField('bordereauRows', updatedRows);
                              }}
                              className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 2: Technical Tables in Standard Correspondences */}
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        الجداول التقنية والمالية المدمجة داخل المراسلة
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        أدرج جدولاً تقنياً جاهزاً أو مخصصاً (مع تكرار رأس الجدول عند الطباعة)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => addPresetTechnicalTable('scanners')}
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800"
                      >
                        + جدول الماسحات الضوئية
                      </button>
                      <button
                        type="button"
                        onClick={() => addPresetTechnicalTable('active_directory')}
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800"
                      >
                        + جدول Active Directory
                      </button>
                      <button
                        type="button"
                        onClick={() => addPresetTechnicalTable('hardware_replace')}
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800"
                      >
                        + جدول مقارنة العتاد (صفقات)
                      </button>
                      <button
                        type="button"
                        onClick={() => addPresetTechnicalTable('french_it_lot')}
                        className="text-[11px] font-bold px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#1e3a8a]"
                      >
                        + Tableau FR (Désignation / N° Série / Qté)
                      </button>
                    </div>
                  </div>

                  {(doc.technicalTables || []).map((tbl, tIdx) => (
                    <div
                      key={tbl.id}
                      className="p-3 rounded-lg border border-slate-300 bg-slate-50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={tbl.title}
                          onChange={(e) => {
                            const next = [...doc.technicalTables];
                            next[tIdx] = { ...tbl, title: e.target.value };
                            updateField('technicalTables', next);
                          }}
                          className="flex-1 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...doc.technicalTables];
                            next[tIdx] = {
                              ...tbl,
                              rows: [
                                ...tbl.rows,
                                tbl.columns.map(() => 'معطى جديد'),
                              ],
                            };
                            updateField('technicalTables', next);
                          }}
                          className="text-xs font-bold text-[#1e3a8a] px-2 py-1 bg-blue-50 rounded"
                        >
                          + سطر
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              'technicalTables',
                              doc.technicalTables.filter((_, i) => i !== tIdx)
                            )
                          }
                          className="text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr>
                              {tbl.columns.map((col, cIdx) => (
                                <th key={cIdx} className="p-1 border border-slate-300 bg-slate-100">
                                  <input
                                    type="text"
                                    value={col}
                                    onChange={(e) => {
                                      const nextCols = [...tbl.columns];
                                      nextCols[cIdx] = e.target.value;
                                      const next = [...doc.technicalTables];
                                      next[tIdx] = { ...tbl, columns: nextCols };
                                      updateField('technicalTables', next);
                                    }}
                                    className="w-full bg-transparent font-bold text-center"
                                  />
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tbl.rows.map((r, rIdx) => (
                              <tr key={rIdx}>
                                {r.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1 border border-slate-300 bg-white">
                                    <input
                                      type="text"
                                      value={cell}
                                      onChange={(e) => {
                                        const nextRows = tbl.rows.map((rowArr, ri) =>
                                          ri === rIdx
                                            ? rowArr.map((c, ci) =>
                                                ci === cIdx ? e.target.value : c
                                              )
                                            : rowArr
                                        );
                                        const next = [...doc.technicalTables];
                                        next[tIdx] = { ...tbl, rows: nextRows };
                                        updateField('technicalTables', next);
                                      }}
                                      className="w-full text-center"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Section 3: Attachments Manager */}
                <div className="border-t border-slate-200 pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                      <span>قائمة المرفقات المدرجة أسفل المراسلة ({doc.attachments.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newAtt: AttachmentItem = {
                          id: `att-${Date.now()}`,
                          name: 'نسخة من المحضر التقني المرفق',
                          pagesCount: 1,
                          copiesCount: 1,
                          fileType: 'PDF',
                        };
                        updateField('attachments', [...doc.attachments, newAtt]);
                      }}
                      className="text-xs font-bold text-[#1e3a8a] hover:underline"
                    >
                      + إضافة مرفق
                    </button>
                  </div>

                  {doc.attachments.map((att, idx) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
                    >
                      <input
                        type="text"
                        value={att.name}
                        onChange={(e) => {
                          const next = [...doc.attachments];
                          next[idx] = { ...att, name: e.target.value };
                          updateField('attachments', next);
                        }}
                        className="flex-1 border border-slate-300 rounded px-2.5 py-1 text-xs bg-white"
                      />
                      <input
                        type="number"
                        min={1}
                        value={att.copiesCount}
                        onChange={(e) => {
                          const next = [...doc.attachments];
                          next[idx] = {
                            ...att,
                            copiesCount: parseInt(e.target.value, 10) || 1,
                          };
                          updateField('attachments', next);
                        }}
                        className="w-16 border border-slate-300 rounded px-2 py-1 text-xs text-center bg-white tabular-nums"
                        title="عدد النسخ"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'attachments',
                            doc.attachments.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'formatting' && (
              <div className="space-y-5">
                {/* Typography Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الخط الإداري العربي (شاملاً الخطوط المرفوعة)
                    </label>
                    <select
                      value={doc.fontFamilyAr}
                      onChange={(e) => updateField('fontFamilyAr', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                    >
                      <option value="Amiri">Amiri (خط أميري الإداري الكلاسيكي)</option>
                      <option value="Cairo">Cairo (خط القاهرة العصري)</option>
                      <option value="Tajawal">Tajawal (خط تجوال الإداري)</option>
                      <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</option>
                      <option value="Arial">Arial (المعتمد في كتب 2026)</option>
                      <option value="Traditional Arabic">Traditional Arabic</option>
                      {customFonts.map((cf) => (
                        <option key={cf.id} value={cf.name}>
                          {cf.name} (خط مرفوع مخصص)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Police Française (LTR)
                    </label>
                    <select
                      value={doc.fontFamilyFr}
                      onChange={(e) => updateField('fontFamilyFr', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                    >
                      <option value="Times New Roman">Times New Roman (Officiel)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="Arial">Arial</option>
                      {customFonts.map((cf) => (
                        <option key={cf.id} value={cf.name}>
                          {cf.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      حجم خط المتن ({doc.fontSizePt}pt)
                    </label>
                    <input
                      type="range"
                      min={11}
                      max={16}
                      step={0.5}
                      value={doc.fontSizePt}
                      onChange={(e) =>
                        updateField('fontSizePt', parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تباعد الأسطر ({doc.lineHeight})
                    </label>
                    <input
                      type="range"
                      min={1.3}
                      max={2.2}
                      step={0.05}
                      value={doc.lineHeight}
                      onChange={(e) =>
                        updateField('lineHeight', parseFloat(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المسافة البادئة للفقرة الأولى ({doc.firstLineIndentMm ?? 10}mm)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={doc.firstLineIndentMm ?? 10}
                      onChange={(e) =>
                        updateField('firstLineIndentMm', parseInt(e.target.value, 10))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تباعد الفقرات ({doc.paragraphSpacingPt ?? 9}pt)
                    </label>
                    <input
                      type="range"
                      min={4}
                      max={18}
                      step={1}
                      value={doc.paragraphSpacingPt ?? 9}
                      onChange={(e) =>
                        updateField('paragraphSpacingPt', parseInt(e.target.value, 10))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      محاذاة الفقرات (ضبط تام Justify هو المعيار الرسمي)
                    </label>
                    <select
                      value={doc.textAlign || 'justify'}
                      onChange={(e) =>
                        updateField('textAlign', e.target.value as any)
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                    >
                      <option value="justify">ضبط تام للحواف (Justify — معيار رسمي)</option>
                      <option value="right">محاذاة إلى اليمين (Right)</option>
                      <option value="left">محاذاة إلى اليسار (Left)</option>
                      <option value="center">توسيط (Center)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رابط خط ويب خارجي (Google Fonts CSS URL اختياري)
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={doc.customFontUrl || ''}
                      onChange={(e) => {
                        const url = e.target.value;
                        updateField('customFontUrl', url);
                        if (url.startsWith('https://fonts.googleapis.com')) {
                          const link = document.createElement('link');
                          link.rel = 'stylesheet';
                          link.href = url;
                          document.head.appendChild(link);
                        }
                      }}
                      placeholder="https://fonts.googleapis.com/css2?family=..."
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Signature Profile Selection */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    صفة الموقع على المراسلة (التوقيع الرسمي)
                  </label>
                  <select
                    value={doc.signatureProfileId}
                    onChange={(e) => {
                      const prof = signatures.find((s) => s.id === e.target.value);
                      if (!prof) return;
                      onChangeDocument({
                        ...doc,
                        signatureProfileId: prof.id,
                        signatureTitleSnapshotAr: prof.titleAr,
                        signatureTitleSnapshotFr: prof.titleFr,
                        signatureNameSnapshotAr: prof.signerNameAr,
                        signatureNameSnapshotFr: prof.signerNameFr,
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
                  >
                    {signatures.map((sig) => (
                      <option key={sig.id} value={sig.id}>
                        {sig.titleAr}{' '}
                        {sig.signerNameAr ? `(${sig.signerNameAr})` : '(بدون ذكر الاسم الشخصي)'}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        الصفة الوظيفية للموقع (عربي)
                      </label>
                      <input
                        type="text"
                        value={doc.signatureTitleSnapshotAr}
                        onChange={(e) =>
                          updateField('signatureTitleSnapshotAr', e.target.value)
                        }
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Titre du signataire (Français)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={doc.signatureTitleSnapshotFr}
                        onChange={(e) =>
                          updateField('signatureTitleSnapshotFr', e.target.value)
                        }
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Multi-page & Identity version snapshot selector */}
                <div className="space-y-2 text-xs font-semibold text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doc.repeatHeaderOnMultiPage}
                      onChange={(e) =>
                        updateField('repeatHeaderOnMultiPage', e.target.checked)
                      }
                    />
                    <span>تكرار الترويسة الرسمية في أعلى كل صفحة عند تعدد الصفحات</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={doc.showPageNumbers}
                      onChange={(e) =>
                        updateField('showPageNumbers', e.target.checked)
                      }
                    />
                    <span>إظهار ترقيم الصفحات (1/2، 2/2) عند تجاوز صفحة واحدة</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'ai' && aiEnabled && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1e3a8a]">
                    <Sparkles className="w-4 h-4" />
                    <span>المساعد الذكي للتحرير الإداري المغربي (اختياري وغير متطفل)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    يحترم هذا المساعد البروتوكول الإداري لوزارة العدل المغربية ومستوى الجهة المخاطبة ({doc.protocolLevel})، ولا يغير نصك تلقائياً بل يعرض عليك المقترح لتختار: <strong>إدراج</strong> أو <strong>استبدال</strong> أو <strong>تجاهل</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      المهمة المطلوبة من المساعد الإداري
                    </label>
                    <select
                      value={aiMode}
                      onChange={(e) => setAiMode(e.target.value as any)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
                    >
                      <option value="draft">1. اقتراح مسودة مراسلة رسمية كاملة انطلاقاً من الموضوع</option>
                      <option value="rephrase">2. إعادة صياغة المتن بأسلوب إداري مغربي رصين</option>
                      <option value="grammar">3. تدقيق لغوي وإملائي وتصحيح الأخطاء</option>
                      <option value="summarize_subject">4. تلخيص المتن في عنوان موضوع رسمي مختصر</option>
                      <option value="suggest_closings">5. اقتراح 3 صيغ افتتاحية وختامية مناسبة للمخاطب</option>
                      <option value="translate">6. ترجمة إدارية رسمية (عربي ⇄ فرنسي)</option>
                      <option value="extract_bordereau">7. تحويل المتن إلى عناصر جدول ورقة إرسال</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      توجيهات أو عناصر إضافية (اختياري)
                    </label>
                    <input
                      type="text"
                      value={aiPromptNotes}
                      onChange={(e) => setAiPromptNotes(e.target.value)}
                      placeholder="مثال: أشر إلى ضرورة الجواب قبل متم الشهر..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleRunAiAssistant}
                  className="w-full bg-[#1e3a8a] hover:bg-blue-950 disabled:opacity-50 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري توليد الصياغة الإدارية الرسمية...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>توليد المقترح الإداري الآن</span>
                    </>
                  )}
                </button>

                {aiError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                    {aiError}
                  </div>
                )}

                {aiResult && (
                  <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        المقترح الإداري المولد:
                      </span>
                      <button
                        type="button"
                        onClick={() => setAiResult(null)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        تجاهل وإغلاق
                      </button>
                    </div>

                    {aiResult.suggestedSubject && (
                      <div className="bg-white p-2.5 rounded border border-slate-200 text-xs">
                        <div className="font-bold text-slate-700 mb-1">
                          الموضوع المقترح:
                        </div>
                        <div className="text-slate-900 mb-2">
                          {aiResult.suggestedSubject}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              'subject',
                              aiResult.suggestedSubject || doc.subject
                            )
                          }
                          className="text-[11px] font-bold bg-blue-50 text-[#1e3a8a] px-2.5 py-1 rounded border border-blue-200"
                        >
                          اعتماد هذا الموضوع
                        </button>
                      </div>
                    )}

                    {aiResult.suggestedBody && (
                      <div className="bg-white p-3 rounded border border-slate-200 text-xs space-y-2">
                        <div className="font-bold text-slate-700">المتن المقترح:</div>
                        <div className="whitespace-pre-wrap leading-relaxed text-slate-900">
                          {aiResult.suggestedBody}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateField('bodyText', aiResult.suggestedBody || '')
                            }
                            className="bg-[#1e3a8a] text-white px-3 py-1 rounded font-bold text-[11px]"
                          >
                            استبدال المتن الحالي
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                'bodyText',
                                `${doc.bodyText}\n\n${aiResult.suggestedBody}`
                              )
                            }
                            className="bg-emerald-700 text-white px-3 py-1 rounded font-bold text-[11px]"
                          >
                            إدراج في نهاية المتن
                          </button>
                        </div>
                      </div>
                    )}

                    {aiResult.suggestedClosing && (
                      <div className="bg-white p-2.5 rounded border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold">الخاتمة المقترحة: </span>
                          <span>{aiResult.suggestedClosing}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateField(
                              'closingText',
                              aiResult.suggestedClosing || doc.closingText
                            )
                          }
                          className="text-[11px] font-bold text-[#1e3a8a] underline shrink-0"
                        >
                          اعتماد الخاتمة
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right/Left Live A4 Preview Pane (6 Columns on Desktop) */}
        <div className="lg:col-span-6 bg-slate-200/80 flex flex-col overflow-hidden">
          {/* Preview Controls Bar */}
          <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="font-bold">
                المعاينة الحية المطابقة للطباعة (A4 — 210mm × 297mm)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPreviewScale((s) => Math.max(0.45, +(s - 0.08).toFixed(2)))
                }
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 font-bold"
              >
                -
              </button>
              <span className="tabular-nums font-semibold">
                {Math.round(previewScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setPreviewScale((s) => Math.min(1.0, +(s + 0.08).toFixed(2)))
                }
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Scrollable A4 Sheet Container */}
          <div className="flex-1 overflow-auto flex justify-center p-4">
            <A4DocumentRenderer
              document={doc}
              signatureProfile={activeSignature}
              scale={previewScale}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
