import React, { useState, useMemo } from 'react';
import {
  RecipientContact,
  RecipientCategoryType,
  ProtocolLevel,
} from '../types/correspondence';
import { exportToExcelCSV, downloadJsonFile } from '../services/storageService';
import {
  Building2,
  Search,
  Plus,
  Edit3,
  Download,
  History,
  Send,
  CheckCircle2,
  X,
} from 'lucide-react';

interface OrgContactsViewProps {
  contacts: RecipientContact[];
  onSaveContact: (contact: RecipientContact) => void;
  onStartCorrespondenceToContact: (contact: RecipientContact) => void;
}

export const OrgContactsView: React.FC<OrgContactsViewProps> = ({
  contacts,
  onSaveContact,
  onStartCorrespondenceToContact,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | RecipientCategoryType
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingContact, setEditingContact] =
    useState<RecipientContact | null>(null);
  const [newOfficerName, setNewOfficerName] = useState<string>('');

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (categoryFilter !== 'all' && c.category !== categoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.roleTitleAr.toLowerCase().includes(q) ||
        c.roleTitleFr.toLowerCase().includes(q) ||
        c.institutionNameAr.toLowerCase().includes(q) ||
        (c.directorateAr || '').toLowerCase().includes(q) ||
        (c.divisionAr || '').toLowerCase().includes(q) ||
        (c.officerName || '').toLowerCase().includes(q) ||
        c.cityAr.toLowerCase().includes(q)
      );
    });
  }, [contacts, categoryFilter, searchQuery]);

  const handleCreateNewContact = () => {
    const blank: RecipientContact = {
      id: `cnt-custom-${Date.now()}`,
      category: categoryFilter === 'all' ? 'central' : categoryFilter,
      ministryNameAr: 'وزارة العدل',
      ministryNameFr: 'Ministère de la Justice',
      directorateAr: '',
      directorateFr: '',
      divisionAr: '',
      divisionFr: '',
      serviceAr: '',
      serviceFr: '',
      institutionNameAr: 'وزارة العدل',
      institutionNameFr: 'Ministère de la Justice',
      roleTitleAr: 'مسؤول جديد',
      roleTitleFr: 'Responsable',
      officerName: '',
      protocolLevel: 2,
      cityAr: 'الرباط',
      cityFr: 'Rabat',
      active: true,
      lastVerifiedDate: new Date().toISOString().slice(0, 10),
      verificationSource: 'إضافة إدارية من منظومة سطات',
      officerHistory: [],
    };
    setEditingContact(blank);
    setNewOfficerName('');
  };

  const handleExportContactsCSV = () => {
    const headers = [
      'المعرف',
      'الصنف',
      'الصفة بالعربية',
      'الصفة بالفرنسية',
      'المؤسسة / المديرية',
      'القسم / المصلحة',
      'المدينة',
      'المستوى البروتوكولي',
      'تاريخ التحقق',
      'المرجع التنظيمي',
    ];
    const rows = contacts.map((c) => [
      c.id,
      c.category,
      c.roleTitleAr,
      c.roleTitleFr,
      c.directorateAr || c.institutionNameAr,
      c.divisionAr || c.serviceAr || '',
      c.cityAr,
      String(c.protocolLevel),
      c.lastVerifiedDate,
      c.verificationSource,
    ]);
    exportToExcelCSV('قاعدة_بيانات_المخاطبين_مديرية_العدل_بسطات', headers, rows);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1e3a8a]" />
            <span>
              التنظيم الهيكلي لوزارة العدل وقاعدة بيانات المخاطبين والشركاء بالدائرة القضائية بسطات
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            محدثة وفق المرسوم 2.22.400 وقرار وزير العدل رقم 1501.22 وتعديلاته (شاملة مديرية التحديث ونظم المعلومات، محكمة الاستئناف ومحاكم سطات وبرشيد وابن أحمد والبروج).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportContactsCSV}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadJsonFile('contacts_dpj_settat.json', contacts)
            }
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير JSON</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNewContact}
            className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مخاطب أو مصلحة جديدة</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: `الكل (${contacts.length})` },
            {
              id: 'central',
              label: `أ. الإدارة المركزية لوزارة العدل (${
                contacts.filter((c) => c.category === 'central').length
              })`,
            },
            {
              id: 'judicial_appeal',
              label: `ب. محكمة الاستئناف بسطات (${
                contacts.filter((c) => c.category === 'judicial_appeal').length
              })`,
            },
            {
              id: 'judicial_first_instance',
              label: `ج. المحاكم الابتدائية والمراكز القضائية (${
                contacts.filter((c) => c.category === 'judicial_first_instance')
                  .length
              })`,
            },
            {
              id: 'external',
              label: `د. شركاء وشركات متعاقدة (${
                contacts.filter((c) => c.category === 'external').length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                categoryFilter === tab.id
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالصفة، المديرية، المحكمة، الشركة، أو المدينة..."
            className="w-full border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between hover:border-[#1e3a8a] transition-all shadow-2xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-bold text-[#1e3a8a]">
                  {contact.category === 'central'
                    ? 'الإدارة المركزية — الرباط'
                    : contact.category === 'judicial_appeal'
                    ? 'محكمة الاستئناف بسطات'
                    : contact.category === 'judicial_first_instance'
                    ? 'محاكم الدائرة القضائية'
                    : 'شريك خارجي / شركة متعاقدة'}
                </span>
                <span className="tabular-nums font-semibold">
                  بروتوكول مستوى {contact.protocolLevel} · {contact.cityAr}
                </span>
              </div>

              <div className="font-bold text-sm text-slate-900">
                السيد {contact.roleTitleAr}
              </div>

              <div className="text-xs text-slate-600">
                {contact.directorateAr || contact.institutionNameAr}
                {contact.divisionAr ? ` — ${contact.divisionAr}` : ''}
              </div>

              <div className="text-[11px] text-slate-500 font-medium" dir="ltr">
                M. le {contact.roleTitleFr} ({contact.cityFr})
              </div>

              {contact.defaultSupervisoryRoleAr && (
                <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-semibold">
                  التسلسل الإداري: {contact.defaultSupervisoryRoleAr}
                </div>
              )}

              {contact.officerHistory && contact.officerHistory.length > 0 && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                  <History className="w-3 h-3 text-slate-400" />
                  <span>
                    سجل المسؤولين المسجلين ({contact.officerHistory.length}):{' '}
                    {contact.officerHistory.map((h) => h.officerName).join('، ')}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingContact(contact);
                  setNewOfficerName(contact.officerName || '');
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل / تحديث المسؤول</span>
              </button>

              <button
                type="button"
                onClick={() => onStartCorrespondenceToContact(contact)}
                className="bg-[#1e3a8a] hover:bg-blue-950 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>مراسلة هذا المخاطب</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#0f172a] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">
                تحديث بيانات المخاطب الهيكلي (لا يغير الوثائق التاريخية الصادرة سابقاً)
              </h3>
              <button
                onClick={() => setEditingContact(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    صنف الجهة
                  </label>
                  <select
                    value={editingContact.category}
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        category: e.target.value as RecipientCategoryType,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
                  >
                    <option value="central">الإدارة المركزية لوزارة العدل</option>
                    <option value="judicial_appeal">محكمة الاستئناف بسطات</option>
                    <option value="judicial_first_instance">
                      المحاكم الابتدائية والمراكز القضائية
                    </option>
                    <option value="external">شركاء مؤسساتيون وشركات متعاقدة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    المستوى البروتوكولي للمخاطبة (1 إلى 4)
                  </label>
                  <select
                    value={editingContact.protocolLevel}
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        protocolLevel: parseInt(
                          e.target.value,
                          10
                        ) as ProtocolLevel,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold bg-white"
                  >
                    <option value={1}>
                      المستوى 1 (السيد الوزير، الكاتب العام، الرئيس الأول، الوكيل العام)
                    </option>
                    <option value={2}>
                      المستوى 2 (المديرون المركزيون، رؤساء المحاكم، وكلاء الملك)
                    </option>
                    <option value={3}>
                      المستوى 3 (رؤساء الأقسام، رؤساء كتابات الضبط والنيابة العامة)
                    </option>
                    <option value={4}>
                      المستوى 4 (الشركات المتعاقدة والممونون)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    الصفة الوظيفية بالعربية (بدون لقب السيد)
                  </label>
                  <input
                    type="text"
                    value={editingContact.roleTitleAr}
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        roleTitleAr: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Titre de fonction en Français
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editingContact.roleTitleFr}
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        roleTitleFr: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    المديرية المركزية / المؤسسة بالعربية
                  </label>
                  <input
                    type="text"
                    value={
                      editingContact.directorateAr ||
                      editingContact.institutionNameAr
                    }
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        directorateAr: e.target.value,
                        institutionNameAr: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    القسم أو المصلحة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={editingContact.divisionAr || ''}
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        divisionAr: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    المدينة (عربي)
                  </label>
                  <input
                    type="text"
                    value={editingContact.cityAr}
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        cityAr: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ville (Français)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editingContact.cityFr}
                    onChange={(e) =>
                      setEditingContact({
                        ...editingContact,
                        cityFr: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>

              {/* Officer Name Update with History Preservation */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800">
                  الاسم الشخصي للمسؤول الحالي (اختياري — عند التغيير يُحفظ المسؤول السابق في الأرشيف)
                </label>
                <input
                  type="text"
                  value={newOfficerName}
                  onChange={(e) => setNewOfficerName(e.target.value)}
                  placeholder="مثال: ذ. علي أيت كاغو"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                />
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const history = [...(editingContact.officerHistory || [])];
                  if (
                    newOfficerName.trim() &&
                    newOfficerName.trim() !== editingContact.officerName
                  ) {
                    history.push({
                      officerName: newOfficerName.trim(),
                      roleTitleAr: editingContact.roleTitleAr,
                      roleTitleFr: editingContact.roleTitleFr,
                      fromDate: new Date().toISOString().slice(0, 10),
                      toDate: 'حالي',
                    });
                  }
                  onSaveContact({
                    ...editingContact,
                    officerName: newOfficerName.trim() || undefined,
                    officerHistory: history,
                    lastVerifiedDate: new Date().toISOString().slice(0, 10),
                  });
                  setEditingContact(null);
                }}
                className="bg-[#1e3a8a] text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ واعتماد المخاطب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
