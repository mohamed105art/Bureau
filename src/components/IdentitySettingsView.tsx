import React, { useState } from 'react';
import {
  InstitutionalIdentityVersion,
  SignatureProfile,
  NumberingConfig,
  ProtocolPhrase,
  CustomUploadedFont,
} from '../types/correspondence';
import { SystemBackupBundle, downloadJsonFile } from '../services/storageService';
import {
  Shield,
  Image as ImageIcon,
  PenTool,
  Hash,
  Database,
  Upload,
  Download,
  CheckCircle2,
  History,
  Sparkles,
  Plus,
} from 'lucide-react';

interface IdentitySettingsViewProps {
  identityVersions: InstitutionalIdentityVersion[];
  signatures: SignatureProfile[];
  numberingConfig: NumberingConfig;
  phrases: ProtocolPhrase[];
  customFonts: CustomUploadedFont[];
  aiEnabled: boolean;
  onUpdateIdentityVersions: (versions: InstitutionalIdentityVersion[]) => void;
  onUpdateSignatures: (sigs: SignatureProfile[]) => void;
  onUpdateNumbering: (cfg: NumberingConfig) => void;
  onUpdatePhrases: (phrases: ProtocolPhrase[]) => void;
  onToggleAi: (enabled: boolean) => void;
  onExportFullBackup: () => void;
  onImportFullBackup: (bundle: SystemBackupBundle) => void;
}

