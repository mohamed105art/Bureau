import {
  CorrespondenceDocument,
  RecipientContact,
  ReferenceTemplate,
  InstitutionalIdentityVersion,
  SignatureProfile,
  ProtocolPhrase,
  NumberingConfig,
  CustomUploadedFont,
} from '../types/correspondence';

const DB_NAME = 'DPJ_Settat_Official_System_DB';
const DB_VERSION = 1;
const STORE_NAME = 'system_state';

export interface SystemBackupBundle {
  schemaVersion: string;
  exportedAt: string;
  organization: string;
  correspondences: CorrespondenceDocument[];
  contacts: RecipientContact[];
  templates: ReferenceTemplate[];
  identityVersions: InstitutionalIdentityVersion[];
  signatures: SignatureProfile[];
  phrases: ProtocolPhrase[];
  numberingConfig: NumberingConfig;
  customFonts: CustomUploadedFont[];
  aiEnabled: boolean;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToIndexedDB<T>(key: string, value: T): Promise<void> {
  try {
    localStorage.setItem(`dpj_settat_${key}`, JSON.stringify(value));
  } catch {
    // Ignore localStorage quota error when large base64 files exist; IndexedDB handles them
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save fallback warning:', err);
  }
}

export async function loadFromIndexedDB<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDatabase();
    const result = await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
    if (result !== undefined) {
      return result;
    }
  } catch {
    // Fallback to localStorage
  }

  try {
    const raw = localStorage.getItem(`dpj_settat_${key}`);
    if (raw) {
      return JSON.parse(raw) as T;
    }
  } catch {
    // Ignore parse error
  }
  return fallback;
}

/**
 * Dynamically registers a user-uploaded TTF/OTF font in the browser document so it renders
 * identically in both the editor preview and @media print output.
 */
export async function registerCustomFontInDOM(font: CustomUploadedFont): Promise<void> {
  try {
    if (typeof FontFace !== 'undefined' && font.dataUrl) {
      const face = new FontFace(font.name, `url(${font.dataUrl})`);
      const loaded = await face.load();
      document.fonts.add(loaded);
    }
  } catch (err) {
    console.warn('Could not load custom font:', font.name, err);
  }
}

/**
 * Exports any tabular array (e.g. Contacts or Correspondence Registry) as an Excel-compatible UTF-8 BOM CSV file.
 */
