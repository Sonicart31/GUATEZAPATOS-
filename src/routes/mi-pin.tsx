import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pinSetupSchema, requirePinResult } from "@/lib/pin";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/mi-pin")({
  head: () => ({ meta: [
    { title: "Mi PIN personal — GuateZapatos" },
    { name: "description", content: "Protege tus compras y cancelaciones con tu PIN personal en GuateZapatos." },
    { property: "og:title", content: "Mi PIN personal — GuateZapatos" },
    { property: "og:description", content: "Protección de compras y cancelaciones." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }), component: PinPage,
});

function PinPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [current, setCurrent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const status = useQuery({ queryKey: ["pin-status", user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.rpc("transaction_pin_status");
    if (error) throw error;
    return data as { configured: boolean };
  } });
  const configured = status.data?.configured === true;
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setSuccess(false); setMessage("");
    const validated = pinSetupSchema.safeParse({ pin, confirmation });
    if (!validated.success) { setMessage(validated.error.issues[0]?.message ?? "Revisa tu PIN."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("set_transaction_pin", { _pin: pin, _current_pin: current });
      if (error) throw error;
      requirePinResult(data);
      setPin(""); setConfirmation(""); setCurrent(""); setSuccess(true); setMessage("Tu PIN personal está activo.");
      await qc.invalidateQueries({ queryKey: ["pin-status"] });
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el PIN."); }
    finally { setBusy(false); }
  }
  if (loading) return null;
  if (!user) return <main className="mx-auto max-w-md px-4 py-16"><h1 className="text-3xl">Mi PIN personal</h1><p className="my-4">Ingresa para proteger tus compras.</p><Button asChild><Link to="/auth">Ingresar</Link></Button></main>;
  return <main className="mx-auto max-w-md px-4 py-12">
    <KeyRound className="mb-4 size-8 text-primary" />
    <h1 className="text-3xl">Mi PIN personal</h1>
    <p className="my-4 text-muted-foreground">Confirmación de compras y cancelaciones · 6 dígitos</p>
    {status.isPending ? <p>Cargando…</p> : status.isError ? <div role="alert"><p>No se pudo consultar tu PIN.</p><Button variant="outline" onClick={() => status.refetch()}>Reintentar</Button></div> : <form onSubmit={save} className="space-y-4">
      <p className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-success" />{configured ? "PIN activo" : "PIN pendiente de crear"}</p>
      {configured && <label className="block text-sm">PIN actual<input className="input mt-1" aria-label="PIN actual" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="off" value={current} onChange={e => setCurrent(e.target.value)} /></label>}
      <label className="block text-sm">{configured ? "Nuevo PIN" : "Crear PIN"}<input className="input mt-1" aria-label="Crear PIN" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="off" value={pin} onChange={e => setPin(e.target.value)} /></label>
      <label className="block text-sm">Confirmar PIN<input className="input mt-1" aria-label="Confirmar PIN" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      {message && <p role={success ? "status" : "alert"} className={success ? "text-success" : "text-destructive"}>{message}</p>}
      <Button className="w-full" disabled={busy}>{busy ? "Guardando…" : configured ? "Cambiar PIN" : "Guardar PIN"}</Button>
      <p className="text-sm text-muted-foreground">5 intentos incorrectos bloquean el PIN durante 15 minutos. No compartas tu PIN.</p>
    </form>}
  </main>;
}