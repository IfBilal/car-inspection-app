// PDF report renderer — replicates docs/report.pdf (JS Elite Motorworks
// "Premium Used Car Pre-Purchase Inspection Checklist") with pdf-lib.
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb, type RGB } from 'npm:pdf-lib@1.17.1';
import { LOGO_B64 } from './logo.ts';
import { DIAGRAM_B64 } from './diagram.ts';

export type SectionKind = 'status' | 'passfail' | 'flags';
export type ItemResult = 'pass' | 'fail' | 'na' | 'repair' | null;

export type DamageMark = { x: number; y: number; t: 'dent' | 'scratch' | 'rust' };

export type ReportData = {
  inspectionId: string;
  date: string;
  companyName: string;
  inspectorName: string;
  buyerName: string;
  sellerName: string;
  vehicle: {
    year: string;
    make: string;
    model: string;
    trim: string;
    vin: string;
    plate: string;
    odometer: string;
    transmission: string;
    drivetrain: string;
    exteriorColor: string;
    fuelType: string;
    askingPrice: string;
  };
  sections: {
    title: string;
    kind: SectionKind;
    items: { number: number; label: string; description: string | null; result: ItemResult; note: string | null }[];
  }[];
  obd: { ready: boolean | null; codes: string; notes: string };
  damageMarks: DamageMark[];
  score: number; // 1..10
  estimatedRepairCost: string;
  recommendation: 'buy' | 'negotiate' | 'walk_away';
  notes: string;
  photos: Uint8Array[];
  signature: Uint8Array | null;
};

// ===== palette (sampled from report.pdf) =====
const NAVY = rgb(0.106, 0.141, 0.329); // section bars
const NAVY_TEXT = rgb(0.08, 0.11, 0.27);
const RED_BAR = rgb(0.784, 0.063, 0.18); // red flags bar
const GREEN = rgb(0.086, 0.639, 0.29);
const AMBER = rgb(0.96, 0.62, 0.043);
const BLUE = rgb(0.145, 0.388, 0.922);
const RED = rgb(0.863, 0.149, 0.149);
const GRAY = rgb(0.55, 0.55, 0.58);
const TEXT = rgb(0.1, 0.1, 0.12);
const SOFT = rgb(0.38, 0.38, 0.42);
const LINE = rgb(0.106, 0.141, 0.329);
const WHITE = rgb(1, 1, 1);

const A4: [number, number] = [595.28, 841.89];
const M = 40;
const W = A4[0] - M * 2;
const HEADER_H = 80;

const CONTACT_LINE =
  'Phone: +1 (555) 012-3456   ·   Email: reports@jselitemotorworks.com   ·   www.jselitemotorworks.com   ·   App: carinspect.pro';

const STATUS_OPTS: { result: Exclude<ItemResult, null>; label: string; color: RGB }[] = [
  { result: 'pass', label: 'OK', color: GREEN },
  { result: 'repair', label: 'Needs Attention', color: AMBER },
  { result: 'fail', label: 'Critical', color: RED },
];

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
    this.y = A4[1] - M - HEADER_H;
  }
  ensure(h: number) {
    if (this.y - h < M + 30) this.addPage();
  }
  gap(h: number) {
    this.y -= h;
  }
  wrap(str: string, size: number, maxW: number, bold = false): string[] {
    const f = bold ? this.bold : this.font;
    const out: string[] = [];
    for (const para of String(str).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const t = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(t, size) > maxW && line) {
          out.push(line);
          line = word;
        } else line = t;
      }
      if (line) out.push(line);
    }
    return out;
  }
  text(str: string, x: number, yTop: number, size: number, opts: { bold?: boolean; color?: RGB } = {}) {
    this.page.drawText(str, {
      x,
      y: yTop - size,
      size,
      font: opts.bold ? this.bold : this.font,
      color: opts.color ?? TEXT,
    });
  }
  /** Navy (or custom) section bar with optional right-side column headers. */
  sectionBar(title: string, color: RGB = NAVY, rightCols?: { label: string; x: number }[]) {
    this.ensure(26);
    this.page.drawRectangle({ x: M, y: this.y - 20, width: W, height: 20, color });
    // shrink long titles so they never collide with the column headers
    const maxTitleW = (rightCols?.length ? rightCols[0].x : M + W) - M - 20;
    let size = 9.5;
    while (size > 6.5 && this.bold.widthOfTextAtSize(title.toUpperCase(), size) > maxTitleW) size -= 0.5;
    this.text(title.toUpperCase(), M + 8, this.y - 4.5 - (9.5 - size) / 2, size, { bold: true, color: WHITE });
    for (const col of rightCols ?? []) {
      this.text(col.label, col.x, this.y - 5.5, 8, { bold: true, color: WHITE });
    }
    this.y -= 22;
  }
  cellBorder(x: number, yTop: number, w: number, h: number) {
    this.page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: LINE, borderWidth: 0.8 });
  }
  checkbox(x: number, yCenter: number, checked: boolean, color: RGB = NAVY) {
    this.page.drawRectangle({
      x,
      y: yCenter - 4.5,
      width: 9,
      height: 9,
      borderColor: LINE,
      borderWidth: 0.9,
      color: checked ? color : undefined,
    });
    if (checked) this.text('X', x + 1.8, yCenter + 4.2, 7.5, { bold: true, color: WHITE });
  }
  dot(x: number, yCenter: number, color: RGB, filled: boolean) {
    this.page.drawCircle({
      x,
      y: yCenter,
      size: 3.4,
      color: filled ? color : undefined,
      borderColor: color,
      borderWidth: 0.9,
      opacity: filled ? 1 : 0.5,
      borderOpacity: filled ? 1 : 0.5,
    });
  }
}

