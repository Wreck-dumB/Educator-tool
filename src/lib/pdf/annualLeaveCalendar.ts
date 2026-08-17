// Self-contained PDF writer for the annual leave calendar — no external library.
// Each page is drawn with absolute coordinates (not flowed HTML), which is what
// makes "exactly one page per month" reliable regardless of browser/printer —
// window.print() of flowed HTML could not guarantee this (validated in prototype).

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LEAVE_TYPE_CODE: Record<string, string> = {
  annual: "AL",
  sick: "SL",
  public_holiday: "PH",
  other: "O",
};

export interface LeaveEntry {
  initials: string;
  leaveType: string; // 'annual' | 'sick' | 'public_holiday' | 'other'
}

export interface LegendEntry {
  initials: string;
  name: string;
}

export interface BuildLeaveCalendarOptions {
  /** key = "YYYY-MM-DD". Omit for a blank writable template. */
  leaveByDate?: Map<string, LeaveEntry[]>;
  /** Shown on a dedicated page before January, only when leaveByDate is provided. */
  legend?: LegendEntry[];
}

function mmToPt(v: number): number {
  return (v * 72) / 25.4;
}

function pdfEscape(s: string): string {
  return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const AVG_WIDTH: Record<string, number> = { F1: 0.52, F2: 0.58, F3: 0.5 };
function textWidthMM(str: string, fontKey: string, sizePt: number): number {
  return (str.length * sizePt * AVG_WIDTH[fontKey]) / (72 / 25.4);
}

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PAD = 10;
const GAP = 3;
const HEAD_H = 18;
const WEEK_H = 7;
const NOTES_H = 33;
const FOOT_H = 5;

const INK: [number, number, number] = [0.106, 0.141, 0.125];
const INK_SOFT: [number, number, number] = [0.267, 0.302, 0.278];
const RULE: [number, number, number] = [0.847, 0.867, 0.843];
const RULE_STRONG: [number, number, number] = [0.714, 0.741, 0.714];
const ACCENT: [number, number, number] = [0.184, 0.435, 0.369];
const ACCENT_SOFT: [number, number, number] = [0.902, 0.937, 0.922];
const EMPTY_FILL: [number, number, number] = [0.933, 0.937, 0.929];

function makePageBuilder() {
  const ops: string[] = [];
  const fill = (c: readonly number[]) => ops.push(`${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} rg`);
  const stroke = (c: readonly number[]) => ops.push(`${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} RG`);
  const lineWidth = (wmm: number) => ops.push(`${mmToPt(wmm).toFixed(3)} w`);
  const rectMM = (xmm: number, ymm: number, wmm: number, hmm: number) => {
    const x = mmToPt(xmm);
    const y = mmToPt(PAGE_H_MM - ymm - hmm);
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${mmToPt(wmm).toFixed(2)} ${mmToPt(hmm).toFixed(2)} re`);
  };
  const fillRect = (xmm: number, ymm: number, wmm: number, hmm: number, c: readonly number[]) => {
    fill(c); rectMM(xmm, ymm, wmm, hmm); ops.push("f");
  };
  const strokeRect = (xmm: number, ymm: number, wmm: number, hmm: number, c: readonly number[], wl: number) => {
    stroke(c); lineWidth(wl); rectMM(xmm, ymm, wmm, hmm); ops.push("S");
  };
  const lineMM = (x1: number, y1: number, x2: number, y2: number, c: readonly number[], wl: number) => {
    stroke(c); lineWidth(wl);
    ops.push(`${mmToPt(x1).toFixed(2)} ${mmToPt(PAGE_H_MM - y1).toFixed(2)} m`);
    ops.push(`${mmToPt(x2).toFixed(2)} ${mmToPt(PAGE_H_MM - y2).toFixed(2)} l`);
    ops.push("S");
  };
  const text = (
    xmm: number, baselineYmm: number, fontKey: string, sizePt: number,
    str: string, c: readonly number[], align: "left" | "center" | "right" = "left",
  ) => {
    let x = xmm;
    if (align === "center") x = xmm - textWidthMM(str, fontKey, sizePt) / 2;
    if (align === "right") x = xmm - textWidthMM(str, fontKey, sizePt);
    fill(c);
    ops.push("BT");
    ops.push(`/${fontKey} ${sizePt} Tf`);
    ops.push(`${mmToPt(x).toFixed(2)} ${mmToPt(PAGE_H_MM - baselineYmm).toFixed(2)} Td`);
    ops.push(`(${pdfEscape(str)}) Tj`);
    ops.push("ET");
  };
  return { ops, fillRect, strokeRect, lineMM, text };
}

function monthPageOps(year: number, monthIndex: number, leaveByDate?: Map<string, LeaveEntry[]>): string {
  const b = makePageBuilder();
  const contentX = PAD;
  const contentW = PAGE_W_MM - PAD * 2;
  const headY = PAD;
  const weekY = headY + HEAD_H + GAP;
  const gridY = weekY + WEEK_H + GAP;
  const notesY = PAGE_H_MM - PAD - FOOT_H - GAP - NOTES_H;
  const gridH = notesY - GAP - gridY;
  const footY = PAGE_H_MM - PAD - FOOT_H;

  b.text(contentX, headY + 4, "F2", 8, `ANNUAL LEAVE - ${year}`, ACCENT, "left");
  b.text(contentX, headY + 15, "F3", 28, MONTHS[monthIndex], INK, "left");
  b.lineMM(contentX, headY + 17.3, contentX + 42, headY + 17.3, ACCENT, 0.7);

  const colW = contentW / 7;
  WEEKDAYS.forEach((d, i) => {
    const cx = contentX + i * colW;
    b.fillRect(cx, weekY, colW, WEEK_H, ACCENT_SOFT);
    b.strokeRect(cx, weekY, colW, WEEK_H, RULE_STRONG, 0.25);
    b.text(cx + colW / 2, weekY + WEEK_H / 2 + 1.4, "F2", 8, d.toUpperCase(), ACCENT, "center");
  });

  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const weeks = Math.ceil((startOffset + daysInMonth) / 7);
  const rowH = gridH / weeks;

  for (let i = 0; i < weeks * 7; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
    const row = Math.floor(i / 7);
    const col = i % 7;
    const cx = contentX + col * colW;
    const cy = gridY + row * rowH;
    const isWeekend = col === 5 || col === 6;
    if (!inMonth) b.fillRect(cx, cy, colW, rowH, EMPTY_FILL);
    else if (isWeekend) b.fillRect(cx, cy, colW, rowH, ACCENT_SOFT);
    b.strokeRect(cx, cy, colW, rowH, RULE, 0.2);
    if (inMonth) {
      b.text(cx + 1.8, cy + 4.2, "F2", 8, String(dayNum), INK, "left");
      if (leaveByDate) {
        const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        const entries = leaveByDate.get(dateKey) ?? [];
        const maxLines = Math.max(0, Math.floor((rowH - 6) / 3.3));
        const shown = entries.slice(0, maxLines);
        shown.forEach((e, li) => {
          const code = LEAVE_TYPE_CODE[e.leaveType] ?? "O";
          b.text(cx + 1.8, cy + 7.8 + li * 3.3, "F1", 6.5, `${e.initials} ${code}`, INK_SOFT, "left");
        });
        if (entries.length > shown.length) {
          b.text(cx + 1.8, cy + 7.8 + shown.length * 3.3, "F1", 6.5, `+${entries.length - shown.length} more`, INK_SOFT, "left");
        }
      }
    }
  }
  b.strokeRect(contentX, gridY, contentW, gridH, RULE_STRONG, 0.3);

  b.strokeRect(contentX, notesY, contentW, NOTES_H, RULE_STRONG, 0.25);
  b.text(contentX + 4, notesY + 5.2, "F2", 7.5, `NOTES - STAFFING / COVERAGE FOR ${MONTHS[monthIndex].toUpperCase()}`, INK_SOFT, "left");
  for (let ly = notesY + 9.5; ly < notesY + NOTES_H - 2; ly += 6.4) {
    b.lineMM(contentX + 3, ly, contentX + contentW - 3, ly, RULE, 0.15);
  }

  b.text(contentX, footY + 3.5, "F1", 6.5, "DR. SparkPlay Rostering", INK_SOFT, "left");
  b.text(contentX + contentW, footY + 3.5, "F1", 6.5, `${MONTHS[monthIndex]} ${year}`, INK_SOFT, "right");

  return b.ops.join("\n");
}

function legendPageOps(year: number, legend: LegendEntry[]): string {
  const b = makePageBuilder();
  const contentX = PAD;
  const contentW = PAGE_W_MM - PAD * 2;

  b.text(contentX, PAD + 4, "F2", 8, `ANNUAL LEAVE - ${year}`, ACCENT, "left");
  b.text(contentX, PAD + 15, "F3", 24, "Who's who", INK, "left");
  b.lineMM(contentX, PAD + 17.3, contentX + 42, PAD + 17.3, ACCENT, 0.7);
  b.text(contentX, PAD + 26, "F1", 9, "Initials used on the calendar pages, and leave-type codes.", INK_SOFT, "left");

  let y = PAD + 38;
  b.text(contentX, y, "F2", 8, "INITIALS", INK_SOFT, "left");
  b.text(contentX + 30, y, "F2", 8, "NAME", INK_SOFT, "left");
  y += 3;
  b.lineMM(contentX, y, contentX + contentW, y, RULE_STRONG, 0.25);
  y += 7;
  for (const entry of legend) {
    b.text(contentX, y, "F2", 9, entry.initials, INK, "left");
    b.text(contentX + 30, y, "F1", 9, entry.name, INK, "left");
    b.lineMM(contentX, y + 3, contentX + contentW, y + 3, RULE, 0.15);
    y += 8;
  }

  y += 6;
  b.text(contentX, y, "F2", 8, "LEAVE CODES", INK_SOFT, "left");
  y += 7;
  const codes: [string, string][] = [["AL", "Annual leave"], ["SL", "Sick leave"], ["PH", "Public holiday"], ["O", "Other"]];
  for (const [code, label] of codes) {
    b.text(contentX, y, "F2", 9, code, INK, "left");
    b.text(contentX + 14, y, "F1", 9, label, INK_SOFT, "left");
    y += 6;
  }

  return b.ops.join("\n");
}

export function buildAnnualLeaveCalendarPdf(year: number, options: BuildLeaveCalendarOptions = {}): Uint8Array {
  const { leaveByDate, legend } = options;
  const PAGE_W = mmToPt(PAGE_W_MM);
  const PAGE_H = mmToPt(PAGE_H_MM);

  const objs: string[] = [];
  const addObj = (body: string): number => { objs.push(body); return objs.length; };

  const fontHelv = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontHelvB = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const fontTimesB = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");

  const pagesNum = addObj("");
  const pageObjNums: number[] = [];

  const addPage = (stream: string) => {
    const contentNum = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageNum = addObj(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] ` +
      `/Resources << /Font << /F1 ${fontHelv} 0 R /F2 ${fontHelvB} 0 R /F3 ${fontTimesB} 0 R >> >> ` +
      `/Contents ${contentNum} 0 R >>`,
    );
    pageObjNums.push(pageNum);
  };

  if (legend && legend.length > 0) addPage(legendPageOps(year, legend));
  for (let m = 0; m < 12; m++) addPage(monthPageOps(year, m, leaveByDate));

  objs[pagesNum - 1] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => n + " 0 R").join(" ")}] /Count ${pageObjNums.length} >>`;
  const catalogNum = addObj(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>`);

  let out = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefStart = out.length;
  out += `xref\n0 ${objs.length + 1}\n`;
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i);
  return bytes;
}
