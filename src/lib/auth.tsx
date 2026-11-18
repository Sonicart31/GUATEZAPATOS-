import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import type { AppRole } from "@/lib/permissions";
import { watchInactivity } from "@/lib/inactivity";

type AuthCtx = { user: User | null; role: AppRole; loading: boolean; signOut: () => Promise<void> };

const Ctx = createContext<AuthCtx>({ user: null, role: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    return watchInactivity(() => {
      void (async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          toast.info("Sesión cerrada por 30 segundos de inactividad");
          navigate({ to: "/auth", replace: true });
        } catch {
          toast.error("No se pudo cerrar la sesión automáticamente");
        }
      })();
    });
  }, [navigate, user]);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (u) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
        const roles = (data ?? []).map((r) => r.role);
        setRole(roles.includes("administrador") ? "administrador" : roles.includes("vendedor") ? "vendedor" : roles.includes("analista") ? "analista" : "cliente");
      } else setRole(null);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session?.user ?? null), 0);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ user, role, loading, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