function vehicleDetailsBlock(p: Painter, d: ReportData) {
  p.sectionBar('Vehicle Details');
  const rows: [string, string, string, string][] = [
    ['Rego:', d.vehicle.plate, 'Date:', d.date],
    ['Inspector Name:', d.inspectorName, 'Buyer Name:', d.buyerName],
    ['Seller Name:', d.sellerName, 'Year:', d.vehicle.year],
    ['Make:', d.vehicle.make, 'Model:', d.vehicle.model],
    ['Trim / Model Variant:', d.vehicle.trim, 'VIN:', d.vehicle.vin],
    ['Odometer Reading:', d.vehicle.odometer, 'Transmission:', d.vehicle.transmission],
    ['Drivetrain:', d.vehicle.drivetrain, 'Exterior Color:', d.vehicle.exteriorColor],
    ['Fuel Type:', d.vehicle.fuelType, 'Asking Price:', d.vehicle.askingPrice ? `$ ${d.vehicle.askingPrice}` : ''],
  ];
  const rowH = 18;
  const half = W / 2;
  for (const [l1, v1, l2, v2] of rows) {
    p.ensure(rowH);
    p.cellBorder(M, p.y, half, rowH);
    p.cellBorder(M + half, p.y, half, rowH);
    p.text(l1, M + 6, p.y - 4, 8.5, { bold: true, color: NAVY_TEXT });
    p.text(v1 || '', M + 6 + p.bold.widthOfTextAtSize(l1, 8.5) + 6, p.y - 4.5, 8.5);
    p.text(l2, M + half + 6, p.y - 4, 8.5, { bold: true, color: NAVY_TEXT });
    p.text(v2 || '', M + half + 6 + p.bold.widthOfTextAtSize(l2, 8.5) + 6, p.y - 4.5, 8.5);
    p.y -= rowH;
  }
  p.gap(10);
}

function passFailSection(p: Painter, section: ReportData['sections'][0]) {
  const colW = 52;
  const colsX = [M + W - colW * 3, M + W - colW * 2, M + W - colW];
  p.sectionBar(section.title, NAVY, [
    { label: 'PASS', x: colsX[0] + 14 },
    { label: 'FAIL', x: colsX[1] + 16 },
    { label: 'N/A', x: colsX[2] + 18 },
  ]);
  for (const item of section.items) {
    const labelW = W - colW * 3 - 12;
    const lines = p.wrap(item.label + (item.description ? ` (${item.description.replace(/\.$/, '')})` : ''), 8.5, labelW);
    const rowH = Math.max(18, lines.length * 11 + 7);
    p.ensure(rowH);
    p.cellBorder(M, p.y, W - colW * 3, rowH);
    colsX.forEach((x) => p.cellBorder(x, p.y, colW, rowH));
    lines.forEach((line, i) => p.text(line, M + 6, p.y - 4 - i * 11, 8.5, { bold: i === 0 }));
    const centerY = p.y - rowH / 2;
    p.checkbox(colsX[0] + colW / 2 - 4.5, centerY, item.result === 'pass', GREEN);
    p.checkbox(colsX[1] + colW / 2 - 4.5, centerY, item.result === 'fail', RED);
    p.checkbox(colsX[2] + colW / 2 - 4.5, centerY, item.result === 'na', GRAY);
    p.y -= rowH;
  }
  p.gap(10);
}

