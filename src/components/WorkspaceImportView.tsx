import React, { useState, useEffect } from 'react';
import {
  ReferenceTemplate,
  CustomUploadedFont,
  DocumentType,
  RecipientCategoryType,
  ProtocolLevel,
} from '../types/correspondence';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  searchGmailAdministrativeMessages,
  searchGoogleDriveFiles,
  fetchDriveFileContentForAnalysis,
  GmailCandidateMessage,
  DriveCandidateFile,
} from '../services/firebaseWorkspace';
import { registerCustomFontInDOM } from '../services/storageService';
import {
  Mail,
  HardDrive,
  Upload,
  Search,
  Sparkles,
  CheckCircle2,
  FileText,
  RefreshCw,
  LogOut,
  ShieldCheck,
  FolderOpen,
  Type,
  ArrowUpLeft,
} from 'lucide-react';

interface WorkspaceImportViewProps {
  onAddTemplate: (newTemplate: ReferenceTemplate) => void;
  onUseTemplateDirectly: (newTemplate: ReferenceTemplate) => void;
  onUploadCustomFont: (font: CustomUploadedFont) => void;
}

export const WorkspaceImportView: React.FC<WorkspaceImportViewProps> = ({
  onAddTemplate,
  onUseTemplateDirectly,
  onUploadCustomFont,
}) => {
  const [activeSource, setActiveSource] = useState<'local' | 'gmail' | 'drive'>(
    'local'
  );
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Gmail State
  const [gmailQuery, setGmailQuery] = useState<string>(
    'مراسلة OR كتاب OR إرسالية OR ورقة إرسال OR وزارة العدل OR سطات OR صفقة'
  );
  const [gmailMessages, setGmailMessages] = useState<GmailCandidateMessage[]>(
    []
  );
  const [gmailLoading, setGmailLoading] = useState<boolean>(false);

  // Drive State
  const [driveKeyword, setDriveKeyword] = useState<string>('');
  const [driveFilter, setDriveFilter] = useState<
    'all' | 'docs' | 'sheets' | 'images' | 'folders'
  >('all');
  const [driveFiles, setDriveFiles] = useState<DriveCandidateFile[]>([]);
  const [driveLoading, setDriveLoading] = useState<boolean>(false);

  // OCR & Template Analysis State
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string>('');
  const [extractedTemplate, setExtractedTemplate] =
    useState<ReferenceTemplate | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUserEmail(user.email || user.displayName || 'حساب Google متصل');
      },
      () => {
        setGoogleUserEmail(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleConnect = async () => {
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setGoogleUserEmail(
          res.user.email || res.user.displayName || 'حساب Google متصل'
        );
      }
    } catch (err: any) {
      setAuthError(
        err.message || 'تعذر تسجيل الدخول عبر حساب Google. يرجى المحاولة مجدداً.'
      );
    }
  };

  const handleSearchGmail = async () => {
    setGmailLoading(true);
    setAuthError(null);
    try {
      const msgs = await searchGmailAdministrativeMessages(gmailQuery);
      setGmailMessages(msgs);
    } catch (err: any) {
      if (err.message === 'NEEDS_AUTH') {
        setAuthError('يرجى ربط حساب Google أولاً للوصول إلى رسائل Gmail الإدارية.');
      } else {
        setAuthError(err.message);
      }
    } finally {
      setGmailLoading(false);
    }
  };

  const handleSearchDrive = async () => {
    setDriveLoading(true);
    setAuthError(null);
    try {
      const files = await searchGoogleDriveFiles(driveKeyword, driveFilter);
      setDriveFiles(files);
    } catch (err: any) {
      if (err.message === 'NEEDS_AUTH') {
        setAuthError('يرجى ربط حساب Google أولاً للوصول إلى ملفات Google Drive.');
      } else {
        setAuthError(err.message);
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const runServerDocumentAnalysis = async (payload: {
    fileName: string;
    mimeType: string;
    fileBase64?: string;
    textContent?: string;
    sourceType: ReferenceTemplate['sourceType'];
    previewUrl?: string;
  }) => {
    setAnalyzing(true);
    setAnalysisError(null);
    setSavedNotice(null);
    setUploadedFileName(payload.fileName);
    setUploadedPreviewUrl(payload.previewUrl || '');

    try {
      const res = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          fileBase64: payload.fileBase64,
          textContent: payload.textContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر تحليل الوثيقة.');
      }

      const lang = data.language === 'fr' ? 'fr' : 'ar';
      const newTpl: ReferenceTemplate = {
        id: `tpl-imported-${Date.now()}`,
        title: data.title || `نموذج مستخرج من: ${payload.fileName}`,
        code: `IMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
        status: 'قيد المراجعة',
        language: lang,
        docType: (data.docType as DocumentType) || 'كتاب إداري رسمي',
        recipientCategory:
          (data.recipientCategory as RecipientCategoryType) || 'central',
        targetRecipientRoleAr: data.targetRecipientRoleAr || 'السيد وزير العدل',
        targetRecipientRoleFr:
          data.targetRecipientRoleFr || 'Monsieur le Ministre de la Justice',
        protocolLevel: (data.protocolLevel as ProtocolLevel) || 2,
        addresseeFormatAr:
          Array.isArray(data.addresseeLines) && lang === 'ar'
            ? data.addresseeLines
            : ['إلى', `السيد ${data.targetRecipientRoleAr || 'وزير العدل'}`],
        addresseeFormatFr:
          Array.isArray(data.addresseeLines) && lang === 'fr'
            ? data.addresseeLines
            : ['A', `Monsieur le ${data.targetRecipientRoleFr || 'Ministre de la Justice'}`],
        supervisoryLineAr: data.supervisoryLine || '',
        defaultSubject: data.subject || '',
        defaultReference: data.reference || '',
        salutation:
          data.salutation ||
          (lang === 'ar' ? 'سلام تام بوجود مولانا الإمام،' : ''),
        openingFormula: data.openingFormula || '',
        bodyTemplate: data.bodyTemplate || data.extractedRawText || '',
        closingFormula:
          data.closingFormula ||
          (lang === 'ar'
            ? 'وتفضلوا بقبول فائق الاحترام والتقدير. والسلام./.'
            : 'Veuillez agréer, Monsieur, mes salutations distinguées.'),
        defaultAttachments: [],
        sourceFileName: payload.fileName,
        sourceAssetUrl: payload.previewUrl || '',
        sourceType: payload.sourceType,
        originalDate: new Date().toISOString().slice(0, 10),
        originalOutgoingNumber: 'مستورد',
        detectedFontFamily: data.detectedFontFamily || 'Amiri',
        detectedFontSizePt: 13.5,
        detectedLineHeight: 1.8,
        visualAnalysisNotes:
          data.visualAnalysisNotes ||
          'تم استخراج البنية الشكلية والفقرات آلياً عبر محلل الوثائق الإدارية.',
        linguisticAnalysisNotes:
          data.linguisticAnalysisNotes ||
          'صياغة إدارية مستخرجة مع الحفاظ على الديباجة والخاتمة البروتوكولية.',
        extractedRawText: data.extractedRawText || '',
      };

      setExtractedTemplate(newTpl);
    } catch (err: any) {
      setAnalysisError(err.message || 'حدث خطأ أثناء تحليل الوثيقة.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLocalFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's a custom font (.ttf / .otf / .woff)
    if (/\.(ttf|otf|woff|woff2)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = String(reader.result || '');
        const cleanFontName = file.name.replace(/\.(ttf|otf|woff|woff2)$/i, '');
        const customFont: CustomUploadedFont = {
          id: `font-${Date.now()}`,
          name: cleanFontName,
          fileName: file.name,
          dataUrl,
          language: 'ar',
          uploadedAt: new Date().toISOString(),
        };
        await registerCustomFontInDOM(customFont);
        onUploadCustomFont(customFont);
        setSavedNotice(
          `تم تثبيت الخط الرسمي «${cleanFontName}» بنجاح وأصبح متاحاً في محرر المراسلات والطباعة.`
        );
      };
      reader.readAsDataURL(file);
      return;
    }

    // Standard document or image upload for OCR & template extraction
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = String(reader.result || '');
      const base64Idx = dataUrl.indexOf(',');
      const base64 = base64Idx >= 0 ? dataUrl.slice(base64Idx + 1) : dataUrl;

      await runServerDocumentAnalysis({
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        fileBase64: base64,
        sourceType: file.type.includes('image') ? 'Image' : 'PDF',
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#1e3a8a]" />
            <span>
              استيراد الوثائق والنماذج والخطوط (Gmail · Google Drive · Docs · Sheets · OCR محلي)
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            استخرج النماذج الإدارية والجداول والخطوط من حسابك المهني على Google Workspace أو ارفع ملفات PDF وصور المراسلات الممسوحة ضوئياً لتحويلها إلى قوالب قابلة للتحرير.
          </p>
        </div>

        {/* Google Workspace Connection Status & Official Button */}
        <div className="flex items-center gap-3">
          {googleUserEmail ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-lg text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-bold text-emerald-950">{googleUserEmail}</span>
              <button
                type="button"
                onClick={() => logoutGoogle()}
                className="text-red-700 hover:underline font-semibold flex items-center gap-1 mr-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>فصل</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleConnect}
              className="gsi-material-button"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  Sign in with Google Workspace
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {authError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-950 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{authError}</span>
          <button
            type="button"
            onClick={handleGoogleConnect}
            className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg"
          >
            ربط حساب Google الآن
          </button>
        </div>
      )}

      {savedNotice && (
        <div className="bg-emerald-900 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{savedNotice}</span>
          </div>
          <button onClick={() => setSavedNotice(null)}>إغلاق</button>
        </div>
      )}

      {/* Source Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveSource('local')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
            activeSource === 'local'
              ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>1. رفع ملف محلي (PDF / صورة ممسوحة OCR / خط رسمي TTF/OTF)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSource('gmail')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
            activeSource === 'gmail'
              ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>2. استيراد المراسلات والنماذج من البريد الإلكتروني (Gmail)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSource('drive')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
            activeSource === 'drive'
              ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>3. استيراد من Google Drive وGoogle Docs وGoogle Sheets</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Browser / Uploader (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          {activeSource === 'local' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                رفع وثيقة رسمية (PDF / JPG / PNG) أو ملف خط (TTF / OTF)
              </h3>
              <label className="border-2 border-dashed border-slate-300 hover:border-[#1e3a8a] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/70 transition-colors">
                <Upload className="w-8 h-8 text-[#1e3a8a] mb-2" />
                <span className="text-xs font-bold text-slate-900">
                  اضغط لاختيار ملف من حاسوبك أو اسحبه إلى هنا
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  يدعم: PDF، صور المراسلات الممسوحة ضوئياً (JPG/PNG)، أو ملفات الخطوط العربية والفرنسية (.ttf, .otf)
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.ttf,.otf,.woff,.txt"
                  onChange={handleLocalFileUpload}
                  className="hidden"
                />
              </label>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#1e3a8a]" />
                  <span>كيف يعمل محلل الوثائق الإدارية والخطوط؟</span>
                </div>
                <p>
                  عند رفع صورة مراسلة أو ملف PDF، يقوم النظام بقراءته ضوئياً (OCR) وتفكيك عناصره (المرسل إليه، الموضوع، المرجع، التحية، المتن، الخاتمة، ونوع الخط) لتحويله إلى قالب جاهز في مكتبة النماذج.
                </p>
              </div>
            </div>
          )}

          {activeSource === 'gmail' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  البحث الانتقائي في رسائل Gmail الإدارية (قراءة فقط بموافقتك)
                </h3>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={gmailQuery}
                  onChange={(e) => setGmailQuery(e.target.value)}
                  placeholder="كلمات البحث في Gmail..."
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  disabled={gmailLoading}
                  onClick={handleSearchGmail}
                  className="bg-[#1e3a8a] text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{gmailLoading ? 'جاري البحث...' : 'بحث في Gmail'}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {gmailMessages.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    اضغط على «بحث في Gmail» بعد ربط حساب Google لعرض الرسائل ذات الصلة بالمراسلات الإدارية.
                  </div>
                ) : (
                  gmailMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="py-3 flex flex-col gap-1.5 hover:bg-slate-50 px-2 rounded"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold truncate max-w-xs">
                          {msg.from}
                        </span>
                        <span className="tabular-nums">{msg.date}</span>
                      </div>
                      <div className="font-bold text-xs text-slate-900">
                        {msg.subject}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {msg.snippet}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500">
                          المرفقات: {msg.attachments.length}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            runServerDocumentAnalysis({
                              fileName: `Gmail: ${msg.subject}`,
                              mimeType: 'text/plain',
                              textContent: `الموضوع: ${msg.subject}\nالمرسل: ${msg.from}\nالتاريخ: ${msg.date}\n\n${msg.bodyText}`,
                              sourceType: 'Gmail',
                            })
                          }
                          className="text-xs font-bold text-[#1e3a8a] hover:underline flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تحليل الرسالة واستخراج نموذج رسمي</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeSource === 'drive' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                البحث في ملفات Google Drive وGoogle Docs وGoogle Sheets
              </h3>

              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={driveKeyword}
                  onChange={(e) => setDriveKeyword(e.target.value)}
                  placeholder="اسم الملف أو الكلمة المفتاحية (مثال: مراسلة، صفقة، ورقة إرسال)..."
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
                <select
                  value={driveFilter}
                  onChange={(e) => setDriveFilter(e.target.value as any)}
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-semibold"
                >
                  <option value="all">جميع الملفات</option>
                  <option value="docs">PDF / Google Docs / Word</option>
                  <option value="sheets">Google Sheets / Excel</option>
                  <option value="images">صور الوثائق الممسوحة</option>
                </select>
                <button
                  type="button"
                  disabled={driveLoading}
                  onClick={handleSearchDrive}
                  className="bg-[#1e3a8a] text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{driveLoading ? 'جاري الجلب...' : 'استعراض Drive'}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {driveFiles.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    اضغط على «استعراض Drive» لعرض الوثائق والمستندات والجداول المحفوظة في حسابك.
                  </div>
                ) : (
                  driveFiles.map((df) => (
                    <div
                      key={df.id}
                      className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 rounded"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {df.name}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {df.mimeType} · آخر تعديل: {df.modifiedTime?.slice(0, 10)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setAnalyzing(true);
                            const content =
                              await fetchDriveFileContentForAnalysis(df);
                            await runServerDocumentAnalysis({
                              fileName: df.name,
                              mimeType: content.mimeType,
                              fileBase64: content.fileBase64,
                              textContent: content.textContent,
                              sourceType: 'Drive',
                            });
                          } catch (err: any) {
                            setAnalysisError(err.message);
                            setAnalyzing(false);
                          }
                        }}
                        className="shrink-0 bg-blue-50 text-[#1e3a8a] border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold"
                      >
                        تحليل واستيراد
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Extracted Template Result & Comparison (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>نتيجة التفكيك والتحليل الهيكلي للوثيقة المستوردة</span>
          </h3>

          {analyzing && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#1e3a8a] animate-spin" />
              <div className="text-xs font-bold text-slate-800">
                جاري تحليل الوثيقة ({uploadedFileName}) واستخراج البنية الإدارية...
              </div>
            </div>
          )}

          {analysisError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
              {analysisError}
            </div>
          )}

          {!analyzing && !extractedTemplate && !analysisError && (
            <div className="py-12 text-center text-xs text-slate-500">
              اختر ملفاً محلياً أو رسالة من Gmail أو مستنداً من Google Drive على اليمين ليتم تفكيكه وتحويله إلى نموذج رسمي قابل للتعديل.
            </div>
          )}

          {extractedTemplate && !analyzing && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700">عنوان النموذج: </span>
                  <input
                    type="text"
                    value={extractedTemplate.title}
                    onChange={(e) =>
                      setExtractedTemplate({
                        ...extractedTemplate,
                        title: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1 mt-1 font-bold bg-white"
                  />
                </div>

                <div>
                  <span className="font-bold text-slate-700">الموضوع المستخرج: </span>
                  <input
                    type="text"
                    value={extractedTemplate.defaultSubject}
                    onChange={(e) =>
                      setExtractedTemplate({
                        ...extractedTemplate,
                        defaultSubject: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2.5 py-1 mt-1 bg-white"
                  />
                </div>

                <div>
                  <span className="font-bold text-slate-700">المتن المستخرج: </span>
                  <textarea
                    rows={6}
                    value={extractedTemplate.bodyTemplate}
                    onChange={(e) =>
                      setExtractedTemplate({
                        ...extractedTemplate,
                        bodyTemplate: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded p-2 mt-1 bg-white leading-relaxed"
                  />
                </div>
              </div>

              {uploadedPreviewUrl && (
                <div className="text-xs text-slate-500">
                  تم ربط المعاينة الأصلية للملف ({uploadedFileName}) بهذا النموذج للمقارنة البصرية.
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onAddTemplate({
                      ...extractedTemplate,
                      status: 'معتمد',
                    });
                    setSavedNotice(
                      `تم حفظ النموذج «${extractedTemplate.title}» في مكتبة النماذج الرسمية كمعتمد.`
                    );
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>حفظ في مكتبة النماذج الرسمية (معتمد)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onAddTemplate(extractedTemplate);
                    onUseTemplateDirectly(extractedTemplate);
                  }}
                  className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <span>فتح مباشرة في محرر المراسلات</span>
                  <ArrowUpLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
