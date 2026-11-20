import React, { useState, useMemo } from 'react';
import {
  ReferenceTemplate,
  TemplateApprovalStatus,
  LanguageCode,
} from '../types/correspondence';
import { RealSettatArchiveAsset } from '../data/initialData';
import {
  BookOpen,
  FileText,
  Search,
  CheckCircle2,
  Eye,
  ArrowUpLeft,
  Filter,
  Sparkles,
  Plus,
  Edit3,
  Archive,
} from 'lucide-react';

interface ReferenceLibraryViewProps {
  templates: ReferenceTemplate[];
  archiveAssets: RealSettatArchiveAsset[];
  onUseTemplate: (template: ReferenceTemplate) => void;
  onUpdateTemplate: (updated: ReferenceTemplate) => void;
  onCreateCorrespondenceFromArchiveAsset: (asset: RealSettatArchiveAsset) => void;
  onNavigateToWorkspaceImport: () => void;
}

const APPROVAL_STATUSES: TemplateApprovalStatus[] = [
  'معتمد',
  'مرجعي للاستئناس',
  'قيد المراجعة',
  'قديم',
  'ملغى',
];

export const ReferenceLibraryView: React.FC<ReferenceLibraryViewProps> = ({
  templates,
  archiveAssets,
  onUseTemplate,
  onUpdateTemplate,
  onCreateCorrespondenceFromArchiveAsset,
  onNavigateToWorkspaceImport,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'raw_archive'>(
    'templates'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [langFilter, setLangFilter] = useState<'all' | LanguageCode>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TemplateApprovalStatus>(
    'all'
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    archiveAssets[0]?.id || ''
  );
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (langFilter !== 'all' && t.language !== langFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.defaultSubject.toLowerCase().includes(q) ||
        t.targetRecipientRoleAr.toLowerCase().includes(q) ||
        t.bodyTemplate.toLowerCase().includes(q) ||
        t.sourceFileName.toLowerCase().includes(q)
      );
    });
  }, [templates, langFilter, statusFilter, searchQuery]);

  const filteredArchiveAssets = useMemo(() => {
    return archiveAssets.filter((a) => {
      if (langFilter !== 'all' && a.language !== langFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.subject.toLowerCase().includes(q) ||
        a.recipient.toLowerCase().includes(q) ||
        a.outgoingNumber.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.fileName.toLowerCase().includes(q)
      );
    });
  }, [archiveAssets, langFilter, searchQuery]);

  const activeTemplate = useMemo(
    () =>
      templates.find((t) => t.id === selectedTemplateId) ||
      filteredTemplates[0] ||
      templates[0],
    [templates, selectedTemplateId, filteredTemplates]
  );

  const activeAsset = useMemo(
    () =>
      archiveAssets.find((a) => a.id === selectedAssetId) ||
      filteredArchiveAssets[0] ||
      archiveAssets[0],
    [archiveAssets, selectedAssetId, filteredArchiveAssets]
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#1e3a8a]" />
            <span>مكتبة النماذج الرسمية وأرشيف المراسلات المرجعية — سطات</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            جميع النماذج مستخرجة ومحللة بصرياً ولغوياً من الوثائق الرسمية الصادرة عن المديرية الإقليمية للعدل بسطات (2020 - 2026)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('templates')}
              className={`px-3.5 py-1.5 rounded-md transition-colors ${
                activeSubTab === 'templates'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              النماذج المهيكلة المعتمدة ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('raw_archive')}
              className={`px-3.5 py-1.5 rounded-md transition-colors ${
                activeSubTab === 'raw_archive'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              الوثائق الأصلية المرفقة PDF/JPG ({archiveAssets.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onNavigateToWorkspaceImport}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>استيراد نموذج من Gmail / Drive / ملف محلي</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-3 shrink-0">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالموضوع، اسم الشركة، المديرية المركزية، رقم الصادر، أو نوع الوثيقة..."
            className="w-full border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:border-[#1e3a8a] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value as any)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold bg-white"
          >
            <option value="all">جميع اللغات (عربي + فرنسي)</option>
            <option value="ar">العربية (RTL)</option>
            <option value="fr">الفرنسية (LTR)</option>
          </select>

          {activeSubTab === 'templates' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold bg-white"
            >
              <option value="all">جميع حالات الاعتماد</option>
              {APPROVAL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Content Split View */}
      {activeSubTab === 'templates' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Templates List (5 cols) */}
          <div className="lg:col-span-5 border-l border-slate-200 bg-white overflow-y-auto divide-y divide-slate-100">
            {filteredTemplates.map((tpl) => {
              const isSelected = activeTemplate?.id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setIsEditingTemplate(false);
                  }}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 border-r-4 border-[#1e3a8a]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-bold text-slate-700 tabular-nums">
                      {tpl.code} · {tpl.docType}
                    </span>
                    <span
                      className={`font-bold ${
                        tpl.status === 'معتمد'
                          ? 'text-emerald-700'
                          : tpl.status === 'مرجعي للاستئناس'
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {tpl.status}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mb-1">
                    {tpl.title}
                  </div>
                  <div className="text-xs text-slate-600 line-clamp-2 mb-2">
                    {tpl.defaultSubject}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>المخاطب: {tpl.targetRecipientRoleAr}</span>
                    <span className="tabular-nums">
                      الأصل: {tpl.originalOutgoingNumber} ({tpl.originalDate})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Template Inspector & Side-by-Side Original Document Viewer (7 cols) */}
          <div className="lg:col-span-7 overflow-y-auto p-6 space-y-6">
            {activeTemplate && (
              <>
                {/* Action Header Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-bold text-[#1e3a8a]">
                          {activeTemplate.docType}
                        </span>
                        <span>·</span>
                        <span>
                          اللغة: {activeTemplate.language === 'ar' ? 'العربية' : 'الفرنسية'}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          الوثيقة المرجعية عدد {activeTemplate.originalOutgoingNumber} بتاريخ{' '}
                          {activeTemplate.originalDate}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">
                        {activeTemplate.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={activeTemplate.status}
                        onChange={(e) =>
                          onUpdateTemplate({
                            ...activeTemplate,
                            status: e.target.value as TemplateApprovalStatus,
                          })
                        }
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-slate-50"
                      >
                        {APPROVAL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            الحالة: {st}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                        className="border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditingTemplate ? 'إغلاق التعديل' : 'تعديل القالب'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onUseTemplate(activeTemplate)}
                        className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <span>استعمال النموذج في مراسلة جديدة</span>
                        <ArrowUpLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visual & Linguistic Analysis Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-[#1e3a8a]" />
                        <span>التحليل البصري والطباعي للوثيقة الأصلية:</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {activeTemplate.visualAnalysisNotes}
                      </p>
                      <div className="text-[11px] text-slate-500 pt-1 tabular-nums">
                        الخط المرصود: <strong>{activeTemplate.detectedFontFamily}</strong> · الحجم:{' '}
                        <strong>{activeTemplate.detectedFontSizePt}pt</strong> · التباعد:{' '}
                        <strong>{activeTemplate.detectedLineHeight}</strong>
                      </div>
                    </div>

                    <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-200 text-xs space-y-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>التحليل اللغوي والبروتوكولي:</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {activeTemplate.linguisticAnalysisNotes}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Editable Template Content vs Structured Preview */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                    البنية النصية المستخرجة للقالب (جاهزة للتعبئة الفورية):
                  </h4>

                  {isEditingTemplate ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          عنوان النموذج
                        </label>
                        <input
                          type="text"
                          value={activeTemplate.title}
                          onChange={(e) =>
                            onUpdateTemplate({
                              ...activeTemplate,
                              title: e.target.value,
                            })
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          الموضوع الافتراضي
                        </label>
                        <input
                          type="text"
                          value={activeTemplate.defaultSubject}
                          onChange={(e) =>
                            onUpdateTemplate({
                              ...activeTemplate,
                              defaultSubject: e.target.value,
                            })
                          }
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          متن النموذج (يدعم متغيرات مثل [التاريخ] و[الرقم])
                        </label>
                        <textarea
                          rows={8}
                          value={activeTemplate.bodyTemplate}
                          onChange={(e) =>
                            onUpdateTemplate({
                              ...activeTemplate,
                              bodyTemplate: e.target.value,
                            })
                          }
                          className="w-full border border-slate-300 rounded-lg p-3 text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs"
                      dir={activeTemplate.language === 'fr' ? 'ltr' : 'rtl'}
                    >
                      <div className="text-center font-bold text-slate-900">
                        {(activeTemplate.language === 'fr'
                          ? activeTemplate.addresseeFormatFr
                          : activeTemplate.addresseeFormatAr
                        ).map((l, i) => (
                          <div key={i}>{l}</div>
                        ))}
                      </div>
                      <div>
                        <strong>
                          {activeTemplate.language === 'fr' ? 'Objet : ' : 'الموضوع : '}
                        </strong>
                        {activeTemplate.defaultSubject}
                      </div>
                      {activeTemplate.defaultReference && (
                        <div>
                          <strong>
                            {activeTemplate.language === 'fr'
                              ? 'Référence : '
                              : 'المرجع : '}
                          </strong>
                          {activeTemplate.defaultReference}
                        </div>
                      )}
                      <div className="pt-2 whitespace-pre-wrap leading-relaxed text-slate-800">
                        {activeTemplate.bodyTemplate}
                      </div>
                      <div className="pt-2 font-bold text-center text-slate-900">
                        {activeTemplate.closingFormula}
                      </div>
                    </div>
                  )}
                </div>

                {/* Original Settat Document Viewer (PDF / Image) */}
                {activeTemplate.sourceAssetUrl && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold">
                        المعاينة المباشرة للوثيقة الأصلية المرفقة ({activeTemplate.sourceFileName})
                      </span>
                      <a
                        href={activeTemplate.sourceAssetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-300 hover:underline font-semibold"
                      >
                        فتح الملف الأصلي الكامل ↗
                      </a>
                    </div>
                    <div className="p-4 bg-slate-100 flex justify-center">
                      {activeTemplate.sourceType === 'Image' ||
                      activeTemplate.sourceAssetUrl.endsWith('.jpg') ||
                      activeTemplate.sourceAssetUrl.endsWith('.png') ? (
                        <img
                          src={activeTemplate.sourceAssetUrl}
                          alt={activeTemplate.title}
                          className="max-h-[650px] object-contain rounded shadow-md border border-slate-300 bg-white"
                        />
                      ) : (
                        <iframe
                          src={activeTemplate.sourceAssetUrl}
                          title={activeTemplate.title}
                          className="w-full h-[600px] rounded border border-slate-300 bg-white"
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Sub-Tab 2: Full Raw Archive of the 36 Real Settat Documents */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <div className="lg:col-span-5 border-l border-slate-200 bg-white overflow-y-auto divide-y divide-slate-100">
            {filteredArchiveAssets.map((asset) => {
              const isSelected = activeAsset?.id === asset.id;
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 border-r-4 border-[#1e3a8a]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1 tabular-nums">
                    <span className="font-bold text-[#1e3a8a]">
                      الصادر رقم: {asset.outgoingNumber} · التاريخ: {asset.date}
                    </span>
                    <span>
                      {asset.fileType} ({asset.pagesCount} ص)
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mb-1">
                    {asset.subject}
                  </div>
                  <div className="text-xs text-slate-600 mb-1">
                    <strong>المرسل إليه:</strong> {asset.recipient}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2">
                    {asset.summary}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7 overflow-y-auto p-6 space-y-4">
            {activeAsset && (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                      <Archive className="w-3.5 h-3.5 text-[#1e3a8a]" />
                      <span className="font-bold text-slate-800">
                        وثيقة أصلية رقم {activeAsset.outgoingNumber}
                      </span>
                      <span>·</span>
                      <span>بتاريخ {activeAsset.date}</span>
                      <span>·</span>
                      <span>{activeAsset.docType}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {activeAsset.subject}
                    </h3>
                    <p className="text-xs text-slate-600">
                      <strong>المرسل إليه:</strong> {activeAsset.recipient}
                    </p>
                    {activeAsset.reference && (
                      <p className="text-xs text-slate-500">
                        <strong>المرجع:</strong> {activeAsset.reference}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onCreateCorrespondenceFromArchiveAsset(activeAsset)
                    }
                    className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" />
                    <span>إنشاء مراسلة جديدة على غرار هذه الوثيقة</span>
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold">
                      معاينة الملف الأصلي الممسوح ضوئياً ({activeAsset.fileName})
                    </span>
                    <span className="tabular-nums">
                      عدد الصفحات: {activeAsset.pagesCount}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-100 flex justify-center">
                    {activeAsset.fileType === 'Image' ? (
                      <img
                        src={activeAsset.assetUrl}
                        alt={activeAsset.subject}
                        className="max-h-[700px] object-contain rounded shadow border border-slate-300 bg-white"
                      />
                    ) : (
                      <iframe
                        src={activeAsset.assetUrl}
                        title={activeAsset.subject}
                        className="w-full h-[650px] rounded border border-slate-300 bg-white"
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
