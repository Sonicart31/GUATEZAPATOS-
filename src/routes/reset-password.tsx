import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { accessError, sendRecovery, verifyRecovery } from "@/lib/access";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Recuperar contraseña — GuateZapatos" },
    { name: "description", content: "Recupera de forma segura el acceso a tu cuenta de GuateZapatos." },
    { property: "og:title", content: "Recuperar contraseña — GuateZapatos" },
    { property: "og:description", content: "Restablece tu contraseña con la verificación de tu correo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [step, setStep] = useState<"email" | "pin" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const recoveryLink = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    const validateRecoverySession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (active && !error && data.user) {
        setStep("password");
        window.history.replaceState(null, "", window.location.pathname);
      }
    };
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || (event === "INITIAL_SESSION" && recoveryLink))) {
        setTimeout(() => { if (active) void validateRecoverySession(); }, 0);
      }
    });
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has("error")) {
      setErrorMessage("El enlace de recuperación venció o no es válido. Solicita otro.");
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setErrorMessage(""); setNotice("");
    if (step === "password" && password !== confirmation) { setErrorMessage("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      if (step === "email") {
        await sendRecovery(email, window.location.origin);
        setStep("pin");
        setNotice("Si existe una cuenta con ese correo, recibirás un correo de recuperación. Revisa también spam.");
      } else if (step === "pin") {
        await verifyRecovery(email, pin);
        setStep("password"); setPin("");
      } else if (step === "password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        setPassword(""); setConfirmation(""); setStep("done");
      }
    } catch (error) {
      setErrorMessage(accessError(error as { code?: string; message: string }));
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setErrorMessage(""); setNotice("");
    try {
      await sendRecovery(email, window.location.origin);
      setNotice("Solicitud enviada. Revisa tu correo y spam.");
    } catch (error) { setErrorMessage(accessError(error as { code?: string; message: string })); }
    finally { setBusy(false); }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-3xl">{step === "password" ? "Nueva contraseña" : step === "done" ? "Contraseña actualizada" : "Recuperar contraseña"}</h1>
      <p className="mb-6 mt-2 text-muted-foreground">{step === "email" ? "Ingresa el correo de tu cuenta." : step === "pin" ? "Ingresa el PIN recibido por correo. Si recibiste un enlace, ábrelo para cambiar tu contraseña." : step === "password" ? "Elige y confirma tu nueva contraseña." : "Ya puedes ingresar con tu nueva contraseña."}</p>
      {step !== "done" && <form onSubmit={submit} className="panel space-y-4 p-5">
        {step === "email" && <input className="input" type="email" aria-label="Correo electrónico" placeholder="Correo electrónico" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        {step === "pin" && <input className="input" aria-label="PIN de recuperación" placeholder="PIN de recuperación" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,8}" minLength={4} maxLength={8} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />}
        {step === "password" && <>
          <input className="input" type="password" aria-label="Nueva contraseña" placeholder="Nueva contraseña (mín. 6)" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input" type="password" aria-label="Confirmar nueva contraseña" placeholder="Confirmar nueva contraseña" autoComplete="new-password" minLength={6} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        </>}
        {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "Un momento…" : step === "email" ? "Enviar correo de recuperación" : step === "pin" ? "Verificar PIN" : "Guardar contraseña"}</Button>
        {step === "pin" && <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="link" disabled={busy} onClick={resend}>Reenviar correo</Button>
          <Button type="button" variant="link" disabled={busy} onClick={() => { setStep("email"); setPin(""); setErrorMessage(""); setNotice(""); }}>Cambiar correo</Button>
        </div>}
      </form>}
      <Button asChild variant="link" className="mt-4"><Link to="/auth">Volver a ingresar</Link></Button>
    </main>
  );
}