function statusSection(p: Painter, section: ReportData['sections'][0]) {
  const nameW = W * 0.3;
  const statusW = W * 0.34;
  const notesW = W - nameW - statusW;
  p.sectionBar(section.title, NAVY, [
    { label: 'STATUS', x: M + nameW + statusW / 2 - 16 },
    { label: 'NOTES/COMMENTS', x: M + nameW + statusW + notesW / 2 - 38 },
  ]);
  for (const item of section.items) {
    const nameLines = p.wrap(item.label, 8.5, nameW - 12, true);
    const descLines = item.description ? p.wrap(item.description, 7, nameW - 12) : [];
    const noteLines = item.note ? p.wrap(item.note, 7.5, notesW - 12) : [];
    const rowH = Math.max(24, nameLines.length * 10.5 + descLines.length * 9 + 8, noteLines.length * 9.5 + 8);
    p.ensure(rowH);
    p.cellBorder(M, p.y, nameW, rowH);
    p.cellBorder(M + nameW, p.y, statusW, rowH);
    p.cellBorder(M + nameW + statusW, p.y, notesW, rowH);
    let ty = p.y - 4;
    nameLines.forEach((l) => {
      p.text(l, M + 6, ty, 8.5, { bold: true });
      ty -= 10.5;
    });
    descLines.forEach((l) => {
      p.text(l, M + 6, ty, 7, { color: SOFT });
      ty -= 9;
    });
    // status options: three dots, selected one filled + bold label
    const centerY = p.y - rowH / 2;
    let ox = M + nameW + 10;
    for (const opt of STATUS_OPTS) {
      const selected = item.result === opt.result;
      p.dot(ox, centerY, opt.color, selected);
      p.text(opt.label, ox + 7, centerY + 4.2, 6.8, {
        bold: selected,
        color: selected ? opt.color : GRAY,
      });
      ox += 7 + p.font.widthOfTextAtSize(opt.label, 6.8) + 16;
    }
    noteLines.forEach((l, i) => p.text(l, M + nameW + statusW + 6, p.y - 5 - i * 9.5, 7.5));
    p.y -= rowH;
  }
  p.gap(10);
}

// Client-specified legend: X = Dent, /// = Scratch, O = Rust
const MARK_GLYPH = { dent: 'X', scratch: '///', rust: 'O' } as const;

function damageDiagramBlock(p: Painter, data: ReportData, diagram: PDFImage | null) {
  const imgW = W - 20;
  const imgH = imgW * (826 / 2114);
  const blockH = 16 + imgH + 26;
  if (p.y - (blockH + 26) < M + 30) p.addPage();
  p.sectionBar('Vehicle Damage Diagram');
  p.cellBorder(M, p.y, W, blockH);
  p.text('Mark damage using:   X = Dent      /// = Scratch      O = Rust', M + 10, p.y - 4, 8.5, {
    bold: true,
    color: NAVY_TEXT,
  });
  const imgX = M + 10;
  const imgTop = p.y - 16;
  if (diagram) {
    p.page.drawImage(diagram, { x: imgX, y: imgTop - imgH, width: imgW, height: imgH });
    // overlay the inspector's marks (normalized coords against the artwork)
    for (const mark of data.damageMarks) {
      const glyph = MARK_GLYPH[mark.t] ?? 'O';
      const size = 11;
      const gw = p.bold.widthOfTextAtSize(glyph, size);
      p.page.drawText(glyph, {
        x: imgX + mark.x * imgW - gw / 2,
        y: imgTop - mark.y * imgH - size / 2 + 1,
        size,
        font: p.bold,
        color: RED,
      });
    }
  }
  p.text(
    'Please inspect all areas including front bumper, rear bumper, hood, roof, trunk, doors, fenders, quarter panels, rocker panels, and undercarriage.',
    M + 10,
    imgTop - imgH - 6,
    6.8,
    { bold: true, color: NAVY_TEXT },
  );
  p.y -= blockH;
  p.gap(10);
}

