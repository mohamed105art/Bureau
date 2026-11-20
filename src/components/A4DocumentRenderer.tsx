import React from 'react';
import {
  CorrespondenceDocument,
  SignatureProfile,
} from '../types/correspondence';
import { paginateCorrespondenceContent } from '../utils/protocolEngine';

interface A4DocumentRendererProps {
  document: CorrespondenceDocument;
  signatureProfile?: SignatureProfile;
  scale?: number;
  isPrintMode?: boolean;
}

const ARABIC_MONTHS: Record<number, string> = {
  1: 'يناير',
  2: 'فبراير',
  3: 'مارس',
  4: 'أبريل',
  5: 'مايو',
  6: 'يونيو',
  7: 'يوليوز',
  8: 'غشت',
  9: 'شتنبر',
  10: 'أكتوبر',
  11: 'نونبر',
  12: 'دجنبر',
};

const FRENCH_MONTHS: Record<number, string> = {
  1: 'Janvier',
  2: 'Février',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
  7: 'Juillet',
  8: 'Août',
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Décembre',
};

export function formatOfficialDate(dateStr: string, lang: 'ar' | 'fr'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;

  const dayStr = String(day).padStart(2, '0');
  if (lang === 'fr') {
    return `${dayStr} ${FRENCH_MONTHS[month] || parts[1]} ${year}`;
  }
  return `${dayStr} ${ARABIC_MONTHS[month] || parts[1]} ${year}`;
}

