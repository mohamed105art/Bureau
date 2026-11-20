import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
// In-memory cache for the OAuth access token as required by security rules
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('تعذر الحصول على رمز الوصول (Access Token) من حساب Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface GmailCandidateMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  bodyText: string;
  attachments: {
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
}

/**
 * Searches Gmail messages with administrative keywords (read-only).
 */
export async function searchGmailAdministrativeMessages(
  query: string = 'مراسلة OR كتاب OR إرسالية OR ورقة إرسال OR Bordereau OR وزارة العدل OR سطات OR صفقة'
): Promise<GmailCandidateMessage[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('NEEDS_AUTH');
  }

  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=12&q=${encodeURIComponent(
    query
  )}`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (listRes.status === 401 || listRes.status === 403) {
    cachedAccessToken = null;
    throw new Error('NEEDS_AUTH');
  }
  if (!listRes.ok) {
    throw new Error(`خطأ أثناء الاتصال بـ Gmail API (${listRes.status})`);
  }

  const listData = await listRes.json();
  const messages: { id: string; threadId: string }[] = listData.messages || [];

  const detailed: GmailCandidateMessage[] = [];
  for (const msg of messages.slice(0, 10)) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!detailRes.ok) continue;
    const detail = await detailRes.json();

    const headers: { name: string; value: string }[] = detail.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const attachments: GmailCandidateMessage['attachments'] = [];
    let bodyText = detail.snippet || '';

    const walkParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            attachmentId: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0,
          });
        }
        if (part.mimeType === 'text/plain' && part.body?.data) {
          try {
            const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            if (decoded.trim()) bodyText = decoded;
          } catch {
            // fallback to snippet
          }
        }
        if (part.parts) walkParts(part.parts);
      }
    };

    if (detail.payload?.parts) {
      walkParts(detail.payload.parts);
    }

    detailed.push({
      id: detail.id,
      threadId: detail.threadId,
      subject: getHeader('Subject') || '(بدون موضوع)',
      from: getHeader('From') || 'غير معروف',
      date: getHeader('Date') || '',
      snippet: detail.snippet || '',
      bodyText,
      attachments,
    });
  }

  return detailed;
}

export interface DriveCandidateFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

/**
 * Searches Google Drive for official documents, PDFs, Word files, Google Docs, Sheets, or Scanned Images.
 */
export async function searchGoogleDriveFiles(
  keyword: string = '',
  filterMode: 'all' | 'docs' | 'sheets' | 'images' | 'folders' = 'all'
): Promise<DriveCandidateFile[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('NEEDS_AUTH');
  }

  const conditions: string[] = ['trashed = false'];
  if (keyword.trim()) {
    const escaped = keyword.trim().replace(/'/g, "\\'");
    conditions.push(`name contains '${escaped}'`);
  }

  if (filterMode === 'docs') {
    conditions.push(
      `(mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document' or mimeType contains 'word')`
    );
  } else if (filterMode === 'sheets') {
    conditions.push(
      `(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType contains 'spreadsheet' or mimeType contains 'excel')`
    );
  } else if (filterMode === 'images') {
    conditions.push(`(mimeType contains 'image/')`);
  } else if (filterMode === 'folders') {
    conditions.push(`mimeType = 'application/vnd.google-apps.folder'`);
  }

  const q = conditions.join(' and ');
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)&q=${encodeURIComponent(
    q
  )}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('NEEDS_AUTH');
  }
  if (!res.ok) {
    throw new Error(`خطأ أثناء الاتصال بـ Google Drive API (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Reads content from a Google Doc or exports text/binary from Drive file for template analysis.
 */
export async function fetchDriveFileContentForAnalysis(file: DriveCandidateFile): Promise<{
  textContent?: string;
  fileBase64?: string;
  mimeType: string;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('NEEDS_AUTH');

  if (file.mimeType === 'application/vnd.google-apps.document') {
    const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${file.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!docRes.ok) throw new Error('تعذر قراءة مستند Google Docs');
    const docData = await docRes.json();
    let extracted = '';
    for (const contentItem of docData.body?.content || []) {
      for (const elem of contentItem.paragraph?.elements || []) {
        if (elem.textRun?.content) {
          extracted += elem.textRun.content;
        }
      }
    }
    return { textContent: extracted, mimeType: 'text/plain' };
  }

  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${file.id}?includeGridData=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!sheetRes.ok) throw new Error('تعذر قراءة جدول Google Sheets');
    const sheetData = await sheetRes.json();
    const rowsText: string[] = [];
    const firstSheet = sheetData.sheets?.[0];
    const rowData = firstSheet?.data?.[0]?.rowData || [];
    for (const r of rowData.slice(0, 40)) {
      const cells = (r.values || []).map((v: any) => v.formattedValue || '').filter(Boolean);
      if (cells.length > 0) rowsText.push(cells.join(' | '));
    }
    return { textContent: rowsText.join('\n'), mimeType: 'text/plain' };
  }

  // Binary PDF or image download from Drive
  const mediaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!mediaRes.ok) throw new Error('تعذر تنزيل الملف من Google Drive');
  const blob = await mediaRes.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const resStr = String(reader.result || '');
      const idx = resStr.indexOf(',');
      resolve(idx >= 0 ? resStr.slice(idx + 1) : resStr);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return {
    fileBase64: base64,
    mimeType: file.mimeType || 'application/pdf',
  };
}
