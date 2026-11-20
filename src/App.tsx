import React, { useState, useEffect, useMemo } from 'react';
import {
  CorrespondenceDocument,
  RecipientContact,
  ReferenceTemplate,
  InstitutionalIdentityVersion,
  SignatureProfile,
  ProtocolPhrase,
  NumberingConfig,
  CustomUploadedFont,
  CorrespondenceStatus,
  LanguageCode,
} from './types/correspondence';
import {
  INITIAL_IDENTITY_VERSIONS,
  INITIAL_SIGNATURES,
  INITIAL_NUMBERING_CONFIG,
  INITIAL_PROTOCOL_PHRASES,
  INITIAL_CONTACTS,
  INITIAL_TEMPLATES,
  INITIAL_CORRESPONDENCES,
  REAL_SETTAT_ARCHIVE_ASSETS,
  RealSettatArchiveAsset,
} from './data/initialData';
import {
  formatAddresseeBlock,
  generateCorrespondenceNumber,
  selectProtocolFormulas,
  mergeUniqueRecords,
} from './utils/protocolEngine';
import {
  saveToIndexedDB,
  loadFromIndexedDB,
  registerCustomFontInDOM,
  exportToExcelCSV,
  downloadJsonFile,
  exportStandaloneSingleFileApp,
  SystemBackupBundle,
} from './services/storageService';
import { A4DocumentRenderer } from './components/A4DocumentRenderer';
import { CorrespondenceEditor } from './components/CorrespondenceEditor';
import { ReferenceLibraryView } from './components/ReferenceLibraryView';
import { WorkspaceImportView } from './components/WorkspaceImportView';
import { OrgContactsView } from './components/OrgContactsView';
import { IdentitySettingsView } from './components/IdentitySettingsView';
import {
  LayoutDashboard,
  FilePlus2,
  TableProperties,
  Archive,
  BookOpen,
  CloudDownload,
  Building2,
  Settings,
  Search,
  Printer,
  Edit3,
  Copy,
  Link2,
  Download,
  Menu,
  X,
  FileText,
  Scale,
} from 'lucide-react';