export const A4DocumentRenderer: React.FC<A4DocumentRendererProps> = ({
  document: doc,
  signatureProfile,
  scale = 1,
  isPrintMode = false,
}) => {
  const isFr = doc.language === 'fr';
  const isBordereau = doc.docType === 'ورقة إرسال';
  const identity = doc.identitySnapshot;

  const pages = paginateCorrespondenceContent(
    doc.bodyText,
    doc.bordereauRows || [],
    isBordereau,
    {
      firstPageMaxChars: doc.technicalTables?.length > 0 ? 950 : 1400,
      subsequentPageMaxChars: 1950,
      bordereauRowsPerPage: 7,
    }
  );

  const fontFamily = isFr
    ? doc.fontFamilyFr || 'Times New Roman'
    : doc.fontFamilyAr || 'Amiri';

  const addresseeLines = isFr
    ? doc.addresseeLinesFr?.length > 0
      ? doc.addresseeLinesFr
      : doc.addresseeLinesAr
    : doc.addresseeLinesAr?.length > 0
    ? doc.addresseeLinesAr
    : doc.addresseeLinesFr;

  const supervisoryLine = isFr
    ? doc.supervisoryLineFr || doc.supervisoryLineAr
    : doc.supervisoryLineAr || doc.supervisoryLineFr;

  const sigTitle = isFr
    ? doc.signatureTitleSnapshotFr || signatureProfile?.titleFr || 'Le Directeur Provincial de la Justice de Settat'
    : doc.signatureTitleSnapshotAr || signatureProfile?.titleAr || 'المدير الإقليمي للعدل بسطات';

  const sigName = isFr
    ? doc.signatureNameSnapshotFr || signatureProfile?.signerNameFr || ''
    : doc.signatureNameSnapshotAr || signatureProfile?.signerNameAr || '';

  const showSignerName = signatureProfile ? signatureProfile.showSignerName : Boolean(sigName);

  const renderHeader = (pageNumber: number) => {
    if (pageNumber > 1 && !doc.repeatHeaderOnMultiPage) {
      return <div style={{ height: '10mm' }} />;
    }

    const headerImg = isFr
      ? identity.headerImageFrUrl || identity.headerImageUrl
      : identity.headerImageUrl;

    return (
      <header
        style={{
          marginBottom: `${identity.headerMarginBottomMm ?? 6}mm`,
        }}
        className="w-full select-none"
      >
        {identity.useImageHeader && headerImg ? (
          <div className="w-full flex flex-col items-center">
            <img
              src={headerImg}
              alt="الترويسة الرسمية للمديرية الإقليمية للعدل بسطات"
              style={{
                maxHeight: `${identity.headerHeightMm || 28}mm`,
                width: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        ) : (
          <div className="w-full border-b-2 border-[#1e3a8a] pb-2">
            <div className="grid grid-cols-3 items-center text-[10.5pt] leading-snug text-slate-900">
              <div className="text-right font-bold space-y-0.5" dir="rtl">
                <div>{identity.orgTitleAr}</div>
                <div>{identity.orgSubtitleAr}</div>
                <div>{identity.orgDepartmentAr}</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <svg
                  viewBox="0 0 120 100"
                  className="w-16 h-14 text-amber-700"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Crown & Shield & Two Lions Stylized Moroccan Emblem */}
                  <path
                    d="M45 22 L52 12 L60 20 L68 12 L75 22 Z"
                    fill="#d97706"
                    stroke="#78350f"
                    strokeWidth="1.5"
                  />
                  <circle cx="60" cy="52" r="22" fill="#dc2626" stroke="#b45309" strokeWidth="2.5" />
                  <polygon
                    points="60,35 64,47 77,47 66,54 70,66 60,59 50,66 54,54 43,47 56,47"
                    fill="none"
                    stroke="#15803d"
                    strokeWidth="2.2"
                  />
                  <path d="M22 68 Q32 42 36 32 Q38 52 35 72 Z" fill="#d97706" />
                  <path d="M98 68 Q88 42 84 32 Q82 52 85 72 Z" fill="#d97706" />
                  <path
                    d="M28 80 Q60 90 92 80"
                    stroke="#b45309"
                    strokeWidth="4"
                    fill="none"
                  />
                </svg>
                <div
                  className="text-[7.5pt] font-bold tracking-wider text-slate-800 mt-0.5 text-center"
                  style={{ fontFamily: "'Noto Sans Tifinagh', sans-serif" }}
                >
                  ⵜⴰⴳⵍⴷⵉⵜ ⵏ ⵍⵎⵖⵔⵉⴱ · ⵜⴰⵎⴰⵡⴰⵙⵜ ⵏ ⵜⵣⵔⴼⵜ
                </div>
              </div>
              <div className="text-left font-bold text-[9pt] space-y-0.5" dir="ltr">
                <div>{identity.orgTitleFr}</div>
                <div>{identity.orgSubtitleFr}</div>
                <div>{identity.orgDepartmentFr}</div>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  };

  const renderFooter = (pageNumber: number, totalPages: number) => {
    const footerImg = isFr
      ? identity.footerImageFrUrl || identity.footerImageUrl
      : identity.footerImageUrl;

    return (
      <footer
        style={{
          marginTop: `${identity.footerMarginTopMm ?? 6}mm`,
        }}
        className="w-full mt-auto pt-2 select-none"
      >
        {doc.showPageNumbers && totalPages > 1 && (
          <div className="text-center text-[9.5pt] text-slate-600 mb-1 tabular-nums">
            {isFr ? `Page ${pageNumber} / ${totalPages}` : `الصفحة ${pageNumber} من ${totalPages}`}
          </div>
        )}
        {identity.useImageFooter && footerImg ? (
          <div className="w-full flex justify-center">
            <img
              src={footerImg}
              alt="التذييل الرسمي للمديرية الإقليمية للعدل بسطات"
              style={{
                maxHeight: `${identity.footerHeightMm || 16}mm`,
                width: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        ) : (
          <div className="w-full border-t border-slate-400 pt-1.5 text-center text-[9pt] leading-tight text-slate-800">
            <div dir="rtl" className="font-semibold">
              {identity.addressAr}
            </div>
            <div dir="ltr" className="text-[8.5pt]">
              {identity.addressFr}
            </div>
            <div dir="ltr" className="text-[8.5pt] font-medium tabular-nums">
              Tél. : {identity.phone} / Fax : {identity.fax} / Email: {identity.email}
            </div>
          </div>
        )}
      </footer>
    );
  };

  const renderTopMetadataAndAddressee = () => {
    const formattedDate = formatOfficialDate(doc.dateGrego, doc.language);

    return (
      <div className="w-full mb-3" dir={isFr ? 'ltr' : 'rtl'}>
        {/* Optional Ornamental Basmala at top of correspondence */}
        {doc.showBasmala && doc.basmalaText && (
          <div
            className="text-center font-bold mb-2 text-slate-950 tracking-wide"
            style={{ fontSize: `${doc.fontSizePt + 0.5}pt` }}
          >
            {doc.basmalaText}
          </div>
        )}

        {/* Row for Outgoing Stamp Box and City/Date */}
        <div className="flex justify-between items-start mb-3 text-[11.5pt]">
          {/* Outgoing Stamp Box */}
          <div>
            {doc.showOutgoingStampBox && (
              <div className="border border-slate-700 px-3 py-1.5 rounded-xs text-[10pt] leading-snug bg-white">
                <div className="font-bold text-slate-900">
                  {isFr ? identity.orgDepartmentFr : identity.orgDepartmentAr}
                </div>
                <div className="flex items-center gap-2 mt-0.5 tabular-nums">
                  <span className="font-semibold">
                    {isFr ? 'N° Départ :' : 'الصادر الرقم :'}
                  </span>
                  <span className="font-bold text-slate-950">{doc.number || '.......'}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-semibold">{isFr ? 'Date :' : 'التاريخ :'}</span>
                  <span>{formattedDate}</span>
                </div>
              </div>
            )}
          </div>

          {/* City & Date line */}
          {doc.showCityDateLine && (
            <div className="text-[11.5pt] font-medium text-slate-900 tabular-nums">
              {isFr ? (
                <span>
                  {doc.cityFr || 'Settat'}, le : {formattedDate}
                </span>
              ) : (
                <span>
                  {doc.cityAr || 'سطات'} في : {formattedDate}
                  {doc.showHijriDate && doc.dateHijri ? ` الموافق لـ ${doc.dateHijri}` : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Centered Official Addressee Block (المرسل إليه في الوسط كما في وثائق سطات الرسمية) */}
        <div className="w-full text-center my-3">
          {doc.showSenderHeader && (
            <div
              className="font-bold text-slate-950 mb-1"
              style={{ fontSize: `${doc.fontSizePt}pt` }}
            >
              {isFr
                ? 'De Monsieur le Directeur Provincial de la Justice de Settat'
                : 'من المدير الإقليمي للعدل بسطات'}
            </div>
          )}
          {addresseeLines.map((line, idx) => (
            <div
              key={idx}
              className="font-bold text-slate-950 leading-relaxed"
              style={{
                fontSize: idx === 0 ? `${doc.fontSizePt}pt` : `${doc.fontSizePt + 0.5}pt`,
              }}
            >
              {line}
            </div>
          ))}
          {doc.useSupervisoryLine && supervisoryLine && (
            <div
              className="font-bold text-slate-900 mt-1 underline underline-offset-4"
              style={{ fontSize: `${doc.fontSizePt - 0.5}pt` }}
            >
              {supervisoryLine}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBordereauPage = (
    page: ReturnType<typeof paginateCorrespondenceContent>[number]
  ) => {
    return (
      <div className="flex-1 flex flex-col" dir={isFr ? 'ltr' : 'rtl'}>
        {page.isFirstPage && renderTopMetadataAndAddressee()}

        {/* Bordereau Title */}
        <div className="text-center my-3">
          <h1
            className="inline-block font-bold border-b-2 border-slate-900 pb-1 px-6 tracking-wide text-slate-950"
            style={{ fontSize: `${doc.fontSizePt + 4}pt` }}
          >
            {isFr ? "BORDEREAU D'ENVOI" : 'ورقــــة الإرســــال'}
          </h1>
        </div>

        {/* 3-Column Official Bordereau Table matching Settat PDFs */}
        <div className="w-full my-2 flex-1">
          <table className="w-full border-collapse border-2 border-slate-900 text-slate-950">
            <thead>
              <tr className="bg-slate-100/80 text-center font-bold border-b-2 border-slate-900">
                <th
                  className="border border-slate-900 py-2.5 px-3 w-[54%]"
                  style={{ fontSize: `${doc.fontSizePt}pt` }}
                >
                  {isFr ? "Objet d'Envoi" : 'نوع المراسلات وتلخيص موضوعها'}
                </th>
                <th
                  className="border border-slate-900 py-2.5 px-2 w-[14%]"
                  style={{ fontSize: `${doc.fontSizePt}pt` }}
                >
                  {isFr ? 'Nombre' : 'عدد المرفقات'}
                </th>
                <th
                  className="border border-slate-900 py-2.5 px-3 w-[32%]"
                  style={{ fontSize: `${doc.fontSizePt}pt` }}
                >
                  {isFr ? 'Observations' : 'ملاحظات'}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Optional Intro line inside first column ("تجدون رفقته /:" or "يصلكم /:") */}
              {page.isFirstPage && doc.bordereauIntroText && (
                <tr>
                  <td
                    className="border-x border-slate-900 pt-3 pb-1 px-3 font-bold underline underline-offset-4"
                    style={{ fontSize: `${doc.fontSizePt}pt` }}
                  >
                    {doc.bordereauIntroText}
                  </td>
                  <td className="border-x border-slate-900" />
                  <td className="border-x border-slate-900" />
                </tr>
              )}

              {page.bordereauRowsSubset.map((row, idx) => {
                const isLastRow = idx === page.bordereauRowsSubset.length - 1;
                return (
                  <tr key={row.id || idx} className="align-top">
                    <td
                      className={`border-x border-slate-900 px-3 py-3 leading-relaxed whitespace-pre-wrap ${
                        isLastRow ? 'pb-8' : 'border-b border-slate-300'
                      }`}
                      style={{
                        fontSize: `${doc.fontSizePt}pt`,
                        textAlign: doc.textAlign || 'justify',
                      }}
                    >
                      {row.documentNature}
                    </td>
                    <td
                      className={`border-x border-slate-900 px-2 py-3 text-center font-bold tabular-nums ${
                        isLastRow ? 'pb-8' : 'border-b border-slate-300'
                      }`}
                      style={{ fontSize: `${doc.fontSizePt}pt` }}
                    >
                      {row.copiesCount}
                    </td>
                    <td
                      className={`border-x border-slate-900 px-3 py-3 leading-relaxed whitespace-pre-wrap ${
                        isLastRow ? 'pb-8' : 'border-b border-slate-300'
                      }`}
                      style={{ fontSize: `${doc.fontSizePt - 0.5}pt` }}
                    >
                      <div>{row.observations}</div>

                      {/* In authentic Settat Bordereaux, the greeting and signature sit inside the Observations column on the last row */}
                      {page.isLastPage && isLastRow && (
                        <div className="mt-8 pt-4 text-center">
                          {doc.closingText && (
                            <div className="mb-4 font-medium">{doc.closingText}</div>
                          )}
                          <div className="font-bold underline underline-offset-4 mb-1">
                            {isFr ? 'Signature :' : 'الإمضاء :'}
                          </div>
                          <div className="font-bold">{sigTitle}</div>
                          {showSignerName && sigName && (
                            <div className="font-semibold mt-0.5">{sigName}</div>
                          )}
                          <div className="h-20" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStandardCorrespondencePage = (
    page: ReturnType<typeof paginateCorrespondenceContent>[number]
  ) => {
    return (
      <div className="flex-1 flex flex-col" dir={isFr ? 'ltr' : 'rtl'}>
        {page.isFirstPage && renderTopMetadataAndAddressee()}

        {/* Subject & Reference Block on Page 1 */}
        {page.isFirstPage && (
          <div className="w-full my-2 space-y-1.5">
            {/* Subject Line */}
            <div
              className="flex items-baseline gap-2 leading-relaxed"
              style={{ fontSize: `${doc.fontSizePt}pt` }}
            >
              <span className="font-bold underline underline-offset-4 shrink-0 text-slate-950">
                {isFr ? 'Objet :' : 'الموضوع :'}
              </span>
              <span className="font-bold text-slate-950">{doc.subject}</span>
            </div>

            {/* Reference Line (Hidden cleanly if showReference is false or empty) */}
            {doc.showReference && doc.reference.trim() !== '' && (
              <div
                className="flex items-baseline gap-2 leading-relaxed"
                style={{ fontSize: `${doc.fontSizePt}pt` }}
              >
                <span className="font-bold underline underline-offset-4 shrink-0 text-slate-950">
                  {isFr ? 'Référence :' : 'المرجع :'}
                </span>
                <span className="font-semibold text-slate-900 whitespace-pre-line">
                  {doc.reference}
                </span>
              </div>
            )}

            {/* Centered Salutation ("سلام تام بوجود مولانا الإمام،") */}
            {doc.showSalutation && doc.salutationText && (
              <div
                className="text-center font-bold my-3 text-slate-950"
                style={{ fontSize: `${doc.fontSizePt}pt` }}
              >
                {doc.salutationText}
              </div>
            )}

            {/* Opening transition ("وبعد،") */}
            {doc.openingTransition && (
              <div
                className="font-bold mt-1 text-slate-950"
                style={{ fontSize: `${doc.fontSizePt}pt` }}
              >
                {doc.openingTransition}
              </div>
            )}
          </div>
        )}

        {/* Body Paragraphs */}
        <div
          className="my-1 text-slate-950"
          style={{
            fontSize: `${doc.fontSizePt}pt`,
            lineHeight: doc.lineHeight || 1.75,
            textAlign: doc.textAlign || 'justify',
          }}
        >
          {page.paragraphs.map((para, pIdx) => {
            const isNumberedPoint = /^(\d+[\.\-\)]|\-|•)/.test(para.trim());
            const indentMm = doc.firstLineIndentMm ?? 10;
            const spacingPt = doc.paragraphSpacingPt ?? 9;
            return (
              <p
                key={pIdx}
                className="whitespace-pre-wrap"
                style={{
                  textIndent: isNumberedPoint ? '0mm' : `${indentMm}mm`,
                  marginBottom: `${spacingPt}pt`,
                }}
              >
                {para}
              </p>
            );
          })}
        </div>

        {/* Technical Tables (Rendered on last page or inline with repeatable header) */}
        {page.isLastPage &&
          doc.technicalTables &&
          doc.technicalTables.length > 0 &&
          doc.technicalTables.map((tbl) => (
            <div key={tbl.id} className="my-3 w-full">
              {tbl.title && (
                <div
                  className="font-bold text-center mb-1.5 underline underline-offset-4 text-slate-950"
                  style={{ fontSize: `${doc.fontSizePt - 0.5}pt` }}
                >
                  {tbl.title}
                </div>
              )}
              <table
                className="w-full border-collapse border border-slate-900 text-slate-950"
                style={{ fontSize: `${Math.max(10, doc.fontSizePt - 1.5)}pt` }}
              >
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    {tbl.columns.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className="border border-slate-900 px-2 py-1.5"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tbl.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="text-center">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="border border-slate-900 px-2 py-1"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* Closing Formula & Official Signature Block (Kept together on last page) */}
        {page.includeSignatureBlock && (
          <div className="signature-keep-together mt-4">
            {doc.closingText && (
              <p
                className="font-bold text-center my-3 text-slate-950"
                style={{ fontSize: `${doc.fontSizePt}pt` }}
              >
                {doc.closingText}
              </p>
            )}

            {/* Signature positioned on the left in Arabic (or right in French) as in official Settat letters */}
            <div
              className={`w-full flex mt-4 ${
                isFr ? 'justify-end' : 'justify-end'
              }`}
            >
              <div className="w-64 text-center">
                <div
                  className="font-bold text-slate-950"
                  style={{ fontSize: `${doc.fontSizePt}pt` }}
                >
                  {sigTitle}
                </div>
                {showSignerName && sigName && (
                  <div
                    className="font-semibold text-slate-900 mt-0.5"
                    style={{ fontSize: `${doc.fontSizePt - 0.5}pt` }}
                  >
                    {sigName}
                  </div>
                )}

                {/* Space for manual signature and official stamp */}
                <div className="h-20 flex items-center justify-center relative">
                  {signatureProfile?.showStampImage && signatureProfile.stampImageUrl && (
                    <img
                      src={signatureProfile.stampImageUrl}
                      alt="الختم الرسمي"
                      className="max-h-20 object-contain opacity-90"
                    />
                  )}
                  {signatureProfile?.showSignatureImage &&
                    signatureProfile.signatureImageUrl && (
                      <img
                        src={signatureProfile.signatureImageUrl}
                        alt="التوقيع"
                        className="max-h-16 object-contain"
                      />
                    )}
                </div>
              </div>
            </div>

            {/* Attachments list at bottom right (المرفقات) */}
            {doc.attachments && doc.attachments.length > 0 && (
              <div
                className="mt-2 pt-2 border-t border-slate-300 text-slate-900"
                style={{ fontSize: `${doc.fontSizePt - 1.5}pt` }}
              >
                <div className="font-bold underline underline-offset-2 mb-1">
                  {isFr ? 'Pièces jointes :' : 'المرفقات :'}
                </div>
                <ul className="list-disc list-inside space-y-0.5">
                  {doc.attachments.map((att) => (
                    <li key={att.id}>
                      {att.name}
                      {att.copiesCount > 1
                        ? isFr
                          ? ` (${att.copiesCount} copies)`
                          : ` (${att.copiesCount} نسخ)`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={
        isPrintMode
          ? 'w-full'
          : 'flex flex-col items-center gap-8 py-4 origin-top transition-transform'
      }
      style={
        !isPrintMode && scale !== 1
          ? {
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }
          : undefined
      }
    >
      {pages.map((page) => (
        <div
          key={page.pageNumber}
          className="a4-sheet flex flex-col justify-between bg-white text-black"
          style={{
            fontFamily: `'${fontFamily}', 'Amiri', 'Cairo', serif`,
            paddingTop: `${identity.pageMarginTopMm ?? 12}mm`,
            paddingBottom: `${identity.pageMarginBottomMm ?? 12}mm`,
            paddingRight: `${identity.pageMarginRightMm ?? 18}mm`,
            paddingLeft: `${identity.pageMarginLeftMm ?? 18}mm`,
          }}
        >
          {renderHeader(page.pageNumber)}
          {isBordereau
            ? renderBordereauPage(page)
            : renderStandardCorrespondencePage(page)}
          {renderFooter(page.pageNumber, page.totalPages)}
        </div>
      ))}
    </div>
  );
};
