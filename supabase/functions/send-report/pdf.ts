// PDF report renderer — pdf-lib. Mirrors the app's design language
// (deep green accent, P/F/NA/R chips) on A4 pages.
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from 'npm:pdf-lib@1.17.1';

export type ReportData = {
  reportId: string;
  date: string;
  companyName: string;
  inspectorName: string;
  client: { name: string; email: string; phone: string; address: string };
  vehicle: {
    title: string;
    plate: string;
    vin: string;
    chassis: string;
    colour: string;
    odometer: string;
    transmission: string;
    fuel: string;
    engine: string;
    drive: string;
    seller: string;
    price: string;
  };
  rating: number; // 1..5
  recommendation: 'recommended' | 'recommended_with_repairs' | 'not_recommended';
  notes: string;
  sections: {
    title: string;
    items: { number: number; label: string; result: 'pass' | 'fail' | 'na' | 'repair' | null; note: string | null }[];
  }[];
  photos: Uint8Array[]; // JPEG bytes
  signature: Uint8Array | null; // PNG bytes
};

const GREEN = rgb(0.086, 0.639, 0.29); // #16A34A — pass semantics only
const BRAND = rgb(0.863, 0.149, 0.149); // #DC2626
const BRAND_DARK = rgb(0.498, 0.114, 0.114); // #7F1D1D
const RED = rgb(0.863, 0.149, 0.149);
const AMBER = rgb(0.851, 0.467, 0.024);
const GRAY = rgb(0.545, 0.58, 0.553);
const TEXT = rgb(0.09, 0.114, 0.098);
const TEXT_SOFT = rgb(0.36, 0.4, 0.37);
const ZEBRA = rgb(0.976, 0.984, 0.976);
const GOLD = rgb(0.96, 0.62, 0.043);

const RESULT_STYLE: Record<string, { letter: string; color: RGB }> = {
  pass: { letter: 'P', color: GREEN },
  fail: { letter: 'F', color: RED },
  repair: { letter: 'R', color: AMBER },
  na: { letter: 'NA', color: GRAY },
};

const REC_LABEL = {
  recommended: 'RECOMMENDED',
  recommended_with_repairs: 'RECOMMENDED WITH REPAIRS',
  not_recommended: 'NOT RECOMMENDED',
} as const;
const REC_COLOR = { recommended: GREEN, recommended_with_repairs: AMBER, not_recommended: RED } as const;

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;

