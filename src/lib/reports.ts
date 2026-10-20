export type Report = { title: string; filename: string; columns: string[]; rows: (string | number)[][] };
export type ReportFormat = "pdf" | "xlsx" | "csv";

export function csvCell(value: string | number) {
  const text = String(value);
  const safe = typeof value === "string" && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function reportCsv(report: Report) {
  return "\uFEFF" + [report.columns, ...report.rows].map(row => row.map(csvCell).join(",")).join("\r\n");
}

export async function createReportFiles(report: Report): Promise<Record<ReportFormat, Blob>> {
  const [{ PDFDocument }, fontkit, excel, fontResponse] = await Promise.all([
    import("pdf-lib"), import("@pdf-lib/fontkit"), import("exceljs"), fetch("/fonts/report-sans.ttf"),
  ]);
  if (!fontResponse.ok) throw new Error("No se pudo cargar la fuente del reporte.");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit.default);
  const font = await pdf.embedFont(await fontResponse.arrayBuffer(), { subset: true });
  pdf.setTitle(`${report.title} — GuateZapatos`);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  let pageNumber = 1;
  const heading = () => {
    page.drawText("GUATEZAPATOS", { x: 36, y, size: 18, font });
    y -= 28;
    page.drawText(`${report.title} · Página ${pageNumber}`, { x: 36, y, size: 12, font });
    y -= 22;
    page.drawText(`${report.rows.length} registros · ${new Date().toLocaleString("es-GT")}`, { x: 36, y, size: 9, font });
    y -= 30;
  };
  heading();
  const line = (text: string) => {
    if (y < 48) { page = pdf.addPage([595.28, 841.89]); y = 790; pageNumber++; heading(); }
    page.drawText(text, { x: 36, y, size: 9, font }); y -= 15;
  };
  const wrapped = (text: string) => {
    let part = "";
    for (const word of text.replace(/[\r\n\t]/g, " ").split(" ")) {
      const candidate = part ? `${part} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 9) <= 520) { part = candidate; continue; }
      if (part) line(part);
      part = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(part + char, 9) > 520) { line(part); part = ""; }
        part += char;
      }
    }
    if (part) line(part);
  };
  if (!report.rows.length) line("Sin registros.");
  report.rows.forEach((row, index) => {
    if (y < 130) { page = pdf.addPage([595.28, 841.89]); y = 790; pageNumber++; heading(); }
    line(`Registro ${index + 1}`);
    report.columns.forEach((column, i) => wrapped(`${column}: ${row[i] ?? ""}`));
    y -= 14;
  });
  const ExcelJS = excel.default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GuateZapatos";
  const sheet = workbook.addWorksheet(report.title);
  sheet.columns = report.columns.map((header, i) => ({ header, key: String(i), width: i === 0 ? 40 : 26 }));
  report.rows.forEach(row => sheet.addRow(row));
  sheet.eachRow(row => { row.font = { name: "Arial", size: 11 }; row.alignment = { vertical: "top", wrapText: true }; });
  sheet.getRow(1).font = { name: "Arial", size: 11, bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: report.columns.length } };
  return {
    pdf: new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" }),
    xlsx: new Blob([new Uint8Array(await workbook.xlsx.writeBuffer())], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    csv: new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" }),
  };
}

export async function deliverReport(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if ((error as DOMException).name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}