export const IdentitySettingsView: React.FC<IdentitySettingsViewProps> = ({
  identityVersions,
  signatures,
  numberingConfig,
  phrases,
  customFonts,
  aiEnabled,
  onUpdateIdentityVersions,
  onUpdateSignatures,
  onUpdateNumbering,
  onUpdatePhrases,
  onToggleAi,
  onExportFullBackup,
  onImportFullBackup,
}) => {
  const [activeSection, setActiveSection] = useState<
    'identity' | 'signatures' | 'numbering' | 'phrases' | 'backup'
  >('identity');

  const currentIdentity =
    identityVersions.find((v) => v.isCurrent) || identityVersions[0];

  const [draftIdentity, setDraftIdentity] =
    useState<InstitutionalIdentityVersion>(currentIdentity);
  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleImageUpload = (
    field: 'headerImageUrl' | 'footerImageUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      setDraftIdentity({
        ...draftIdentity,
        [field]: dataUrl,
      });
      showToast('تم تحميل الصورة الجديدة في المعاينة. اضغط على «اعتماد التعديلات» لحفظها.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCurrentIdentity = (asNewVersion: boolean) => {
    if (asNewVersion) {
      const newVer: InstitutionalIdentityVersion = {
        ...draftIdentity,
        id: `id-ver-${Date.now()}`,
        versionName: `${draftIdentity.versionName} (${new Date()
          .toISOString()
          .slice(0, 10)})`,
        createdAt: new Date().toISOString().slice(0, 10),
        isCurrent: true,
      };
      const updatedList = identityVersions.map((v) => ({
        ...v,
        isCurrent: false,
      }));
      onUpdateIdentityVersions([newVer, ...updatedList]);
      setDraftIdentity(newVer);
      showToast(
        'تم حفظ نسخة جديدة من الهوية المؤسساتية واعتمادها للمراسلات الجديدة دون المساس بالوثائق السابقة.'
      );
    } else {
      const updatedList = identityVersions.map((v) =>
        v.id === draftIdentity.id ? { ...draftIdentity, isCurrent: true } : v
      );
      onUpdateIdentityVersions(updatedList);
      showToast('تم تحديث الهوية المؤسساتية الحالية بنجاح.');
    }
  };

  const handleSwitchIdentityVersion = (verId: string) => {
    const target = identityVersions.find((v) => v.id === verId);
    if (!target) return;
    const updatedList = identityVersions.map((v) => ({
      ...v,
      isCurrent: v.id === verId,
    }));
    onUpdateIdentityVersions(updatedList);
    setDraftIdentity({ ...target, isCurrent: true });
    showToast(`تم تفعيل النسخة المؤسساتية: ${target.versionName}`);
  };

  const handleBackupFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as SystemBackupBundle;
        onImportFullBackup(parsed);
        showToast(
          'تم استرجاع النسخة الاحتياطية ودمج السجلات بنجاح مع منع تكرار الوثائق والمخاطبين.'
        );
      } catch {
        showToast('ملف النسخة الاحتياطية غير صالح. يرجى اختيار ملف JSON صحيح.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1e3a8a]" />
            <span>إدارة الهوية المؤسساتية والترويسة والتذييل وإعدادات المنظومة</span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            الترويسة والتذييل مستقلان تماماً عن محتوى المراسلات؛ وكل وثيقة صادرة تحتفظ بنسخة الهوية التاريخية التي صدرت بها.
          </p>
        </div>

        {/* AI Assistant Global Toggle */}
        <label className="flex items-center gap-2.5 bg-blue-50/70 border border-blue-200 px-4 py-2 rounded-xl text-xs font-bold text-[#1e3a8a] cursor-pointer">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>تفعيل المساعد الإداري الذكي الاختياري في المحرر</span>
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => onToggleAi(e.target.checked)}
            className="rounded text-[#1e3a8a]"
          />
        </label>
      </div>

      {notice && (
        <div className="bg-emerald-900 text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)}>إغلاق</button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            id: 'identity',
            label: '1. الترويسة والتذييل والهوية المؤسساتية',
            icon: ImageIcon,
          },
          {
            id: 'signatures',
            label: '2. التوقيعات والصفات الوظيفية والختم',
            icon: PenTool,
          },
          {
            id: 'numbering',
            label: '3. قواعد الترقيم التلقائي للصادر',
            icon: Hash,
          },
          {
            id: 'phrases',
            label: '4. عبارات البروتوكول (الديباجات والخواتم)',
            icon: History,
          },
          {
            id: 'backup',
            label: '5. النسخ الاحتياطي والاسترجاع والأمان',
            icon: Database,
          },
        ].map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                activeSection === sec.id
                  ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: Institutional Identity, Header & Footer */}
      {activeSection === 'identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                إعدادات الترويسة الرسمية والتذييل والهوامش
              </h3>
              <select
                value={draftIdentity.id}
                onChange={(e) => handleSwitchIdentityVersion(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-slate-50"
              >
                {identityVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.isCurrent ? '★ ' : ''}
                    {v.versionName}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload / Replace Header & Footer Images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>صورة الترويسة الرسمية (En-tête)</span>
                  <input
                    type="checkbox"
                    checked={draftIdentity.useImageHeader}
                    onChange={(e) =>
                      setDraftIdentity({
                        ...draftIdentity,
                        useImageHeader: e.target.checked,
                      })
                    }
                  />
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 flex items-center justify-center h-20">
                  <img
                    src={draftIdentity.headerImageUrl}
                    alt="Header preview"
                    className="max-h-16 object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع ترويسة جديدة</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('headerImageUrl', e)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftIdentity({
                        ...draftIdentity,
                        headerImageUrl: '/assets/aistudio/en_tete_55f49eed.png',
                      })
                    }
                    className="text-[11px] text-slate-600 hover:underline font-semibold"
                  >
                    استعادة الأصلية
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>صورة التذييل الرسمي (En-pied)</span>
                  <input
                    type="checkbox"
                    checked={draftIdentity.useImageFooter}
                    onChange={(e) =>
                      setDraftIdentity({
                        ...draftIdentity,
                        useImageFooter: e.target.checked,
                      })
                    }
                  />
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 flex items-center justify-center h-20">
                  <img
                    src={draftIdentity.footerImageUrl}
                    alt="Footer preview"
                    className="max-h-16 object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع تذييل جديد</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('footerImageUrl', e)}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftIdentity({
                        ...draftIdentity,
                        footerImageUrl: '/assets/aistudio/en_pied_571941b9.png',
                      })
                    }
                    className="text-[11px] text-slate-600 hover:underline font-semibold"
                  >
                    استعادة الأصلي
                  </button>
                </div>
              </div>
            </div>

            {/* Institutional Text & Contact Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم المرفق بالعربية
                </label>
                <input
                  type="text"
                  value={draftIdentity.orgDepartmentAr}
                  onChange={(e) =>
                    setDraftIdentity({
                      ...draftIdentity,
                      orgDepartmentAr: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Intitulé en Français
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={draftIdentity.orgDepartmentFr}
                  onChange={(e) =>
                    setDraftIdentity({
                      ...draftIdentity,
                      orgDepartmentFr: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  العنوان الإداري بالعربية
                </label>
                <input
                  type="text"
                  value={draftIdentity.addressAr}
                  onChange={(e) =>
                    setDraftIdentity({
                      ...draftIdentity,
                      addressAr: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Adresse officielle en Français
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={draftIdentity.addressFr}
                  onChange={(e) =>
                    setDraftIdentity({
                      ...draftIdentity,
                      addressFr: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الهاتف والفاكس
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={draftIdentity.phone}
                    onChange={(e) =>
                      setDraftIdentity({
                        ...draftIdentity,
                        phone: e.target.value,
                      })
                    }
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 tabular-nums"
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={draftIdentity.fax}
                    onChange={(e) =>
                      setDraftIdentity({
                        ...draftIdentity,
                        fax: e.target.value,
                      })
                    }
                    className="border border-slate-300 rounded-lg px-2.5 py-1.5 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  البريد الإلكتروني الرسمي
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={draftIdentity.email}
                  onChange={(e) =>
                    setDraftIdentity({
                      ...draftIdentity,
                      email: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                />
              </div>
            </div>

            {/* Dimensions & Margins */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ارتفاع الترويسة (mm)
                </label>
                <input
                  type="number"
                  value={draftIdentity.headerHeightMm}
                  onChange={(e) =>
                    setDraftIdentity({
                      ...draftIdentity,
                      headerHeightMm: parseInt(e.target.value, 10) || 28,
                    })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-1 bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ارتفاع التذييل (mm)
                </label>
                <input
                  type="number"
                  value={draftIdentity.footerHeightMm}
                  onChange={(e) =>
                    setDraftIdentity({
                      ...draftIdentity,
                      footerHeightMm: parseInt(e.target.value, 10) || 16,
                    })
                  }
                  className="w-full border border-slate-300 rounded px-2.5 py-1 bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  هامش اليمين/اليسار (mm)
                </label>
                <input
                  type="number"
                  value={draftIdentity.pageMarginRightMm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 18;
                    setDraftIdentity({
                      ...draftIdentity,
                      pageMarginRightMm: val,
                      pageMarginLeftMm: val,
                    });
                  }}
                  className="w-full border border-slate-300 rounded px-2.5 py-1 bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  هامش الأعلى/الأسفل (mm)
                </label>
                <input
                  type="number"
                  value={draftIdentity.pageMarginTopMm}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 12;
                    setDraftIdentity({
                      ...draftIdentity,
                      pageMarginTopMm: val,
                      pageMarginBottomMm: val,
                    });
                  }}
                  className="w-full border border-slate-300 rounded px-2.5 py-1 bg-white tabular-nums"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSaveCurrentIdentity(false)}
                className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-5 py-2 rounded-lg text-xs font-bold"
              >
                اعتماد التعديلات على النسخة الحالية
              </button>
              <button
                type="button"
                onClick={() => handleSaveCurrentIdentity(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs font-bold"
              >
                حفظ كنسخة تاريخية جديدة ومستقلة
              </button>
            </div>
          </div>

          {/* Live Header & Footer Preview Card (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-6">
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-3">
                معاينة فورية للترويسة الرسمية أعلى ورقة A4:
              </h4>
              <div className="border border-slate-300 rounded-lg p-3 bg-white shadow-inner">
                {draftIdentity.useImageHeader ? (
                  <img
                    src={draftIdentity.headerImageUrl}
                    alt="Header"
                    className="w-full object-contain"
                    style={{ maxHeight: `${draftIdentity.headerHeightMm * 2.5}px` }}
                  />
                ) : (
                  <div className="text-center font-bold text-xs py-3 border-b-2 border-[#1e3a8a]">
                    <div>{draftIdentity.orgTitleAr} — {draftIdentity.orgSubtitleAr}</div>
                    <div>{draftIdentity.orgDepartmentAr}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="py-8 text-center text-xs text-slate-400 border-y border-dashed border-slate-200">
              [ مساحـــة متـــن المراسلـــة الرسميـــة — مستقلة تماماً عن الترويسة والتذييل ]
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-3">
                معاينة فورية للتذييل الرسمي أسفل ورقة A4:
              </h4>
              <div className="border border-slate-300 rounded-lg p-3 bg-white shadow-inner">
                {draftIdentity.useImageFooter ? (
                  <img
                    src={draftIdentity.footerImageUrl}
                    alt="Footer"
                    className="w-full object-contain"
                    style={{ maxHeight: `${draftIdentity.footerHeightMm * 2.5}px` }}
                  />
                ) : (
                  <div className="text-center text-[11px] text-slate-700">
                    <div>{draftIdentity.addressAr}</div>
                    <div dir="ltr">{draftIdentity.addressFr}</div>
                    <div dir="ltr">
                      Tél: {draftIdentity.phone} / Fax: {draftIdentity.fax} / Email:{' '}
                      {draftIdentity.email}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Signatures Manager */}
      {activeSection === 'signatures' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              إدارة ملفات التوقيع الرسمي والتفويض (المدير الإقليمي للعدل بسطات / بالنيابة)
            </h3>
            <button
              type="button"
              onClick={() => {
                const newSig: SignatureProfile = {
                  id: `sig-${Date.now()}`,
                  titleAr: 'المدير الإقليمي للعدل بسطات بالنيابة',
                  titleFr: 'Le Directeur Provincial de la Justice de Settat P.I',
                  signerNameAr: '',
                  signerNameFr: '',
                  isDelegated: true,
                  showSignerName: false,
                  showManualSignatureSpace: true,
                  showSignatureImage: false,
                  showStampImage: false,
                  alignment: 'left',
                };
                onUpdateSignatures([...signatures, newSig]);
              }}
              className="bg-[#1e3a8a] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة صفة توقيع جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {signatures.map((sig, idx) => (
              <div
                key={sig.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الصفة الوظيفية بالعربية
                  </label>
                  <input
                    type="text"
                    value={sig.titleAr}
                    onChange={(e) => {
                      const next = [...signatures];
                      next[idx] = { ...sig, titleAr: e.target.value };
                      onUpdateSignatures(next);
                    }}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Titre en Français
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={sig.titleFr}
                    onChange={(e) => {
                      const next = [...signatures];
                      next[idx] = { ...sig, titleFr: e.target.value };
                      onUpdateSignatures(next);
                    }}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-bold bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      اسم المسؤول (عربي)
                    </label>
                    <input
                      type="text"
                      value={sig.signerNameAr}
                      onChange={(e) => {
                        const next = [...signatures];
                        next[idx] = { ...sig, signerNameAr: e.target.value };
                        onUpdateSignatures(next);
                      }}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Nom (Français)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={sig.signerNameFr}
                      onChange={(e) => {
                        const next = [...signatures];
                        next[idx] = { ...sig, signerNameFr: e.target.value };
                        onUpdateSignatures(next);
                      }}
                      className="w-full border border-slate-300 rounded px-2.5 py-1 bg-white"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sig.showSignerName}
                    onChange={(e) => {
                      const next = [...signatures];
                      next[idx] = { ...sig, showSignerName: e.target.checked };
                      onUpdateSignatures(next);
                    }}
                  />
                  <span>إظهار الاسم الشخصي للموقع تحت الصفة الوظيفية</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Numbering Configuration */}
      {activeSection === 'numbering' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-2xl space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900">
            قواعد الترقيم التلقائي للمراسلات الصادرة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                الرقم التسلسلي القادم
              </label>
              <input
                type="number"
                value={numberingConfig.nextSequenceNumber}
                onChange={(e) =>
                  onUpdateNumbering({
                    ...numberingConfig,
                    nextSequenceNumber: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                بادئة الرقم (اختياري، مثل: م.إ.س)
              </label>
              <input
                type="text"
                value={numberingConfig.prefix}
                onChange={(e) =>
                  onUpdateNumbering({
                    ...numberingConfig,
                    prefix: e.target.value,
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={numberingConfig.preventDuplicates}
              onChange={(e) =>
                onUpdateNumbering({
                  ...numberingConfig,
                  preventDuplicates: e.target.checked,
                })
              }
            />
            <span>منع تكرار أرقام المراسلات الصادرة داخل نفس السنة</span>
          </label>
        </div>
      )}

      {/* Section 4: Protocol Phrases */}
      {activeSection === 'phrases' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              مكتبة الديباجات الافتتاحية وعبارات الختام البروتوكولية ({phrases.length})
            </h3>
            <button
              type="button"
              onClick={() => {
                const newPhrase: ProtocolPhrase = {
                  id: `ph-custom-${Date.now()}`,
                  type: 'opening',
                  language: 'ar',
                  protocolLevel: 2,
                  context: 'initial',
                  text: 'وبعد، علاقة بالموضوع المشار إليه أعلاه، يشرفني أن',
                  description: 'صيغة مخصصة',
                };
                onUpdatePhrases([newPhrase, ...phrases]);
              }}
              className="bg-[#1e3a8a] text-white px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              + إضافة عبارة بروتوكولية
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {phrases.map((ph, idx) => (
              <div
                key={ph.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2 text-xs"
              >
                <span className="font-bold text-[#1e3a8a] shrink-0">
                  [{ph.type === 'opening' ? 'افتتاحية' : 'خاتمة'} · مستوى {ph.protocolLevel}]
                </span>
                <input
                  type="text"
                  value={ph.text}
                  onChange={(e) => {
                    const next = [...phrases];
                    next[idx] = { ...ph, text: e.target.value };
                    onUpdatePhrases(next);
                  }}
                  className="flex-1 border border-slate-300 rounded px-2.5 py-1 bg-white font-semibold"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Backup & Restore */}
      {activeSection === 'backup' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-900">
            النسخ الاحتياطي الشامل والاسترجاع الآمن (JSON / CSV)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            يمكنك تصدير قاعدة بيانات المنظومة بالكامل (جميع المراسلات، النماذج، المخاطبين، نسخ الترويسة والتذييل، والخطوط المخصصة) في ملف واحد، واسترجاعها في أي وقت مع دمج ذكي يمنع تكرار السجلات.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              type="button"
              onClick={onExportFullBackup}
              className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة احتياطية شاملة للنظام (JSON)</span>
            </button>

            <label className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>استرجاع ودمج نسخة احتياطية من ملف JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleBackupFileRestore}
                className="hidden"
              />
            </label>
          </div>

          {customFonts.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-800 mb-2">
                الخطوط الرسمية المرفوعة والمثبتة في النظام ({customFonts.length}):
              </div>
              <div className="flex flex-wrap gap-2">
                {customFonts.map((f) => (
                  <span
                    key={f.id}
                    className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-xs font-bold"
                  >
                    {f.name} ({f.fileName})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