function flagsSection(p: Painter, section: ReportData['sections'][0]) {
  const colW = 52;
  const colsX = [M + W * 0.52, M + W * 0.52 + colW];
  const notesX = colsX[1] + colW;
  p.sectionBar(section.title, RED_BAR, [
    { label: 'YES', x: colsX[0] + 18 },
    { label: 'NO', x: colsX[1] + 20 },
    { label: 'NOTES/COMMENTS', x: notesX + 30 },
  ]);
  for (const item of section.items) {
    const labelW = W * 0.52 - 12;
    const lines = p.wrap(item.label, 8.5, labelW, true);
    const noteLines = item.note ? p.wrap(item.note, 7.5, W - (notesX - M) - 12) : [];
    const rowH = Math.max(18, lines.length * 11 + 7, noteLines.length * 9.5 + 7);
    p.ensure(rowH);
    p.cellBorder(M, p.y, W * 0.52, rowH);
    p.cellBorder(colsX[0], p.y, colW, rowH);
    p.cellBorder(colsX[1], p.y, colW, rowH);
    p.cellBorder(notesX, p.y, M + W - notesX, rowH);
    lines.forEach((l, i) => p.text(l, M + 6, p.y - 4 - i * 11, 8.5, { bold: true }));
    const centerY = p.y - rowH / 2;
    // flags: result 'fail' = YES (flag present), 'pass' = NO
    p.checkbox(colsX[0] + colW / 2 - 4.5, centerY, item.result === 'fail', RED);
    p.checkbox(colsX[1] + colW / 2 - 4.5, centerY, item.result === 'pass', GREEN);
    noteLines.forEach((l, i) => p.text(l, notesX + 6, p.y - 5 - i * 9.5, 7.5));
    p.y -= rowH;
  }
  p.gap(10);
}

function obdBlock(p: Painter, d: ReportData) {
  p.ensure(64);
  p.sectionBar('OBD-II Readiness Monitors (Emissions System)');
  const rowH = 40;
  p.ensure(rowH);
  p.cellBorder(M, p.y, W, rowH);
  const cy1 = p.y - 12;
  p.checkbox(M + 8, cy1, d.obd.ready === true, GREEN);
  p.text('Ready — all monitors are ready', M + 22, cy1 + 4.5, 8);
  const cy2 = p.y - 28;
  p.checkbox(M + 8, cy2, d.obd.ready === false, AMBER);
  p.text('Not Ready — one or more monitors are not ready', M + 22, cy2 + 4.5, 8);
  const half = M + W / 2;
  p.text('CODES FOUND:', half, p.y - 5, 7.5, { bold: true, color: NAVY_TEXT });
  const codeLines = p.wrap(d.obd.codes || 'No codes found', 8, W / 2 - 14);
  codeLines.slice(0, 2).forEach((l, i) => p.text(l, half, p.y - 16 - i * 10, 8));
  p.y -= rowH;
  if (d.obd.notes) {
    const noteLines = p.wrap(`Additional notes: ${d.obd.notes}`, 7.5, W - 12);
    const h = noteLines.length * 9.5 + 7;
    p.ensure(h);
    p.cellBorder(M, p.y, W, h);
    noteLines.forEach((l, i) => p.text(l, M + 6, p.y - 4.5 - i * 9.5, 7.5, { color: SOFT }));
    p.y -= h;
  }
  p.gap(10);
}

function ratingBlock(p: Painter, d: ReportData) {
  p.ensure(58);
  p.sectionBar('Overall Condition Rating');
  const rowH = 42;
  p.cellBorder(M, p.y, W, rowH);
  p.text('Overall Score (1 Poor – 10 Excellent):', M + 8, p.y - 8, 8.5, { bold: true });
  // score box
  p.page.drawRectangle({ x: M + 8, y: p.y - rowH + 6, width: 62, height: 18, borderColor: LINE, borderWidth: 1 });
  p.text(`${d.score} / 10`, M + 22, p.y - rowH + 19.5, 10, { bold: true, color: NAVY_TEXT });
  // bands
  const bands = [
    { label: '9-10', sub: 'Excellent', color: GREEN, match: d.score >= 9 },
    { label: '7-8', sub: 'Good', color: BLUE, match: d.score >= 7 && d.score <= 8 },
    { label: '5-6', sub: 'Fair', color: AMBER, match: d.score >= 5 && d.score <= 6 },
    { label: '1-4', sub: 'Poor', color: RED, match: d.score <= 4 },
  ];
  let bx = M + W - 300;
  for (const band of bands) {
    p.dot(bx, p.y - 14, band.color, band.match);
    p.text(band.label, bx + 8, p.y - 8.5, 10, { bold: true, color: band.match ? band.color : GRAY });
    p.text(band.sub, bx + 8, p.y - 22, 6.5, { color: band.match ? band.color : GRAY });
    bx += 75;
  }
  p.y -= rowH;
  p.gap(8);

  // repair cost
  const h = 20;
  p.ensure(h);
  p.cellBorder(M, p.y, W, h);
  p.text('Total Estimated Repair Cost:', M + 8, p.y - 5, 8.5, { bold: true });
  p.text(d.estimatedRepairCost ? `$ ${d.estimatedRepairCost}` : '$ —', M + 160, p.y - 5, 9, { bold: true, color: NAVY_TEXT });
  p.y -= h;
  p.gap(10);
}

