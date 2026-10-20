import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createReportFiles, deliverReport, type Report, type ReportFormat } from "@/lib/reports";
import { toast } from "sonner";

export function ReportDownloads({ report, loading, error }: { report: Report; loading: boolean; error: boolean }) {
  const [files, setFiles] = useState<{ report: Report; blobs: Record<ReportFormat, Blob> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    if (!loading && !error) createReportFiles(report).then(blobs => {
      if (active) setFiles({ report, blobs });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [report, loading, error, retry]);
  const ready = files?.report === report && !loading && !error && !failed;
  return <div className="flex flex-wrap items-center justify-end gap-2" aria-label={`Descargar reporte de ${report.title.toLowerCase()}`}>
    {(["pdf", "xlsx", "csv"] as const).map(format => <Button key={format} variant="outline" disabled={!ready} title={`Descargar ${report.title} en ${format.toUpperCase()}`} onClick={() => {
      if (!ready || !files) return;
      void deliverReport(files.blobs[format], `${report.filename}.${format}`).catch(() => toast.error("No se pudo descargar el reporte."));
    }}><Download />{format === "xlsx" ? "Excel (XLSX)" : format.toUpperCase()}</Button>)}
    {!ready && !failed && !error && <span className="flex items-center gap-1 text-sm text-muted-foreground" role="status"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />Preparando reportes…</span>}
    {(failed || error) && <span className="text-sm text-destructive" role="alert">No se pudieron preparar los reportes.</span>}
    {failed && <Button variant="ghost" onClick={() => setRetry(value => value + 1)}>Reintentar</Button>}
  </div>;
}