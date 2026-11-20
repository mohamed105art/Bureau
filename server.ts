import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'DPJ-Settat-Correspondence-Engine' });
  });

  // 1. Smart Moroccan Administrative Drafting Assistant (Non-intrusive, protocol-aware)
  app.post('/api/ai/assist', async (req, res) => {
    try {
      const {
        mode,
        language = 'ar',
        recipientTitle = '',
        recipientCategory = '',
        protocolLevel = 2,
        docType = 'كتاب إداري رسمي',
        subject = '',
        reference = '',
        currentBody = '',
        userBrief = '',
        referenceTemplatesContext = '',
      } = req.body;

      const systemInstruction = `أنت الخبير الإداري والقانوني المعتمد لدى "المديرية الإقليمية للعدل بسطات - وزارة العدل بالمملكة المغربية" (Direction Provinciale de la Justice de Settat).
مهمتك هي مساعدة المحرر الإداري في صياغة وتحسين ومراجعة المراسلات الرسمية المغربية باللغتين العربية والفرنسية بدقة بروتوكولية عالية، بالاستناد إلى النماذج الحقيقية المعتمدة بالمديرية.

قواعد صارمة لا تقبل الاستثناء:
1. لا تختلق أبداً أرقام مراسلات أو تواريخ أو أرقام صفقات أو أسماء أشخاص أو وقائع غير موجودة في معطيات المستخدم. إذا كانت هناك معلومة ناقصة (مثل رقم كتاب أو تاريخ أو مبلغ)، ضع مكانها قوسين واضحين هكذا: [أدخل الرقم/التاريخ هنا].
2. احترم مستويات المخاطبة الإدارية والقضائية المغربية بدقة:
   - المستوى 1 (كبار المسؤولين: السيد وزير العدل، السيد الكاتب العام، السيد المفتش العام، السيد الرئيس الأول لمحكمة الاستئناف، السيد الوكيل العام للملك):
     * الافتتاحية العربية: "سلام تام بوجود مولانا الإمام" ثم "وبعد، علاقة بالموضوع والمرجع المشار إليهما أعلاه، يشرفني أن أوافي سيادتكم بـ..." أو "يشرفني أن أخبر سيادتكم أن..." أو "يشرفني أن ألتمس من سيادتكم التفضل بـ..."
     * الخاتمة العربية: "وتفضلوا، بقبول فائق الاحترام والتقدير. والسلام./." أو "وبه وجب إخبار سيادتكم، وتقبلوا فائق الاحترام والتقدير. والسلام./."
   - المستوى 2 (المديرون المركزيون، السادة رؤساء المحاكم الابتدائية، السادة وكلاء الملك):
     * صياغة رسمية مباشرة ومتوازنة ("يشرفني أن أحيطكم علماً..." أو "يشرفني أن أوافيكم بـ..."، الخاتمة: "وتفضلوا بقبول فائق عبارات التقدير والاحترام، والسلام.").
   - المستوى 3 (السادة رؤساء كتابات الضبط، رؤساء كتابات النيابة العامة، رؤساء الأقسام والمصالح):
     * صياغة إدارية عملية وتنفيذية ("يشرفني أن أطلب منكم العمل على..." أو "يشرفني أن أحيل عليكم..."، الخاتمة: "وتفضلوا بقبول فائق عبارات التقدير والاحترام، والسلام.").
   - المستوى 4 (الشركات نائلة الصفقات والممونون والمصالح التقنية):
     * بالعربية: صياغة مهنية مباشرة ("أدعوكم إلى..." أو "أطلب منكم من جديد إتمام..."، الخاتمة: "والسلام./.").
     * بالفرنسية: "Monsieur, Suite à l'objet sus-cité..." والخاتمة: "Comptant sur votre collaboration, veuillez agréer Monsieur mes salutations les plus distinguées." أو "Dans l'attente, nous vous prions d'agréer, Monsieur, l'expression de nos salutations distinguées."
3. استلهم الأسلوب والمصطلحات من النماذج المرجعية الحقيقية للمديرية المرفقة في السياق دون نسخ أرقامها أو تواريخها القديمة.`;

      const prompt = `الوضع المطلوب (Mode): ${mode}
اللغة المطلوبة: ${language === 'fr' ? 'الفرنسية (Français)' : 'العربية (Arabe)'}
نوع الوثيقة: ${docType}
المرسل إليه وصفته: ${recipientTitle} (${recipientCategory}) - مستوى البروتوكول: ${protocolLevel}
الموضوع الحالي: ${subject || '(غير محدد بعد)'}
المرجع الحالي: ${reference || '(بدون مرجع)'}
النص الحالي في المحرر:
${currentBody || '(فارغ)'}

توجيهات أو وصف المستخدم:
${userBrief || '(لا يوجد وصف إضافي)'}

نماذج مرجعية حقيقية من أرشيف المديرية الإقليمية للعدل بسطات للاستئناس بأسلوبها:
${referenceTemplatesContext || '(تطبيق القواعد القياسية للمديرية)'}

قم بإرجاع النتيجة المهيكلة بصيغة JSON وفق المخطط المحدد.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedSubject: {
                type: Type.STRING,
                description: 'الموضوع المقترح للمراسلة بصياغة إدارية دقيقة',
              },
              suggestedReference: {
                type: Type.STRING,
                description: 'صياغة المرجع المقترحة عند الاقتضاء أو فارغ',
              },
              suggestedOpening: {
                type: Type.STRING,
                description: 'عبارة الافتتاح والتمهيد المناسبة لمستوى المخاطب',
              },
              suggestedBody: {
                type: Type.STRING,
                description: 'متن المراسلة المقترح أو المصحح كاملاً بأسلوب المديرية الإقليمية للعدل بسطات',
              },
              suggestedClosing: {
                type: Type.STRING,
                description: 'عبارة الخاتمة البروتوكولية المناسبة للصفة الإدارية',
              },
              reviewNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'ملاحظات تدقيقية حول التناسق، اللغة، الملاءمة البروتوكولية، أو البيانات الناقصة',
              },
            },
            required: [
              'suggestedSubject',
              'suggestedReference',
              'suggestedOpening',
              'suggestedBody',
              'suggestedClosing',
              'reviewNotes',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('Gemini Assist Error:', error);
      res.status(500).json({
        error: error?.message || 'تعذر الاتصال بمساعد الصياغة الذكي. يرجى التحقق من مفتاح API.',
      });
    }
  });

  // 2. Multimodal OCR & Reference Template Structural Extractor
  app.post('/api/ai/analyze-document', async (req, res) => {
    try {
      const { fileBase64, mimeType, fileName, textContent } = req.body;

      const systemInstruction = `أنت خبير في تحليل وأرشفة الوثائق الإدارية والكتب الرسمية وأوراق الإرسال الصادرة عن "المديرية الإقليمية للعدل بسطات - وزارة العدل بالمملكة المغربية".
قم بتحليل الوثيقة المرفقة واستخرج منها بدقة:
1. لغة الوثيقة (ar أو fr).
2. نوع الوثيقة (كتاب إداري رسمي، ورقة إرسال، مذكرة توضيحية، مراسلة تقنية، محضر تسلم Decharge، طلب عروض، إلخ).
3. صفة المرسل إليه والجهة المستقبلة كما وردت في الوثيقة.
4. الموضوع (Objet / الموضوع) والمرجع (Référence / المرجع).
5. النص الكامل المستخرج (OCR) بدقة تامة.
6. القالب المستخلص القابل لإعادة الاستعمال (مع استبدال التواريخ والأرقام الخاصة بمتغيرات بين معقوفتين مثل [الرقم]، [التاريخ]، [المبلغ]).
7. التحليل البصري والشكلي (الخط المقدر، المحاذاة، عبارة الافتتاح، عبارة الخاتمة، المرفقات، وهل تتضمن جدولاً).`;

      const parts: any[] = [];
      if (fileBase64 && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: fileBase64,
          },
        });
      }
      parts.push({
        text: `اسم الملف: ${fileName || 'وثيقة مرفوعة'}\n${
          textContent ? `محتوى نصي أولي:\n${textContent}\n` : ''
        }قم باستخراج وتحليل كافة عناصر هذه الوثيقة الإدارية وإرجاعها بصيغة JSON.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              language: { type: Type.STRING, description: 'ar or fr' },
              docType: { type: Type.STRING },
              recipientCategory: { type: Type.STRING },
              recipientTitle: { type: Type.STRING },
              subject: { type: Type.STRING },
              reference: { type: Type.STRING },
              extractedText: { type: Type.STRING },
              reusableTemplateBody: { type: Type.STRING },
              openingPhrase: { type: Type.STRING },
              closingPhrase: { type: Type.STRING },
              detectedFont: { type: Type.STRING },
              hasTable: { type: Type.BOOLEAN },
              attachmentsSummary: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              structuralNotes: { type: Type.STRING },
            },
            required: [
              'title',
              'language',
              'docType',
              'recipientTitle',
              'subject',
              'reference',
              'extractedText',
              'reusableTemplateBody',
              'openingPhrase',
              'closingPhrase',
              'detectedFont',
              'hasTable',
              'attachmentsSummary',
              'structuralNotes',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error: any) {
      console.error('Gemini OCR Analysis Error:', error);
      res.status(500).json({
        error: error?.message || 'تعذر تحليل الوثيقة بواسطة محرك الذكاء الاصطناعي.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