function recommendationBlock(p: Painter, d: ReportData) {
  p.ensure(70);
  p.sectionBar('Final Recommendation');
  const opts = [
    { key: 'buy', title: 'BUY', sub: 'The vehicle is in good condition and ready to purchase.', color: GREEN },
    { key: 'negotiate', title: 'NEGOTIATE', sub: 'The vehicle has issues that should be addressed.', color: AMBER },
    { key: 'walk_away', title: 'WALK AWAY', sub: 'The vehicle has major issues or too many red flags.', color: RED },
  ] as const;
  const boxW = (W - 16) / 3;
  const boxH = 44;
  p.ensure(boxH + 4);
  opts.forEach((opt, i) => {
    const x = M + i * (boxW + 8);
    const selected = d.recommendation === opt.key;
    p.page.drawRectangle({
      x,
      y: p.y - boxH,
      width: boxW,
      height: boxH,
      borderColor: selected ? opt.color : LINE,
      borderWidth: selected ? 2 : 0.8,
    });
    p.dot(x + 12, p.y - 12, opt.color, selected);
    p.text(opt.title, x + 22, p.y - 6.5, 10, { bold: true, color: selected ? opt.color : NAVY_TEXT });
    p.wrap(opt.sub, 6.8, boxW - 18).forEach((l, li) => p.text(l, x + 10, p.y - 22 - li * 8.5, 6.8, { color: SOFT }));
  });
  p.y -= boxH;
  p.gap(12);
}

async function signaturesBlock(p: Painter, d: ReportData, doc: PDFDocument) {
  p.ensure(140);
  p.sectionBar('Signature');
  const boxH = 118;
  p.cellBorder(M, p.y, W, boxH);
  p.text('Buyer Signature:', M + 8, p.y - 6, 9, { bold: true });
  if (d.signature) {
    try {
      const sig = await doc.embedPng(d.signature);
      const scale = Math.min((W - 240) / sig.width, 52 / sig.height);
      p.page.drawImage(sig, {
        x: M + 14,
        y: p.y - 78,
        width: sig.width * scale,
        height: sig.height * scale,
      });
    } catch {
      // unreadable signature image — leave the line blank
    }
  } else {
    p.page.drawLine({
      start: { x: M + 14, y: p.y - 70 },
      end: { x: M + W / 2, y: p.y - 70 },
      thickness: 0.7,
      color: TEXT,
    });
  }
  p.text(`Print Name:  ${d.buyerName}`, M + 8, p.y - 86, 9);
  p.text(`Date:  ${d.date}`, M + 8, p.y - 103, 9);
  p.y -= boxH;
  p.gap(10);
}

function disclaimerBlock(p: Painter) {
  const disclaimer =
    'DISCLAIMER: This inspection is a visual assessment only and does not guarantee the mechanical condition or future performance ' +
    'of the vehicle. The inspector is not responsible for hidden defects or issues that may arise after the inspection. We recommend ' +
    'a full mechanical inspection by a trusted certified mechanic for a comprehensive evaluation before purchase.';
  const lines = p.wrap(disclaimer, 7, W - 12);
  const h = lines.length * 9 + 10;
  p.ensure(h);
  p.page.drawRectangle({ x: M, y: p.y - h, width: W, height: h, borderColor: RED, borderWidth: 0.8 });
  lines.forEach((l, i) => p.text(l, M + 6, p.y - 5 - i * 9, 7, { color: RED }));
  p.y -= h;
}

