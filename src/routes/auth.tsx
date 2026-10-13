import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar o registrarse — GuateZapatos" },
      { name: "description", content: "Crea tu cuenta en GuateZapatos para comprar tus tenis favoritos." },
      { property: "og:title", content: "Ingresar — GuateZapatos" },
      { property: "og:description", content: "Crea tu cuenta o inicia sesión en GuateZapatos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return toast.error("Correo o contraseña incorrectos");
      toast.success("¡Bienvenido!");
      navigate({ to: "/" });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: fullName, phone } },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      if (data.session) navigate({ to: "/" });
      else toast.success("Revisa tu correo para confirmar tu cuenta.");
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-4xl">{mode === "login" ? "Ingresar" : "Crear cuenta"}</h1>
      <p className="mb-6 mt-2 text-muted-foreground">
        {mode === "login" ? "Accede para comprar y ver tus pedidos." : "Regístrate gratis y empieza a comprar."}
      </p>
      <form onSubmit={submit} className="panel space-y-3 p-5">
        {mode === "signup" && (
          <>
            <input className="input" placeholder="Nombre completo" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <input className="input" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </>
        )}
        <input className="input" type="email" placeholder="Correo electrónico" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Contraseña (mín. 6)" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Un momento…" : mode === "login" ? "Ingresar" : "Registrarme"}</button>
      </form>
      <button className="mt-4 text-sm font-semibold text-primary" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Ingresa"}
      </button>
    </main>
  );
}