type ActiveView =
  | 'dashboard'
  | 'editor'
  | 'registry'
  | 'library'
  | 'workspace'
  | 'contacts'
  | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Persistent State
  const [correspondences, setCorrespondences] = useState<
    CorrespondenceDocument[]
  >(INITIAL_CORRESPONDENCES);
  const [contacts, setContacts] =
    useState<RecipientContact[]>(INITIAL_CONTACTS);
  const [templates, setTemplates] =
    useState<ReferenceTemplate[]>(INITIAL_TEMPLATES);
  const [identityVersions, setIdentityVersions] = useState<
    InstitutionalIdentityVersion[]
  >(INITIAL_IDENTITY_VERSIONS);
  const [signatures, setSignatures] =
    useState<SignatureProfile[]>(INITIAL_SIGNATURES);
  const [phrases, setPhrases] = useState<ProtocolPhrase[]>(
    INITIAL_PROTOCOL_PHRASES
  );
  const [numberingConfig, setNumberingConfig] = useState<NumberingConfig>(
    INITIAL_NUMBERING_CONFIG
  );
  const [customFonts, setCustomFonts] = useState<CustomUploadedFont[]>([]);
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);

  // Active Document in Editor
  const [activeDocId, setActiveDocId] = useState<string>(
    INITIAL_CORRESPONDENCES[0].id
  );
  const [openWizardOnEnterEditor, setOpenWizardOnEnterEditor] =
    useState<boolean>(false);

  // Registry Filters
  const [registrySearch, setRegistrySearch] = useState<string>('');
  const [registryLang, setRegistryLang] = useState<'all' | LanguageCode>('all');
  const [registryStatus, setRegistryStatus] = useState<
    'all' | CorrespondenceStatus
  >('all');
  const [registryCategory, setRegistryCategory] = useState<string>('all');

  // Load persisted state from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [
        savedDocs,
        savedContacts,
        savedTemplates,
        savedIdentities,
        savedSigs,
        savedPhrases,
        savedNumCfg,
        savedFonts,
        savedAi,
      ] = await Promise.all([
        loadFromIndexedDB('correspondences', INITIAL_CORRESPONDENCES),
        loadFromIndexedDB('contacts', INITIAL_CONTACTS),
        loadFromIndexedDB('templates', INITIAL_TEMPLATES),
        loadFromIndexedDB('identityVersions', INITIAL_IDENTITY_VERSIONS),
        loadFromIndexedDB('signatures', INITIAL_SIGNATURES),
        loadFromIndexedDB('phrases', INITIAL_PROTOCOL_PHRASES),
        loadFromIndexedDB('numberingConfig', INITIAL_NUMBERING_CONFIG),
        loadFromIndexedDB<CustomUploadedFont[]>('customFonts', []),
        loadFromIndexedDB('aiEnabled', true),
      ]);

      if (!mounted) return;
      setCorrespondences(savedDocs);
      setContacts(savedContacts);
      setTemplates(savedTemplates);
      setIdentityVersions(savedIdentities);
      setSignatures(savedSigs);
      setPhrases(savedPhrases);
      setNumberingConfig(savedNumCfg);
      setCustomFonts(savedFonts);
      setAiEnabled(savedAi);

      for (const f of savedFonts) {
        await registerCustomFontInDOM(f);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const currentIdentity = useMemo(
    () =>
      identityVersions.find((v) => v.isCurrent) ||
      identityVersions[0] ||
      INITIAL_IDENTITY_VERSIONS[0],
    [identityVersions]
  );

  const activeDocument = useMemo(
    () =>
      correspondences.find((d) => d.id === activeDocId) || correspondences[0],
    [correspondences, activeDocId]
  );

  const activeSignatureProfile = useMemo(
    () =>
      signatures.find((s) => s.id === activeDocument?.signatureProfileId) ||
      signatures[0],
    [signatures, activeDocument]
  );

  // Create a brand new correspondence document
  const handleCreateNewDocument = (options?: {
    isBordereau?: boolean;
    openWizard?: boolean;
    contact?: RecipientContact;
    template?: ReferenceTemplate;
  }) => {
    const nextNum = generateCorrespondenceNumber(
      numberingConfig,
      correspondences
    );
    const defaultContact =
      options?.contact ||
      contacts.find((c) => c.id === 'cnt-tpi-settat-greffe') ||
      contacts[0];

    const addrAr = formatAddresseeBlock(defaultContact, 'ar');
    const addrFr = formatAddresseeBlock(defaultContact, 'fr');
    const formulas = selectProtocolFormulas(
      phrases,
      'ar',
      defaultContact.protocolLevel
    );

    const isBordereau = Boolean(options?.isBordereau);
    const today = new Date().toISOString().slice(0, 10);

    const newDoc: CorrespondenceDocument = {
      id: `doc-${Date.now()}`,
      number: nextNum,
      numberLocked: false,
      dateGrego: today,
      dateHijri: '',
      showHijriDate: false,
      cityAr: 'سطات',
      cityFr: 'Settat',
      showCityDateLine: true,
      showOutgoingStampBox: isBordereau,
      language: options?.template?.language || 'ar',
      docType:
        options?.template?.docType ||
        (isBordereau ? 'ورقة إرسال' : 'كتاب إداري رسمي'),
      status: 'مسودة',
      recipientId: defaultContact.id,
      recipientCategory: defaultContact.category,
      protocolLevel: defaultContact.protocolLevel,
      addresseeLinesAr:
        options?.template?.addresseeFormatAr?.length
          ? options.template.addresseeFormatAr
          : addrAr.lines,
      addresseeLinesFr:
        options?.template?.addresseeFormatFr?.length
          ? options.template.addresseeFormatFr
          : addrFr.lines,
      supervisoryLineAr:
        options?.template?.supervisoryLineAr ||
        defaultContact.defaultSupervisoryRoleAr ||
        '',
      supervisoryLineFr: defaultContact.defaultSupervisoryRoleFr || '',
      useSupervisoryLine: Boolean(
        options?.template?.supervisoryLineAr ||
          (isBordereau && defaultContact.defaultSupervisoryRoleAr)
      ),
      subject:
        options?.template?.defaultSubject ||
        (isBordereau
          ? 'ورقة إرسال وثائق ومستندات إدارية.'
          : 'حول ...'),
      reference: options?.template?.defaultReference || '',
      showReference: Boolean(options?.template?.defaultReference),
      basmalaText: 'بسم الله الرحمن الرحيم',
      showBasmala: false,
      salutationText: 'سلام تام بوجود مولانا الإمام،',
      showSalutation: !isBordereau,
      openingTransition: !isBordereau ? 'وبعد،' : '',
      bodyText:
        options?.template?.bodyTemplate ||
        (!isBordereau ? `${formulas.opening} ` : ''),
      closingText:
        options?.template?.closingFormula ||
        (isBordereau
          ? 'تقبلوا فائق عبارات التقدير والاحترام'
          : formulas.closing),
      signatureProfileId: signatures[0].id,
      signatureTitleSnapshotAr: signatures[0].titleAr,
      signatureTitleSnapshotFr: signatures[0].titleFr,
      signatureNameSnapshotAr: signatures[0].signerNameAr,
      signatureNameSnapshotFr: signatures[0].signerNameFr,
      attachments: (options?.template?.defaultAttachments || []).map(
        (name, idx) => ({
          id: `att-${Date.now()}-${idx}`,
          name,
          pagesCount: 1,
          copiesCount: 1,
          fileType: 'PDF',
        })
      ),
      bordereauIntroText: isBordereau ? 'تجدون رفقته /:' : '',
      bordereauRows:
        options?.template?.defaultBordereauRows ||
        (isBordereau
          ? [
              {
                id: `br-${Date.now()}`,
                orderNumber: 1,
                documentNature:
                  'ـ الوثائق والمستندات الإدارية المشار إليها أعلاه؛\n\nالمجموع',
                copiesCount: '01\n\n01',
                observations: 'قصد الإنجاز والموافاة',
                purposeTag: 'قصد الإنجاز والموافاة',
              },
            ]
          : []),
      technicalTables: options?.template?.defaultTechnicalTable
        ? [options.template.defaultTechnicalTable]
        : [],
      internalNotes: '',
      fontFamilyAr: options?.template?.detectedFontFamily || 'Amiri',
      fontFamilyFr: 'Times New Roman',
      fontSizePt: options?.template?.detectedFontSizePt || 13.5,
      lineHeight: options?.template?.detectedLineHeight || 1.8,
      textAlign: 'justify',
      repeatHeaderOnMultiPage: true,
      showPageNumbers: false,
      templateIdUsed: options?.template?.id,
      identitySnapshot: currentIdentity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revisionHistory: [
        {
          id: `rev-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'إنشاء مسودة جديدة',
          actor: 'المديرية الإقليمية للعدل بسطات',
          statusAfter: 'مسودة',
          summary: 'إنشاء المراسلة',
        },
      ],
    };

    const nextList = [newDoc, ...correspondences];
    setCorrespondences(nextList);
    saveToIndexedDB('correspondences', nextList);

    const nextNumCfg = {
      ...numberingConfig,
      nextSequenceNumber: numberingConfig.nextSequenceNumber + 1,
    };
    setNumberingConfig(nextNumCfg);
    saveToIndexedDB('numberingConfig', nextNumCfg);

    setActiveDocId(newDoc.id);
    setOpenWizardOnEnterEditor(Boolean(options?.openWizard));
    setActiveView('editor');
  };

  const handleUpdateActiveDocument = (updated: CorrespondenceDocument) => {
    const nextList = correspondences.map((d) =>
      d.id === updated.id ? updated : d
    );
    setCorrespondences(nextList);
    saveToIndexedDB('correspondences', nextList);
  };

  const handleSaveDocumentWithLog = (
    docToSave: CorrespondenceDocument,
    logAction: string = 'حفظ وتحديث المراسلة'
  ) => {
    const newLog = {
      id: `rev-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: logAction,
      actor: 'المديرية الإقليمية للعدل بسطات',
      statusAfter: docToSave.status,
      summary: `${logAction} (${docToSave.number})`,
    };
    const finalDoc: CorrespondenceDocument = {
      ...docToSave,
      revisionHistory: [newLog, ...(docToSave.revisionHistory || [])],
    };
    const exists = correspondences.some((d) => d.id === finalDoc.id);
    const nextList = exists
      ? correspondences.map((d) => (d.id === finalDoc.id ? finalDoc : d))
      : [finalDoc, ...correspondences];

    setCorrespondences(nextList);
    saveToIndexedDB('correspondences', nextList);
  };

  const handleDuplicateDocument = (source: CorrespondenceDocument) => {
    const nextNum = generateCorrespondenceNumber(
      numberingConfig,
      correspondences
    );
    const copyDoc: CorrespondenceDocument = {
      ...source,
      id: `doc-copy-${Date.now()}`,
      number: nextNum,
      numberLocked: false,
      status: 'مسودة',
      dateGrego: new Date().toISOString().slice(0, 10),
      identitySnapshot: currentIdentity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextList = [copyDoc, ...correspondences];
    setCorrespondences(nextList);
    saveToIndexedDB('correspondences', nextList);
    setActiveDocId(copyDoc.id);
    setActiveView('editor');
  };

  const handleTriggerPrint = (docToPrint: CorrespondenceDocument) => {
    setActiveDocId(docToPrint.id);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleCreateFromArchiveAsset = (asset: RealSettatArchiveAsset) => {
    const matchingTpl = templates.find(
      (t) =>
        t.sourceFileName === asset.fileName ||
        t.originalOutgoingNumber === asset.outgoingNumber
    );
    if (matchingTpl) {
      handleCreateNewDocument({ template: matchingTpl });
      return;
    }

    const nextNum = generateCorrespondenceNumber(
      numberingConfig,
      correspondences
    );
    const newDoc: CorrespondenceDocument = {
      ...INITIAL_CORRESPONDENCES[0],
      id: `doc-from-asset-${Date.now()}`,
      number: nextNum,
      numberLocked: false,
      dateGrego: new Date().toISOString().slice(0, 10),
      language: asset.language,
      docType: asset.docType.includes('ورقة إرسال')
        ? 'ورقة إرسال'
        : 'كتاب إداري رسمي',
      status: 'مسودة',
      addresseeLinesAr:
        asset.language === 'ar' ? ['إلى', asset.recipient] : ['إلى', asset.recipient],
      addresseeLinesFr:
        asset.language === 'fr' ? ['A', asset.recipient] : ['A', asset.recipient],
      subject: asset.subject,
      reference: asset.reference,
      showReference: Boolean(asset.reference),
      bodyText: `${asset.summary}\n\n(مستخرج من الوثيقة المرجعية عدد ${asset.outgoingNumber} بتاريخ ${asset.date})`,
      identitySnapshot: currentIdentity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextList = [newDoc, ...correspondences];
    setCorrespondences(nextList);
    saveToIndexedDB('correspondences', nextList);
    setActiveDocId(newDoc.id);
    setActiveView('editor');
  };

  // Filtered Registry
  const filteredRegistry = useMemo(() => {
    return correspondences.filter((d) => {
      if (registryLang !== 'all' && d.language !== registryLang) return false;
      if (registryStatus !== 'all' && d.status !== registryStatus) return false;
      if (
        registryCategory !== 'all' &&
        d.recipientCategory !== registryCategory
      )
        return false;
      if (!registrySearch.trim()) return true;
      const q = registrySearch.toLowerCase();
      return (
        d.number.toLowerCase().includes(q) ||
        d.subject.toLowerCase().includes(q) ||
        d.reference.toLowerCase().includes(q) ||
        d.addresseeLinesAr.join(' ').toLowerCase().includes(q) ||
        d.addresseeLinesFr.join(' ').toLowerCase().includes(q) ||
        d.bodyText.toLowerCase().includes(q)
      );
    });
  }, [
    correspondences,
    registryLang,
    registryStatus,
    registryCategory,
    registrySearch,
  ]);

  const handleExportRegistryExcel = () => {
    const headers = [
      'رقم الصادر',
      'التاريخ',
      'نوع الوثيقة',
      'اللغة',
      'الحالة',
      'المرسل إليه',
      'الموضوع',
      'المرجع',
      'الموقع',
    ];
    const rows = filteredRegistry.map((d) => [
      d.number,
      d.dateGrego,
      d.docType,
      d.language === 'ar' ? 'العربية' : 'الفرنسية',
      d.status,
      (d.language === 'fr' ? d.addresseeLinesFr : d.addresseeLinesAr).join(' - '),
      d.subject,
      d.reference,
      d.signatureTitleSnapshotAr,
    ]);
    exportToExcelCSV('سجل_المراسلات_الصادرة_مديرية_العدل_بسطات', headers, rows);
  };

  const handleExportFullBackup = () => {
    const bundle: SystemBackupBundle = {
      schemaVersion: '2026.1.0',
      exportedAt: new Date().toISOString(),
      organization:
        'المديرية الإقليمية للعدل بسطات - المملكة المغربية (Direction Provinciale de la Justice de Settat)',
      correspondences,
      contacts,
      templates,
      identityVersions,
      signatures,
      phrases,
      numberingConfig,
      customFonts,
      aiEnabled,
    };
    downloadJsonFile(
      `نسخة_احتياطية_شاملة_مديرية_العدل_بسطات_${new Date()
        .toISOString()
        .slice(0, 10)}.json`,
      bundle
    );
  };

  const handleImportFullBackup = (bundle: SystemBackupBundle) => {
    if (bundle.correspondences) {
      const merged = mergeUniqueRecords(
        correspondences,
        bundle.correspondences
      ).merged;
      setCorrespondences(merged);
      saveToIndexedDB('correspondences', merged);
    }
    if (bundle.contacts) {
      const merged = mergeUniqueRecords(contacts, bundle.contacts).merged;
      setContacts(merged);
      saveToIndexedDB('contacts', merged);
    }
    if (bundle.templates) {
      const merged = mergeUniqueRecords(templates, bundle.templates).merged;
      setTemplates(merged);
      saveToIndexedDB('templates', merged);
    }
    if (bundle.identityVersions) {
      const merged = mergeUniqueRecords(
        identityVersions,
        bundle.identityVersions
      ).merged;
      setIdentityVersions(merged);
      saveToIndexedDB('identityVersions', merged);
    }
  };

  const navItems: {
    id: ActiveView;
    label: string;
    subtitle: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'dashboard',
      label: 'لوحة القيادة والمؤشرات',
      subtitle: 'نظرة شاملة وإجراءات سريعة',
      icon: LayoutDashboard,
    },
    {
      id: 'editor',
      label: 'محرر المراسلات والمعالج',
      subtitle: 'تحرير ومعاينة فورية A4',
      icon: FilePlus2,
    },
    {
      id: 'registry',
      label: 'سجل الصادر والأرشيف',
      subtitle: `${correspondences.length} مراسلة موثقة`,
      icon: Archive,
    },
    {
      id: 'library',
      label: 'مكتبة النماذج وأرشيف سطات',
      subtitle: `${templates.length} نموذج · ${REAL_SETTAT_ARCHIVE_ASSETS.length} وثيقة أصلية`,
      icon: BookOpen,
    },
    {
      id: 'workspace',
      label: 'استيراد Gmail / Drive / OCR',
      subtitle: 'استخراج النماذج والخطوط',
      icon: CloudDownload,
    },
    {
      id: 'contacts',
      label: 'التنظيم الهيكلي والمخاطبين',
      subtitle: `${contacts.length} جهة ومصلحة ومقاولة`,
      icon: Building2,
    },
    {
      id: 'settings',
      label: 'الهوية والترويسة والإعدادات',
      subtitle: 'الترويسة، التذييل، والنسخ الاحتياطي',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900" dir="rtl">
      {/* Hidden Print-Only Container so window.print() outputs pure A4 official pages */}
      <div className="print-only-container">
        {activeDocument && (
          <A4DocumentRenderer
            document={activeDocument}
            signatureProfile={activeSignatureProfile}
            isPrintMode={true}
          />
        )}
      </div>

      {/* Main Non-Printing App Shell */}
      <div className="no-print flex-1 flex flex-col h-screen overflow-hidden">
        {/* Official Institutional Top Header */}
        <header className="bg-[#0f172a] text-white border-b border-slate-800 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="القائمة الرئيسية"
            >
              {mobileSidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <Scale className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  المنظومة الرقمية لصناعة وتدبير المراسلات الإدارية الرسمية
                </h1>
                <span className="hidden md:inline-block text-xs text-amber-400 font-semibold">
                  · المملكة المغربية — وزارة العدل
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                المديرية الإقليمية للعدل بسطات — Direction Provinciale de la Justice de Settat
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleCreateNewDocument({ isBordereau: false, openWizard: true })
              }
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>مراسلة جديدة (المعالج الذكي)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleCreateNewDocument({ isBordereau: true, openWizard: false })
              }
              className="hidden sm:flex bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold items-center gap-1.5 transition-colors"
            >
              <TableProperties className="w-4 h-4 text-amber-400" />
              <span>ورقة إرسال جديدة (Bordereau)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportStandaloneSingleFileApp(
                  correspondences,
                  contacts,
                  currentIdentity
                )
              }
              className="hidden xl:flex bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-lg text-xs font-bold items-center gap-1.5 transition-colors"
              title="تحميل المنظومة في ملف HTML واحد مستقل يعمل بدون خادم"
            >
              <Download className="w-3.5 h-3.5" />
              <span>نسخة الملف الواحد (.html)</span>
            </button>
          </div>
        </header>

        {/* Body Layout: Sidebar + Active Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Right Sidebar Navigation (RTL) */}
          <aside
            className={`${
              mobileSidebarOpen
                ? 'fixed inset-y-0 right-0 z-40 w-72 flex'
                : 'hidden lg:flex lg:w-68'
            } bg-[#0f172a] text-slate-200 border-l border-slate-800 flex-col justify-between shrink-0 select-none`}
          >
            <div className="p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full text-right px-3.5 py-3 rounded-xl flex items-start gap-3 transition-all ${
                      isActive
                        ? 'bg-[#1e3a8a] text-white shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        isActive ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold truncate">
                        {item.label}
                      </div>
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
                          isActive ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Institutional Contact Footer inside Sidebar */}
            <div className="p-4 border-t border-slate-800/90 bg-slate-950/50 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-200">
                مقر المديرية الإقليمية للعدل بسطات
              </div>
              <div>الحي الإداري، مقر قسم قضاء الأسرة، سطات</div>
              <div className="tabular-nums" dir="ltr">
                Tél: {currentIdentity.phone} · Fax: {currentIdentity.fax}
              </div>
              <div dir="ltr" className="text-amber-400/90">
                {currentIdentity.email}
              </div>
            </div>
          </aside>

          {/* Main Workspace Area */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {activeView === 'dashboard' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Institutional Hero & Quick Actions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-3xl">
                    <div className="text-xs font-bold text-[#1e3a8a]">
                      المملكة المغربية · وزارة العدل · الدائرة القضائية لمحكمة الاستئناف بسطات
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">
                      منظومة التحرير الإداري وتدبير المراسلات الصادرة وأوراق الإرسال
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      تعتمد المنظومة الترويسة والتذييل الرسميين للمديرية الإقليمية للعدل بسطات، وتضم قاعدة بيانات التنظيم الهيكلي لوزارة العدل (القرار 1501.22)، ومحاكم الدائرة القضائية (سطات، برشيد، ابن أحمد، البروج)، ومكتبة النماذج المستخرجة من 36 مراسلة رسمية حقيقية.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateNewDocument({
                          isBordereau: false,
                          openWizard: true,
                        })
                      }
                      className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
                    >
                      <FilePlus2 className="w-4 h-4 text-amber-400" />
                      <span>إنشاء مراسلة رسمية جديدة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleCreateNewDocument({
                          isBordereau: true,
                          openWizard: false,
                        })
                      }
                      className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      <TableProperties className="w-4 h-4 text-[#1e3a8a]" />
                      <span>إنشاء ورقة إرسال (Bordereau)</span>
                    </button>
                  </div>
                </div>

                {/* Key Institutional Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      إجمالي المراسلات المسجلة
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                      {correspondences.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      منها {correspondences.filter((c) => c.language === 'ar').length}{' '}
                      بالعربية و{' '}
                      {correspondences.filter((c) => c.language === 'fr').length}{' '}
                      بالفرنسية
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      مكتبة النماذج والوثائق الأصلية المرفقة
                    </div>
                    <div className="text-2xl font-bold text-[#1e3a8a] mt-1 tabular-nums">
                      {templates.length} نموذج · {REAL_SETTAT_ARCHIVE_ASSETS.length} أصل
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      محللة بصرياً ولغوياً وجاهزة للاستعمال
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      قاعدة بيانات المخاطبين والهيكل التنظيمي
                    </div>
                    <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">
                      {contacts.length} جهة رسمية
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      الإدارة المركزية، محاكم الدائرة القضائية، والشركات
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-500">
                      الرقم التسلسلي القادم للصادر
                    </div>
                    <div className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
                      {generateCorrespondenceNumber(
                        numberingConfig,
                        correspondences
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      ترقيم آلي مع منع التكرار وقفل بعد الاعتماد
                    </div>
                  </div>
                </div>

                {/* Recent Correspondences & Official Header Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Recent Correspondences Table (8 cols) */}
                  <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        آخر المراسلات وأوراق الإرسال المسجلة بالمنظومة
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveView('registry')}
                        className="text-xs font-bold text-[#1e3a8a] hover:underline"
                      >
                        عرض السجل الكامل ({correspondences.length}) ←
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 font-bold">رقم الصادر</th>
                            <th className="py-3 px-4 font-bold">التاريخ</th>
                            <th className="py-3 px-4 font-bold">المرسل إليه</th>
                            <th className="py-3 px-4 font-bold">الموضوع</th>
                            <th className="py-3 px-4 font-bold">الحالة</th>
                            <th className="py-3 px-4 font-bold">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {correspondences.slice(0, 6).map((docItem) => (
                            <tr
                              key={docItem.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-3 px-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                {docItem.number}
                              </td>
                              <td className="py-3 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                                {docItem.dateGrego}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-800 max-w-[180px] truncate">
                                {(docItem.language === 'fr'
                                  ? docItem.addresseeLinesFr
                                  : docItem.addresseeLinesAr
                                )
                                  .slice(1)
                                  .join(' - ')}
                              </td>
                              <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                                {docItem.subject}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="font-bold text-[#1e3a8a]">
                                  {docItem.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDocId(docItem.id);
                                      setOpenWizardOnEnterEditor(false);
                                      setActiveView('editor');
                                    }}
                                    className="text-xs font-bold text-[#1e3a8a] hover:underline"
                                  >
                                    فتح وتحرير
                                  </button>
                                  <span>·</span>
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerPrint(docItem)}
                                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                                  >
                                    طباعة
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Active Institutional Identity Card (4 cols) */}
                  <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">
                          الهوية المؤسساتية المعتمدة حالياً
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveView('settings')}
                          className="text-xs font-bold text-[#1e3a8a] hover:underline"
                        >
                          تعديل الترويسة ←
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                        <div className="text-[11px] font-bold text-slate-500 mb-1">
                          الترويسة الرسمية (En-tête):
                        </div>
                        <img
                          src={currentIdentity.headerImageUrl}
                          alt="الترويسة الرسمية"
                          className="w-full h-16 object-contain bg-white rounded border border-slate-200 p-1"
                        />
                      </div>

                      <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                        <div className="text-[11px] font-bold text-slate-500 mb-1">
                          التذييل الرسمي (En-pied):
                        </div>
                        <img
                          src={currentIdentity.footerImageUrl}
                          alt="التذييل الرسمي"
                          className="w-full h-12 object-contain bg-white rounded border border-slate-200 p-1"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        النسخ المحفوظة للهوية: {identityVersions.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveView('library')}
                        className="font-bold text-emerald-800 hover:underline"
                      >
                        استعراض 36 وثيقة مرجعية ←
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'editor' && activeDocument && (
              <CorrespondenceEditor
                document={activeDocument}
                allDocuments={correspondences}
                contacts={contacts}
                templates={templates}
                signatures={signatures}
                phrases={phrases}
                numberingConfig={numberingConfig}
                currentIdentity={currentIdentity}
                customFonts={customFonts}
                aiEnabled={aiEnabled}
                onChangeDocument={handleUpdateActiveDocument}
                onSaveDocument={handleSaveDocumentWithLog}
                onDuplicateDocument={handleDuplicateDocument}
                onTriggerPrint={handleTriggerPrint}
                showWizardInitially={openWizardOnEnterEditor}
                onCloseWizard={() => setOpenWizardOnEnterEditor(false)}
              />
            )}

            {activeView === 'registry' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Archive className="w-5 h-5 text-[#1e3a8a]" />
                      <span>
                        سجل المراسلات الصادرة والأرشيف الإلكتروني والربط التسلسلي
                      </span>
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      بحث متقدم متعدد المعايير مع تتبع المراسلات المرتبطة (جواب، تذكير، مراسلة تكميلية) وتصدير السجل إلى Excel.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportRegistryExcel}
                      className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>تصدير السجل إلى Excel (CSV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateNewDocument({
                          isBordereau: false,
                          openWizard: true,
                        })
                      }
                      className="bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      <span>مراسلة جديدة</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filters */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={registrySearch}
                      onChange={(e) => setRegistrySearch(e.target.value)}
                      placeholder="بحث برقم الصادر، الموضوع، المرجع، المرسل إليه، أو نص المراسلة..."
                      className="w-full border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <select
                    value={registryCategory}
                    onChange={(e) => setRegistryCategory(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                  >
                    <option value="all">جميع أصناف المخاطبين</option>
                    <option value="central">الإدارة المركزية لوزارة العدل</option>
                    <option value="judicial_appeal">محكمة الاستئناف بسطات</option>
                    <option value="judicial_first_instance">
                      المحاكم الابتدائية والمراكز القضائية
                    </option>
                    <option value="external">الشركات والشركاء الخارجيون</option>
                  </select>

                  <select
                    value={registryLang}
                    onChange={(e) => setRegistryLang(e.target.value as any)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                  >
                    <option value="all">جميع اللغات</option>
                    <option value="ar">العربية</option>
                    <option value="fr">الفرنسية</option>
                  </select>

                  <select
                    value={registryStatus}
                    onChange={(e) => setRegistryStatus(e.target.value as any)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold bg-white"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="مسودة">مسودة</option>
                    <option value="قيد التحرير">قيد التحرير</option>
                    <option value="جاهزة للمراجعة">جاهزة للمراجعة</option>
                    <option value="معتمدة">معتمدة</option>
                    <option value="صادرة">صادرة</option>
                    <option value="مؤرشفة">مؤرشفة</option>
                  </select>
                </div>

                {/* Registry Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-4 font-bold">رقم الصادر</th>
                          <th className="py-3.5 px-4 font-bold">التاريخ</th>
                          <th className="py-3.5 px-4 font-bold">نوع الوثيقة</th>
                          <th className="py-3.5 px-4 font-bold">المرسل إليه</th>
                          <th className="py-3.5 px-4 font-bold">الموضوع والربط</th>
                          <th className="py-3.5 px-4 font-bold">الحالة</th>
                          <th className="py-3.5 px-4 font-bold">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRegistry.map((item) => {
                          const parentDoc = item.linkedParentId
                            ? correspondences.find(
                                (p) => p.id === item.linkedParentId
                              )
                            : undefined;

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                                {item.number}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                                {item.dateGrego}
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                                {item.docType}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-800 max-w-[200px] truncate">
                                {(item.language === 'fr'
                                  ? item.addresseeLinesFr
                                  : item.addresseeLinesAr
                                )
                                  .slice(1)
                                  .join(' — ')}
                              </td>
                              <td className="py-3.5 px-4 max-w-md">
                                <div className="font-semibold text-slate-900 line-clamp-1">
                                  {item.subject}
                                </div>
                                {item.reference && (
                                  <div className="text-[11px] text-slate-500 line-clamp-1">
                                    المرجع: {item.reference}
                                  </div>
                                )}
                                {parentDoc && (
                                  <div className="text-[11px] text-[#1e3a8a] font-bold flex items-center gap-1 mt-0.5">
                                    <Link2 className="w-3 h-3" />
                                    <span>
                                      {item.linkedRelationType || 'مرتبطة'} بالمراسلة رقم{' '}
                                      {parentDoc.number}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-bold text-[#1e3a8a]">
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDocId(item.id);
                                      setOpenWizardOnEnterEditor(false);
                                      setActiveView('editor');
                                    }}
                                    className="p-1.5 rounded bg-blue-50 text-[#1e3a8a] hover:bg-blue-100"
                                    title="فتح في المحرر"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateDocument(item)}
                                    className="p-1.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    title="نسخ المراسلة"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerPrint(item)}
                                    className="p-1.5 rounded bg-slate-100 text-slate-800 hover:bg-slate-200"
                                    title="طباعة / PDF"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

            {activeView === 'library' && (
              <ReferenceLibraryView
                templates={templates}
                archiveAssets={REAL_SETTAT_ARCHIVE_ASSETS}
                onUseTemplate={(tpl) =>
                  handleCreateNewDocument({ template: tpl, openWizard: false })
                }
                onUpdateTemplate={(updatedTpl) => {
                  const next = templates.map((t) =>
                    t.id === updatedTpl.id ? updatedTpl : t
                  );
                  setTemplates(next);
                  saveToIndexedDB('templates', next);
                }}
                onCreateCorrespondenceFromArchiveAsset={
                  handleCreateFromArchiveAsset
                }
                onNavigateToWorkspaceImport={() => setActiveView('workspace')}
              />
            )}

            {activeView === 'workspace' && (
              <WorkspaceImportView
                onAddTemplate={(newTpl) => {
                  const next = [newTpl, ...templates];
                  setTemplates(next);
                  saveToIndexedDB('templates', next);
                }}
                onUseTemplateDirectly={(newTpl) => {
                  handleCreateNewDocument({ template: newTpl, openWizard: false });
                }}
                onUploadCustomFont={(font) => {
                  const next = [...customFonts, font];
                  setCustomFonts(next);
                  saveToIndexedDB('customFonts', next);
                }}
              />
            )}

            {activeView === 'contacts' && (
              <OrgContactsView
                contacts={contacts}
                onSaveContact={(saved) => {
                  const exists = contacts.some((c) => c.id === saved.id);
                  const next = exists
                    ? contacts.map((c) => (c.id === saved.id ? saved : c))
                    : [saved, ...contacts];
                  setContacts(next);
                  saveToIndexedDB('contacts', next);
                }}
                onStartCorrespondenceToContact={(contact) =>
                  handleCreateNewDocument({ contact, openWizard: false })
                }
              />
            )}

            {activeView === 'settings' && (
              <IdentitySettingsView
                identityVersions={identityVersions}
                signatures={signatures}
                numberingConfig={numberingConfig}
                phrases={phrases}
                customFonts={customFonts}
                aiEnabled={aiEnabled}
                onUpdateIdentityVersions={(vers) => {
                  setIdentityVersions(vers);
                  saveToIndexedDB('identityVersions', vers);
                }}
                onUpdateSignatures={(sigs) => {
                  setSignatures(sigs);
                  saveToIndexedDB('signatures', sigs);
                }}
                onUpdateNumbering={(cfg) => {
                  setNumberingConfig(cfg);
                  saveToIndexedDB('numberingConfig', cfg);
                }}
                onUpdatePhrases={(ph) => {
                  setPhrases(ph);
                  saveToIndexedDB('phrases', ph);
                }}
                onToggleAi={(enabled) => {
                  setAiEnabled(enabled);
                  saveToIndexedDB('aiEnabled', enabled);
                }}
                onExportFullBackup={handleExportFullBackup}
                onImportFullBackup={handleImportFullBackup}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