export async function renderReport(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage | null = null;
  try {
    logo = await doc.embedPng(Uint8Array.from(atob(LOGO_B64), (c) => c.charCodeAt(0)));
  } catch {
    // logo failed to embed — header renders without it
  }
  let diagram: PDFImage | null = null;
  try {
    diagram = await doc.embedPng(Uint8Array.from(atob(DIAGRAM_B64), (c) => c.charCodeAt(0)));
  } catch {
    // diagram failed to embed — section renders without the artwork
  }

  const p = new Painter(doc, font, bold);

  // ===== body =====
  vehicleDetailsBlock(p, data);
  for (const section of data.sections) {
    if (section.kind === 'passfail') passFailSection(p, section);
    else if (section.kind === 'flags') {
      // sample order: damage diagram sits right before the red flags table
      damageDiagramBlock(p, data, diagram);
      flagsSection(p, section);
    } else statusSection(p, section);
    // OBD block right after the diagnostic-scan section
    if (section.title.toLowerCase().includes('diagnostic')) obdBlock(p, data);
  }
  ratingBlock(p, data);
  recommendationBlock(p, data);
  await signaturesBlock(p, data, doc);
  disclaimerBlock(p);

  // ===== photos (appended after the report pages) =====
  if (data.photos.length > 0) {
    p.addPage();
    p.sectionBar('Photo Documentation');
    const cell = (W - 16) / 2;
    let col = 0;
    for (let i = 0; i < data.photos.length; i++) {
      try {
        const img = await doc.embedJpg(data.photos[i]);
        const scale = Math.min(cell / img.width, (cell * 0.72) / img.height);
        if (col === 0) p.ensure(cell * 0.72 + 26);
        const x = M + col * (cell + 16);
        p.page.drawImage(img, { x, y: p.y - img.height * scale, width: img.width * scale, height: img.height * scale });
        p.text(`Photo ${i + 1}`, x, p.y - cell * 0.72 - 12, 7, { color: SOFT });
        col = (col + 1) % 2;
        if (col === 0) p.y -= cell * 0.72 + 24;
      } catch {
        // skip unembeddable photo
      }
    }
  }

  // ===== headers + footers on every page =====
  const total = p.pages.length;
  p.pages.forEach((page, i) => {
    const topY = A4[1] - 14;
    if (logo) {
      const scale = Math.min(62 / logo.width, 62 / logo.height);
      page.drawImage(logo, {
        x: M,
        y: topY - 62,
        width: logo.width * scale,
        height: logo.height * scale,
      });
    }
    const title = 'VEHICLE PRE - PURCHASE INSPECTION CHECKLIST';
    const titleSize = 14.5;
    const titleW = bold.widthOfTextAtSize(title, titleSize);
    page.drawText(title, { x: (A4[0] - titleW) / 2, y: topY - 17, size: titleSize, font: bold, color: NAVY_TEXT });
    const tagline = 'Professional Inspection. Informed Decision. Peace of Mind.';
    const tagW = bold.widthOfTextAtSize(tagline, 7.5);
    page.drawText(tagline, { x: (A4[0] - tagW) / 2, y: topY - 30, size: 7.5, font: bold, color: SOFT });
    // center in the space right of the logo so it never collides with it
    const contactLeft = M + 72;
    const contactW = font.widthOfTextAtSize(CONTACT_LINE, 8.5);
    page.drawText(CONTACT_LINE, {
      x: contactLeft + (A4[0] - M - contactLeft - contactW) / 2,
      y: topY - 44,
      size: 8.5,
      font,
      color: SOFT,
    });
    // page badge
    const badge = `PAGE ${i + 1} OF ${total}`;
    const badgeW = bold.widthOfTextAtSize(badge, 6.5) + 12;
    page.drawRectangle({ x: A4[0] - M - badgeW, y: topY - 18, width: badgeW, height: 13, color: NAVY });
    page.drawText(badge, { x: A4[0] - M - badgeW + 6, y: topY - 14.5, size: 6.5, font: bold, color: WHITE });
    // footer
    page.drawText(
      `${data.companyName}  ·  Rego ${data.vehicle.plate || '—'}  ·  generated ${data.date}`,
      { x: M, y: 18, size: 6.5, font, color: SOFT },
    );
  });

  return doc.save();
}
