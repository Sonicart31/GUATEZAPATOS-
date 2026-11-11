import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShieldAlert, RefreshCw, LockKeyhole, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/riesgos")({ head: () => ({ meta: [
  { title: "Riesgos de seguridad — GuateZapatos" }, { name: "description", content: "Seguimiento de riesgos y eventos de seguridad de GuateZapatos." },
  { property: "og:title", content: "Riesgos de seguridad — GuateZapatos" }, { property: "og:description", content: "Control de intentos fallidos y bloqueos de PIN." },
  { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
] }), component: RisksPage });

const labels: Record<string, string> = { pin_failed: "PIN incorrecto", pin_locked: "PIN bloqueado", pin_changed: "PIN guardado", purchase_confirmed: "Compra confirmada", order_cancelled: "Pedido cancelado" };
function RisksPage() {
  const { user, role, loading } = useAuth();
  const [severity, setSeverity] = useState("todos");
  const overview = useQuery({ queryKey: ["security-overview", user?.id], enabled: !!user && role === "vendedor", refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.rpc("security_overview"); if (error) throw error;
    return data as { checked_at: string; configured_pins: number; locked_pins: number; failed_24h: number };
  } });
  const events = useQuery({ queryKey: ["security-events", user?.id], enabled: !!user && role === "vendedor", refetchInterval: 30000, queryFn: async () => {
    const { data, error } = await supabase.from("security_events").select("id,event_type,severity,created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error; return data;
  } });
  if (loading) return null;
  if (!user || role !== "vendedor") return <main className="mx-auto max-w-md px-4 py-16"><h1 className="text-3xl">Riesgos de seguridad</h1><p className="my-4">Acceso exclusivo del vendedor.</p><Button asChild><Link to={user ? "/" : "/auth"}>{user ? "Volver a la tienda" : "Ingresar"}</Link></Button></main>;
  const data = overview.data;
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="size-4" />CONTROL DE SEGURIDAD</p><h1 className="text-3xl sm:text-4xl">Riesgos de seguridad</h1></div><Button variant="outline" disabled={overview.isFetching || events.isFetching} onClick={() => { overview.refetch(); events.refetch(); }}><RefreshCw />Actualizar</Button></div>
    <p className="mb-6 text-sm text-muted-foreground">Actualización cada 30 segundos · {data ? `Última consulta: ${new Date(data.checked_at).toLocaleString("es-GT")}` : "Esperando datos"}</p>
    {(overview.isError || events.isError) && <p role="alert" className="mb-4 text-destructive">No se pudo actualizar la seguridad. Los datos anteriores pueden estar desactualizados.</p>}
    {overview.isPending ? <p>Cargando…</p> : data && <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {[{ label: "PIN activos", value: data.configured_pins, icon: LockKeyhole }, { label: "PIN bloqueados ahora", value: data.locked_pins, icon: ShieldAlert }, { label: "Intentos incorrectos · 24 h", value: data.failed_24h, icon: Activity }].map(item => <article key={item.label} className="rounded-md border border-border bg-card p-5"><item.icon className="mb-3 size-5 text-primary" /><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-1 font-display text-3xl">{item.value}</p></article>)}
    </div>}
    <section className="mb-8 border-y border-border py-6"><h2 className="mb-4 text-xl">Riesgos observados</h2><div className="grid gap-6 md:grid-cols-2"><div><p className={data?.locked_pins ? "font-semibold text-destructive" : "font-semibold"}>Intentos repetidos de PIN · {data?.locked_pins ? "Alto" : data?.failed_24h ? "Medio" : "Sin señales registradas"}</p><p className="mt-2 text-sm text-muted-foreground">Bloqueo automático después de 5 errores. Revisa los eventos con el titular de la cuenta.</p></div><div><p className="font-semibold">Cobertura del seguimiento</p><p className="mt-2 text-sm text-muted-foreground">Compras, cancelaciones, cambios y errores de PIN. Accesos de inicio de sesión, ataques externos y vulnerabilidades no evaluados en esta pantalla.</p></div></div></section>
    <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl">Últimos eventos</h2><select className="input w-auto" aria-label="Filtrar nivel de riesgo" value={severity} onChange={e => setSeverity(e.target.value)}><option value="todos">Todos los niveles</option><option value="alto">Alto</option><option value="medio">Medio</option><option value="bajo">Bajo</option></select></div>
      {events.isPending ? <p>Cargando eventos…</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-secondary"><tr><th className="p-3">Fecha</th><th className="p-3">Evento</th><th className="p-3">Nivel</th><th className="p-3">Referencia</th></tr></thead><tbody>{(events.data ?? []).filter(e => severity === "todos" || e.severity === severity).map(e => <tr key={e.id} className="border-b border-border"><td className="whitespace-nowrap p-3">{new Date(e.created_at).toLocaleString("es-GT")}</td><td className="p-3">{labels[e.event_type] ?? "Evento de seguridad"}</td><td className={`p-3 capitalize ${e.severity === "alto" ? "text-destructive" : "text-muted-foreground"}`}>{e.severity}</td><td className="p-3 font-mono">{e.id.slice(0,8)}</td></tr>)}</tbody></table>{!(events.data ?? []).some(e => severity === "todos" || e.severity === severity) && <p className="py-6 text-muted-foreground">No hay eventos registrados en este nivel.</p>}</div>}
    </section>
  </main>;
}