export function exportToExcelCSV(filename: string, headers: string[], rows: string[][]): void {
  const escapeCell = (cell: string) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(';'), ...rows.map((r) => r.map(escapeCell).join(';'))].join(
      '\r\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports a JSON object as a downloadable file.
 */
export function downloadJsonFile(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a 100% self-contained Single-File HTML Web Application (.html)
 * preloaded with the current Settat judicial hierarchy, correspondences, templates,
 * customizable trilingual header/footer, LocalStorage persistence, and A4 print engine.
 */
export function exportStandaloneSingleFileApp(
  correspondences: CorrespondenceDocument[],
  contacts: RecipientContact[],
  currentIdentity: InstitutionalIdentityVersion
): void {
  const serializedDocs = JSON.stringify(correspondences);
  const serializedContacts = JSON.stringify(contacts);
  const serializedIdentity = JSON.stringify(currentIdentity);

  const singleFileHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>المنظومة الرقمية للمراسلات الرسمية — المديرية الإقليمية للعدل بسطات (نسخة محمولة مستقلة)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&family=Noto+Sans+Tifinagh&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Cairo', 'Tajawal', sans-serif; }
    .a4-sheet {
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      margin: 0 auto;
      padding: 12mm 18mm;
      box-shadow: 0 10px 30px rgba(15,23,42,0.16);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
    }
    @page { size: A4 portrait; margin: 0mm; }
    @media print {
      .no-print { display: none !important; }
      body { background: #fff !important; margin: 0 !important; }
      .a4-sheet { box-shadow: none !important; margin: 0 !important; width: 210mm !important; min-height: 297mm !important; }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 min-h-screen flex flex-col">
  <header class="no-print bg-[#0f172a] text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
    <div>
      <h1 class="text-base font-bold">المنظومة الرقمية لصناعة وتدبير المراسلات الإدارية الرسمية — المديرية الإقليمية للعدل بسطات</h1>
      <p class="text-xs text-slate-300">النسخة المحمولة المستقلة (Single-File Web App) · تعمل محلياً عبر LocalStorage وجاهزة للطباعة المباشرة A4</p>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="createNewDoc(false)" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg">+ مراسلة إدارية جديدة</button>
      <button onclick="createNewDoc(true)" class="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs px-3.5 py-2 rounded-lg">+ ورقة إرسال (Bordereau)</button>
      <button onclick="window.print()" class="bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs px-4 py-2 rounded-lg">طباعة / تصدير PDF (A4)</button>
    </div>
  </header>

  <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
    <div class="no-print lg:col-span-5 bg-white border-l border-slate-200 p-5 overflow-y-auto space-y-4 max-h-[calc(100vh-64px)]">
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">اختيار مراسلة محفوظة في الأرشيف المحلي (<span id="docCount">0</span>)</label>
        <select id="docSelect" onchange="selectDoc(this.value)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-slate-50"></select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">رقم الصادر</label>
          <input id="inpNumber" type="text" oninput="syncDoc()" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">التاريخ</label>
          <input id="inpDate" type="date" oninput="syncDoc()" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold" />
        </div>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">الخريطة القضائية والتسلسل الإداري (المخاطب)</label>
        <select id="contactSelect" onchange="applyContact(this.value)" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"></select>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">أسطر المرسل إليه (وسط الصفحة)</label>
        <textarea id="inpAddressee" rows="3" oninput="syncDoc()" class="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold"></textarea>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">تحت إشراف (التسلسل الإداري اختياري)</label>
        <input id="inpSupervisory" type="text" oninput="syncDoc()" placeholder="تحت إشراف السيد رئيس المحكمة..." class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">الموضوع (Objet)</label>
        <input id="inpSubject" type="text" oninput="syncDoc()" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">المرجع (Référence — اتركه فارغاً لإخفائه)</label>
        <input id="inpReference" type="text" oninput="syncDoc()" class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-700 mb-1">متن المراسلة (ضبط تام Justify + مسافة بادئة 10mm)</label>
        <textarea id="inpBody" rows="8" oninput="syncDoc()" class="w-full border border-slate-300 rounded-lg p-3 text-sm leading-relaxed"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">الخط الرسمي</label>
          <select id="inpFont" onchange="syncDoc()" class="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold">
            <option value="Amiri">Amiri (أميري)</option>
            <option value="Cairo">Cairo (القاهرة)</option>
            <option value="Tajawal">Tajawal (تجوال)</option>
            <option value="Times New Roman">Times New Roman</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">عبارة الختام</label>
          <input id="inpClosing" type="text" oninput="syncDoc()" class="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold" />
        </div>
      </div>
    </div>

    <div class="lg:col-span-7 bg-slate-200 p-6 overflow-y-auto flex justify-center">
      <div id="a4Preview" class="a4-sheet"></div>
    </div>
  </div>

  <script>
    const STORAGE_KEY = 'dpj_settat_standalone_docs_v1';
    const CONTACTS = ${serializedContacts};
    const IDENTITY = ${serializedIdentity};
    let docs = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || ${serializedDocs};
    let currentDoc = docs[0];

    function initApp() {
      const cSel = document.getElementById('contactSelect');
      cSel.innerHTML = '<option value="">-- اختر الجهة القضائية أو الإدارية لتطبيق البروتوكول تلقائياً --</option>' +
        CONTACTS.map(c => '<option value="' + c.id + '">السيد ' + c.roleTitleAr + ' (' + c.institutionNameAr + ')</option>').join('');
      renderDocList();
      loadDocIntoForm(currentDoc);
    }

    function renderDocList() {
      document.getElementById('docCount').textContent = docs.length;
      const sel = document.getElementById('docSelect');
      sel.innerHTML = docs.map(d => '<option value="' + d.id + '" ' + (d.id === currentDoc.id ? 'selected' : '') + '>[' + d.number + '] ' + d.subject + '</option>').join('');
    }

    function selectDoc(id) {
      const found = docs.find(d => d.id === id);
      if (found) { currentDoc = found; loadDocIntoForm(currentDoc); }
    }

    function loadDocIntoForm(d) {
      document.getElementById('inpNumber').value = d.number || '';
      document.getElementById('inpDate').value = d.dateGrego || '';
      document.getElementById('inpAddressee').value = (d.addresseeLinesAr || []).join('\\n');
      document.getElementById('inpSupervisory').value = d.useSupervisoryLine ? (d.supervisoryLineAr || '') : '';
      document.getElementById('inpSubject').value = d.subject || '';
      document.getElementById('inpReference').value = d.showReference ? (d.reference || '') : '';
      document.getElementById('inpBody').value = d.bodyText || '';
      document.getElementById('inpFont').value = d.fontFamilyAr || 'Amiri';
      document.getElementById('inpClosing').value = d.closingText || 'وتقبلوا خالص التحيات';
      renderA4();
    }

    function applyContact(contactId) {
      const c = CONTACTS.find(x => x.id === contactId);
      if (!c) return;
      currentDoc.addresseeLinesAr = ['إلى', 'السيد ' + c.roleTitleAr, c.institutionNameAr + ' - ' + c.cityAr];
      currentDoc.supervisoryLineAr = c.defaultSupervisoryRoleAr || '';
      currentDoc.useSupervisoryLine = Boolean(c.defaultSupervisoryRoleAr);
      currentDoc.closingText = c.protocolLevel <= 2
        ? 'وتفضلوا، سيدي، بقبول أسمى عبارات التقدير والاحترام.'
        : 'وتقبلوا خالص التحيات وفائق التقدير.';
      loadDocIntoForm(currentDoc);
      saveAll();
    }

    function syncDoc() {
      currentDoc.number = document.getElementById('inpNumber').value;
      currentDoc.dateGrego = document.getElementById('inpDate').value;
      currentDoc.addresseeLinesAr = document.getElementById('inpAddressee').value.split('\\n');
      const sup = document.getElementById('inpSupervisory').value.trim();
      currentDoc.supervisoryLineAr = sup;
      currentDoc.useSupervisoryLine = Boolean(sup);
      currentDoc.subject = document.getElementById('inpSubject').value;
      const ref = document.getElementById('inpReference').value.trim();
      currentDoc.reference = ref;
      currentDoc.showReference = Boolean(ref);
      currentDoc.bodyText = document.getElementById('inpBody').value;
      currentDoc.fontFamilyAr = document.getElementById('inpFont').value;
      currentDoc.closingText = document.getElementById('inpClosing').value;
      saveAll();
      renderDocList();
      renderA4();
    }

    function createNewDoc(isBordereau) {
      const newDoc = {
        id: 'doc-' + Date.now(),
        number: (docs.length + 1) + '/م.إ.ع.س/2026',
        dateGrego: new Date().toISOString().slice(0, 10),
        language: 'ar',
        docType: isBordereau ? 'ورقة إرسال' : 'كتاب إداري رسمي',
        addresseeLinesAr: ['إلى', 'السيد رئيس كتابة الضبط بالمحكمة الابتدائية بسطات'],
        supervisoryLineAr: isBordereau ? 'تحت إشراف السيد رئيس المحكمة الابتدائية بسطات' : '',
        useSupervisoryLine: isBordereau,
        subject: isBordereau ? 'ورقة إرسال وثائق ومستندات إدارية.' : 'حول ...',
        reference: '',
        showReference: false,
        salutationText: 'سلام تام بوجود مولانا الإمام المؤيد بالله،',
        showSalutation: !isBordereau,
        openingTransition: 'وبعد،',
        bodyText: 'يشرفني أن أنهي إلى علمكم أنه في إطار تتبع أشغال المصالح الإدارية والقضائية بالدائرة القضائية بسطات...',
        closingText: 'وتقبلوا خالص التحيات.',
        fontFamilyAr: 'Amiri',
        fontSizePt: 14
      };
      docs.unshift(newDoc);
      currentDoc = newDoc;
      saveAll();
      renderDocList();
      loadDocIntoForm(currentDoc);
    }

    function saveAll() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    }

    function renderA4() {
      const sheet = document.getElementById('a4Preview');
      sheet.style.fontFamily = "'" + (currentDoc.fontFamilyAr || 'Amiri') + "', serif";
      const paragraphs = (currentDoc.bodyText || '').split(/\\n+/).filter(Boolean).map(p =>
        '<p style="text-align:justify;text-indent:10mm;margin-bottom:9pt;line-height:1.8;font-size:13.5pt;">' + p + '</p>'
      ).join('');

      sheet.innerHTML = \`
        <div>
          <header class="border-b-2 border-[#1e3a8a] pb-2 mb-4">
            <div class="grid grid-cols-3 items-center text-[10.5pt]">
              <div class="text-right font-bold">
                <div>المملكة المغربية</div>
                <div>وزارة العدل</div>
                <div>المديرية الإقليمية للعدل بسطات</div>
              </div>
              <div class="flex flex-col items-center">
                <div class="text-amber-700 font-bold text-xs">۞ المملكة المغربية ۞</div>
                <div style="font-family:'Noto Sans Tifinagh',sans-serif;font-size:7.5pt;font-weight:bold;">ⵜⴰⴳⵍⴷⵉⵜ ⵏ ⵍⵎⵖⵔⵉⴱ · ⵜⴰⵎⴰⵡⴰⵙⵜ ⵏ ⵜⵣⵔⴼⵜ</div>
              </div>
              <div class="text-left font-bold text-[8.5pt]" dir="ltr">
                <div>ROYAUME DU MAROC</div>
                <div>MINISTÈRE DE LA JUSTICE</div>
                <div>Direction Provinciale de la Justice de Settat</div>
              </div>
            </div>
          </header>

          <div class="flex justify-between items-start mb-4 text-[11.5pt] font-bold">
            <div>الصادر الرقم : \${currentDoc.number || '.....'}</div>
            <div>سطات في : \${currentDoc.dateGrego || ''}</div>
          </div>

          <div class="text-center my-4">
            <div class="font-bold text-[13.5pt]">من المدير الإقليمي للعدل بسطات</div>
            \${(currentDoc.addresseeLinesAr || []).map(l => '<div class="font-bold text-[14pt]">' + l + '</div>').join('')}
            \${currentDoc.useSupervisoryLine && currentDoc.supervisoryLineAr ? '<div class="font-bold underline mt-1 text-[13pt]">' + currentDoc.supervisoryLineAr + '</div>' : ''}
          </div>

          <div class="my-3 space-y-1.5 text-[13.5pt]">
            <div><span class="font-bold underline">الموضوع :</span> <span class="font-bold">\${currentDoc.subject || ''}</span></div>
            \${currentDoc.showReference && currentDoc.reference ? '<div><span class="font-bold underline">المرجع :</span> <span>' + currentDoc.reference + '</span></div>' : ''}
            <div class="text-center font-bold my-3">سلام تام بوجود مولانا الإمام المؤيد بالله،</div>
            <div class="font-bold">وبعد،</div>
          </div>

          <div class="my-2">\${paragraphs}</div>

          <div class="mt-6">
            <div class="text-center font-bold text-[13.5pt] mb-4">\${currentDoc.closingText || ''}</div>
            <div class="flex justify-end">
              <div class="w-60 text-center font-bold text-[13.5pt]">
                <div>المدير الإقليمي للعدل بسطات</div>
                <div class="h-16"></div>
              </div>
            </div>
          </div>
        </div>

        <footer class="border-t border-slate-400 pt-2 text-center text-[9pt] leading-tight">
          <div class="font-bold">\${IDENTITY.addressAr}</div>
          <div dir="ltr" class="text-[8.5pt]">\${IDENTITY.addressFr}</div>
          <div dir="ltr" class="text-[8.5pt] font-medium">Tél. : \${IDENTITY.phone} / Fax : \${IDENTITY.fax} / Email: \${IDENTITY.email}</div>
        </footer>
      \`;
    }

    initApp();
  </script>
</body>
</html>`;

  const blob = new Blob([singleFileHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'منظومة_المراسلات_المديرية_الإقليمية_للعدل_بسطات_نسخة_مستقلة.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

