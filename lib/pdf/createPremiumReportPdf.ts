import "server-only";

import fs from "node:fs";
import PDFDocument from "pdfkit";
import { postposition } from "@/lib/korean/postposition";
import type { Reading } from "@/types/reading";

const page = {
  width: 595.28,
  height: 841.89,
  margin: 56,
};

const colors = {
  ink: "#2B2528",
  muted: "#6F6265",
  berry: "#A53D62",
  persimmon: "#E9774D",
  moss: "#4B7B5A",
  cream: "#FFF7EC",
  oat: "#F2DEC7",
  white: "#FFFDF8",
};

function findFontPath() {
  const candidates = [
    process.env.PDF_FONT_PATH,
    "C:\\Windows\\Fonts\\malgun.ttf",
    "C:\\Windows\\Fonts\\malgunsl.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").trim() || "반려동물";
}

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > page.height - page.margin) {
    doc.addPage();
  }
}

function addFooter(doc: PDFKit.PDFDocument) {
  const oldY = doc.y;
  doc
    .fontSize(8)
    .fillColor(colors.muted)
    .text(
      "멍냥사주 리포트는 엔터테인먼트와 반려생활 이해를 위한 콘텐츠입니다.",
      page.margin,
      page.height - 44,
      {
        align: "center",
        width: page.width - page.margin * 2,
        lineBreak: false,
      },
    );
  doc.y = oldY;
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 72);
  doc.moveDown(0.8);
  const titleY = doc.y;
  doc
    .roundedRect(page.margin, titleY, page.width - page.margin * 2, 38, 12)
    .fill(colors.cream);
  doc
    .fillColor(colors.berry)
    .fontSize(16)
    .text(title, page.margin + 18, titleY + 10, {
      width: page.width - page.margin * 2 - 36,
    });
  doc.y = titleY + 42;
  doc.moveDown(1.2);
}

function addBody(doc: PDFKit.PDFDocument, text: string) {
  doc
    .fontSize(11)
    .fillColor(colors.ink)
    .text(text, {
      width: page.width - page.margin * 2,
      lineGap: 6,
      paragraphGap: 8,
      align: "left",
    });
}

function addCover(doc: PDFKit.PDFDocument, reading: Reading, createdAt: string) {
  const petNamePossessive = postposition.possessive(reading.petName);

  doc.rect(0, 0, page.width, page.height).fill(colors.cream);
  doc
    .roundedRect(page.margin, 108, page.width - page.margin * 2, 520, 28)
    .fill(colors.white)
    .strokeColor(colors.oat)
    .stroke();

  doc
    .fillColor(colors.persimmon)
    .fontSize(12)
    .text("MEONGNYANG SAJU", page.margin + 36, 152, {
      width: page.width - page.margin * 2 - 72,
      align: "center",
    });

  doc
    .fillColor(colors.ink)
    .fontSize(34)
    .text(petNamePossessive, page.margin + 36, 210, {
      width: page.width - page.margin * 2 - 72,
      align: "center",
      lineGap: 8,
    })
    .text("사주 심층 리포트", {
      align: "center",
      width: page.width - page.margin * 2 - 72,
    });

  doc
    .fillColor(colors.muted)
    .fontSize(12)
    .text("반려동물과 보호자를 위한 다정한 오행 해석", page.margin + 36, 330, {
      width: page.width - page.margin * 2 - 72,
      align: "center",
    });

  doc
    .roundedRect(page.margin + 84, 390, page.width - page.margin * 2 - 168, 84, 18)
    .fill("#F9E5DD");
  doc
    .fillColor(colors.berry)
    .fontSize(13)
    .text("리포트 생성일", page.margin + 108, 410, {
      width: page.width - page.margin * 2 - 216,
      align: "center",
    })
    .fillColor(colors.ink)
    .fontSize(17)
    .text(createdAt, {
      align: "center",
      width: page.width - page.margin * 2 - 216,
    });

  doc
    .fillColor(colors.muted)
    .fontSize(10)
    .text(
      "본 리포트는 건강 판단이나 미래 단정이 아닌, 반려생활을 더 따뜻하게 이해하기 위한 콘텐츠입니다.",
      page.margin + 48,
      560,
      {
        width: page.width - page.margin * 2 - 96,
        align: "center",
        lineGap: 4,
      },
    );

  doc
    .fillColor(colors.muted)
    .fontSize(9)
    .text(
      "포함 내용: 표지 · 반려동물 정보 · 한 장 요약 · 오행 밸런스 · 종합 리포트 · 생성일",
      page.margin + 48,
      622,
      {
        width: page.width - page.margin * 2 - 96,
        align: "center",
      },
    );
}

function addSummaryCard(doc: PDFKit.PDFDocument, reading: Reading) {
  doc.addPage();
  const cardY = 98;
  const petNameTopic = postposition.topic(reading.petName);

  doc
    .fillColor(colors.berry)
    .fontSize(22)
    .text("한 장 요약 카드", page.margin, 62);

  doc
    .roundedRect(page.margin, cardY, page.width - page.margin * 2, 250, 24)
    .fill("#FFF1E8")
    .strokeColor("#E9CDBD")
    .stroke();

  const firstSection = reading.premiumSections[0]?.body ?? "";
  const secondSection = reading.premiumSections[1]?.body ?? "";
  const cardText = [
    `${petNameTopic} 자기만의 속도와 루틴이 중요한 아이로 읽혀요.`,
    firstSection.slice(0, 220),
    secondSection.slice(0, 220),
    "보호자는 큰 변화보다 작은 반복과 차분한 신호를 통해 아이의 안정감을 도와줄 수 있습니다.",
  ].join("\n\n");

  doc
    .fillColor(colors.ink)
    .fontSize(12)
    .text(cardText, page.margin + 24, cardY + 28, {
      width: page.width - page.margin * 2 - 48,
      lineGap: 7,
    });
}

export async function createPremiumReportPdf(reading: Reading) {
  const fontPath = findFontPath();
  const petNamePossessive = postposition.possessive(reading.petName);
  const doc = new PDFDocument({
    size: "A4",
    margin: page.margin,
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: `${petNamePossessive} 사주 심층 리포트`,
      Author: "멍냥사주",
      Subject: "반려동물 사주 리포트",
    },
  });
  const pdfPromise = collectPdf(doc);
  const createdAt = formatDate();

  if (!fontPath) {
    throw new Error("PDF Korean font file was not found. Set PDF_FONT_PATH.");
  }

  doc.registerFont("Korean", fontPath);
  doc.font("Korean");
  doc.addPage();

  addCover(doc, reading, createdAt);
  addSummaryCard(doc, reading);

  doc.addPage();
  addSectionTitle(doc, "무료 요약");
  addBody(doc, reading.freeSummary);

  doc.addPage();
  addSectionTitle(doc, "심층 리포트");

  for (const section of reading.premiumSections) {
    addSectionTitle(doc, section.title);
    addBody(doc, section.body);
  }

  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    addFooter(doc);
  }

  doc.end();
  const buffer = await pdfPromise;
  const filename = `${sanitizeFilenamePart(reading.petName)}_사주리포트.pdf`;

  return {
    buffer,
    filename,
  };
}
