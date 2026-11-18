import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { accessError, emailsMatch, postAuthPath } from "@/lib/access";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar o registrarse — GuateZapatos" },
      { name: "description", content: "Crea tu cuenta en GuateZapatos para comprar tus tenis favoritos." },
      { property: "og:title", content: "Ingresar — GuateZapatos" },
      { property: "og:description", content: "Crea tu cuenta o inicia sesión en GuateZapatos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "confirm">("login");
  const [email, setEmail] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: postAuthPath(role), replace: true });
  }, [loading, navigate, role, user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMessage("");
    setNotice("");
    if (mode === "signup" && !emailsMatch(email, emailConfirmation)) { setErrorMessage("Los correos no coinciden."); return; }
    if (mode === "signup" && password !== passwordConfirmation) { setErrorMessage("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      if (mode === "confirm") {
        const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setNotice("Confirmación enviada. Revisa tu bandeja de entrada y spam.");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          if (error.code === "email_not_confirmed") setMode("confirm");
          throw error;
        }
        toast.success("¡Bienvenido!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName.trim(), phone } },
        });
        if (error) throw error;
        setPassword(""); setPasswordConfirmation("");
        if (!data.session) setMode("confirm");
      }
    } catch (error) {
      setErrorMessage(accessError(error as { code?: string; message: string }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-3xl sm:text-4xl">{mode === "login" ? "Ingresar" : mode === "signup" ? "Crear cuenta" : "Confirma tu correo"}</h1>
      <p className="mb-6 mt-2 text-muted-foreground">
        {mode === "login" ? "Accede para comprar y ver tus pedidos." : mode === "signup" ? "Regístrate gratis y empieza a comprar." : "Abre el enlace de confirmación enviado a tu correo. Revisa también spam. Si ya tienes una cuenta, ingresa o recupera tu contraseña."}
      </p>
      <form onSubmit={submit} className="panel space-y-3 p-5">
        {mode === "signup" && (
          <>
            <input className="input" aria-label="Nombre completo" placeholder="Nombre completo" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input className="input" aria-label="Teléfono" type="tel" placeholder="Teléfono" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </>
        )}
        <input className="input" type="email" aria-label="Correo electrónico" autoComplete="email" placeholder="Correo electrónico" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode === "signup" && <input className="input" type="email" aria-label="Confirmar correo electrónico" autoComplete="off" placeholder="Confirmar correo electrónico" required value={emailConfirmation} onChange={(e) => setEmailConfirmation(e.target.value)} />}
        {mode !== "confirm" && <input className="input" type="password" aria-label="Contraseña" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Contraseña (mín. 6)" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />}
        {mode === "signup" && <input className="input" type="password" aria-label="Confirmar contraseña" autoComplete="new-password" placeholder="Confirmar contraseña" minLength={6} required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />}
        {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
        <Button className="w-full" disabled={busy}>{busy ? "Un momento…" : mode === "login" ? "Ingresar" : mode === "signup" ? "Registrarme" : "Reenviar confirmación"}</Button>
      </form>
      <Button variant="link" className="mt-4 whitespace-normal" disabled={busy} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrorMessage(""); setNotice(""); }}>
        {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Ingresa"}
      </Button>
      <Button variant="link" disabled={busy} onClick={() => navigate({ to: "/reset-password" })}>¿Olvidaste tu contraseña?</Button>
    </main>
  );
}