class Painter {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  constructor(
    public doc: PDFDocument,
    public font: PDFFont,
    public bold: PDFFont,
  ) {
    this.addPage();
  }
  addPage() {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - MARGIN;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN + 20) this.addPage();
  }
  text(str: string, opts: { x?: number; size?: number; bold?: boolean; color?: RGB; advance?: boolean } = {}) {
    const size = opts.size ?? 10;
    this.page.drawText(str, {
      x: opts.x ?? MARGIN,
      y: this.y - size,
      size,
      font: opts.bold ? this.bold : this.font,
      color: opts.color ?? TEXT,
    });
    if (opts.advance !== false) this.y -= size + 6;
  }
  rule(color: RGB = BRAND, thickness = 2) {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4[0] - MARGIN, y: this.y },
      thickness,
      color,
    });
    this.y -= 10;
  }
  gap(h: number) {
    this.y -= h;
  }
  wrap(str: string, size: number, maxWidth: number, bold = false): string[] {
    const font = bold ? this.bold : this.font;
    const words = str.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(attempt, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
}

function labelValueGrid(p: Painter, pairs: [string, string][], columns = 2) {
  const colWidth = (A4[0] - MARGIN * 2) / columns;
  const rows = Math.ceil(pairs.length / columns);
  for (let r = 0; r < rows; r++) {
    p.ensure(26);
    for (let c = 0; c < columns; c++) {
      const pair = pairs[r * columns + c];
      if (!pair) continue;
      const x = MARGIN + c * colWidth;
      p.page.drawText(pair[0].toUpperCase(), { x, y: p.y - 7, size: 7, font: p.bold, color: TEXT_SOFT });
      p.page.drawText(pair[1] || '—', { x, y: p.y - 19, size: 10, font: p.font, color: TEXT });
    }
    p.y -= 28;
  }
}

function drawStars(p: Painter, rating: number, x: number, size = 14) {
  for (let i = 0; i < 5; i++) {
    // Helvetica (WinAnsi) cannot encode ★/☆ — use ASCII star markers
    p.page.drawText(i < rating ? '*' : 'o', {
      x: x + i * (size + 2),
      y: p.y - size,
      size,
      font: p.font,
      color: i < rating ? GOLD : GRAY,
    });
  }
}

function chip(p: Painter, letter: string, color: RGB, x: number, yCenter: number) {
  const w = letter.length > 1 ? 24 : 18;
  p.page.drawRectangle({
    x,
    y: yCenter - 7,
    width: w,
    height: 14,
    color,
    // rounded corners approximated — pdf-lib rectangles are square; keep small
  });
  const tw = p.bold.widthOfTextAtSize(letter, 8);
  p.page.drawText(letter, { x: x + (w - tw) / 2, y: yCenter - 3.5, size: 8, font: p.bold, color: rgb(1, 1, 1) });
}

export async function renderReport(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const p = new Painter(doc, font, bold);

  // ===== Cover =====
  p.text(data.companyName || 'Vehicle Inspections', { size: 16, bold: true, color: BRAND_DARK });
  p.text('Pre-Purchase Vehicle Inspection Report', { size: 11, color: TEXT_SOFT });
  p.gap(2);
  p.rule();
  p.text(`Report ${data.reportId}  ·  ${data.date}`, { size: 9, color: TEXT_SOFT });
  p.gap(10);

  p.text(data.vehicle.title, { size: 20, bold: true });
  p.gap(6);
  labelValueGrid(p, [
    ['Registration plate', data.vehicle.plate],
    ['VIN', data.vehicle.vin],
    ['Chassis number', data.vehicle.chassis],
    ['Colour', data.vehicle.colour],
    ['Odometer', data.vehicle.odometer],
    ['Transmission', data.vehicle.transmission],
    ['Fuel type', data.vehicle.fuel],
    ['Engine', data.vehicle.engine],
    ['Drive type', data.vehicle.drive],
    ['Seller', data.vehicle.seller],
    ['Purchase price', data.vehicle.price],
  ]);
  p.gap(8);

  p.text('CLIENT', { size: 8, bold: true, color: TEXT_SOFT });
  labelValueGrid(p, [
    ['Name', data.client.name],
    ['Email', data.client.email],
    ['Phone', data.client.phone],
    ['Address', data.client.address],
  ]);
  p.gap(10);

  // Result hero
  const counts = { pass: 0, fail: 0, repair: 0, na: 0 };
  for (const s of data.sections) for (const i of s.items) if (i.result) counts[i.result]++;
  p.ensure(80);
  p.text('OVERALL RESULT', { size: 8, bold: true, color: TEXT_SOFT });
  drawStars(p, data.rating, MARGIN, 16);
  const recLabel = REC_LABEL[data.recommendation];
  const recColor = REC_COLOR[data.recommendation];
  const recWidth = bold.widthOfTextAtSize(recLabel, 10) + 16;
  p.page.drawRectangle({ x: MARGIN + 110, y: p.y - 17, width: recWidth, height: 18, color: recColor });
  p.page.drawText(recLabel, { x: MARGIN + 118, y: p.y - 12, size: 10, font: bold, color: rgb(1, 1, 1) });
  p.y -= 26;
  p.text(
    `${counts.pass} Passed  ·  ${counts.repair} Repair/attention  ·  ${counts.fail} Failed  ·  ${counts.na} N/A`,
    { size: 10, color: TEXT_SOFT },
  );

  // ===== Sections =====
  const contentWidth = A4[0] - MARGIN * 2;
  for (const section of data.sections) {
    p.ensure(60);
    p.gap(14);
    const tally = section.items.reduce(
      (acc, i) => {
        if (i.result) acc[i.result]++;
        return acc;
      },
      { pass: 0, fail: 0, repair: 0, na: 0 } as Record<string, number>,
    );
    p.text(section.title.toUpperCase(), { size: 11, bold: true, color: BRAND_DARK, advance: false });
    p.page.drawText(`${tally.pass}P  ${tally.repair}R  ${tally.fail}F  ${tally.na}NA`, {
      x: A4[0] - MARGIN - 90,
      y: p.y - 11,
      size: 9,
      font: bold,
      color: TEXT_SOFT,
    });
    p.y -= 18;
    p.rule(rgb(0.9, 0.914, 0.9), 1);

    let zebra = false;
    for (const item of section.items) {
      const labelLines = p.wrap(item.label, 9, contentWidth - 90);
      const noteLines = item.note ? p.wrap(item.note, 8, contentWidth - 110) : [];
      const rowHeight = 8 + labelLines.length * 11 + noteLines.length * 10;
      p.ensure(rowHeight);
      if (zebra) {
        p.page.drawRectangle({ x: MARGIN, y: p.y - rowHeight + 4, width: contentWidth, height: rowHeight, color: ZEBRA });
      }
      zebra = !zebra;
      p.page.drawText(String(item.number), { x: MARGIN + 4, y: p.y - 12, size: 8, font, color: TEXT_SOFT });
      labelLines.forEach((line, i) => {
        p.page.drawText(line, { x: MARGIN + 30, y: p.y - 12 - i * 11, size: 9, font, color: TEXT });
      });
      const style = item.result ? RESULT_STYLE[item.result] : null;
      if (style) chip(p, style.letter, style.color, A4[0] - MARGIN - 30, p.y - 9);
      let noteY = p.y - 12 - labelLines.length * 11;
      noteLines.forEach((line) => {
        p.page.drawText(line, { x: MARGIN + 30, y: noteY, size: 8, font, color: TEXT_SOFT });
        noteY -= 10;
      });
      p.y -= rowHeight;
    }
  }

  // ===== Photos =====
  if (data.photos.length > 0) {
    p.addPage();
    p.text('PHOTOS', { size: 11, bold: true, color: BRAND_DARK });
    p.rule();
    const cell = (contentWidth - 16) / 2;
    let col = 0;
    for (let i = 0; i < data.photos.length; i++) {
      try {
        const img = await doc.embedJpg(data.photos[i]);
        const scale = Math.min(cell / img.width, (cell * 0.75) / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        if (col === 0) p.ensure(cell * 0.75 + 24);
        const x = MARGIN + col * (cell + 16);
        p.page.drawImage(img, { x, y: p.y - h, width: w, height: h });
        p.page.drawText(`Photo ${i + 1}`, { x, y: p.y - h - 12, size: 8, font, color: TEXT_SOFT });
        col += 1;
        if (col === 2) {
          col = 0;
          p.y -= cell * 0.75 + 26;
        }
      } catch {
        // skip unembeddable photo
      }
    }
    if (col !== 0) p.y -= cell * 0.75 + 26;
  }

  // ===== Sign-off =====
  p.ensure(200);
  p.gap(20);
  if (data.notes) {
    p.text('INSPECTOR NOTES', { size: 8, bold: true, color: TEXT_SOFT });
    for (const line of p.wrap(data.notes, 10, contentWidth)) p.text(line, { size: 10 });
    p.gap(12);
  }
  p.text('SIGNED', { size: 8, bold: true, color: TEXT_SOFT });
  if (data.signature) {
    try {
      const sig = await doc.embedPng(data.signature);
      const scale = Math.min(180 / sig.width, 60 / sig.height);
      p.ensure(70);
      p.page.drawImage(sig, { x: MARGIN, y: p.y - sig.height * scale, width: sig.width * scale, height: sig.height * scale });
      p.y -= sig.height * scale + 8;
    } catch {
      // signature embed failed; continue with name only
    }
  }
  p.text(`${data.inspectorName}  ·  ${data.date}`, { size: 10 });
  p.gap(16);
  const disclaimer =
    'This inspection is a visual assessment only and does not include dismantling or diagnostic testing. ' +
    'While every effort is made to identify existing issues, the inspector accepts no responsibility or liability for any defects, ' +
    'mechanical failures, or future problems that may arise after the inspection. This report is provided as a guide only and does not ' +
    'guarantee the future reliability, safety, or roadworthiness of the vehicle. The final purchasing decision is the responsibility of the buyer.';
  for (const line of p.wrap(disclaimer, 7.5, contentWidth)) p.text(line, { size: 7.5, color: TEXT_SOFT });

  // Footers
  p.pages.forEach((page, i) => {
    page.drawText(`${data.companyName || 'Vehicle Inspections'}  ·  generated ${data.date}  ·  page ${i + 1} of ${p.pages.length}`, {
      x: MARGIN,
      y: 24,
      size: 7,
      font,
      color: TEXT_SOFT,
    });
  });

  return doc.save();
}
