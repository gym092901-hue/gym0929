type OpenPrintableReportInput = {
  title: string;
  reportText: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

export function openPrintableReport({
  title,
  reportText,
}: OpenPrintableReportInput) {
  const safeTitle = escapeHtml(title);
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color: #2B2B31;
      background: #FFF7EC;
      font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px;
      background: #FFF7EC;
    }
    .toolbar {
      position: sticky;
      top: 16px;
      z-index: 10;
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    button {
      min-height: 44px;
      border: 0;
      border-radius: 999px;
      background: #E85D8B;
      color: white;
      padding: 0 22px;
      font-size: 15px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 24px rgba(232, 93, 139, 0.24);
    }
    article {
      width: min(100%, 210mm);
      min-height: 297mm;
      margin: 0 auto;
      padding: 22mm 18mm;
      border-radius: 24px;
      background: #FFFDF8;
      box-shadow: 0 18px 44px rgba(76, 54, 36, 0.12);
    }
    h1 {
      margin: 0 0 24px;
      color: #2B2B31;
      font-size: 30px;
      line-height: 1.25;
    }
    p {
      margin: 0 0 14px;
      color: rgba(43, 43, 49, 0.76);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.8;
      word-break: keep-all;
    }
    @page {
      size: A4;
      margin: 14mm;
    }
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .toolbar { display: none; }
      article {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        border-radius: 0;
        box-shadow: none;
        background: white;
      }
      p { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">인쇄하기</button>
  </div>
  <article>
    <h1>${safeTitle}</h1>
    ${textToHtml(reportText)}
  </article>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!printWindow) {
    URL.revokeObjectURL(url);
    return false;
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
