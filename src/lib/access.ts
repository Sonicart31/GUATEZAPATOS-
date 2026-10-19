import { supabase } from "@/integrations/supabase/client";

export function emailsMatch(email: string, confirmation: string) {
  return email.trim().toLowerCase() === confirmation.trim().toLowerCase();
}

export function accessError(error: { code?: string; message: string }) {
  if (error.code === "email_not_confirmed") return "Confirma tu correo antes de ingresar. Puedes reenviar la confirmación.";
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return "Se alcanzó el límite de envíos. Espera un momento antes de volver a intentarlo.";
  if (error.code === "signup_disabled") return "El registro está desactivado. Contacta al encargado de la tienda.";
  if (error.code === "otp_expired") return "El código venció o no es válido. Solicita uno nuevo.";
  if (error.code === "invalid_credentials") return "Correo o contraseña incorrectos.";
  if (error.code === "user_already_exists") return "Ya existe una cuenta con este correo. Ingresa o recupera tu contraseña.";
  if (error.code === "weak_password") return "Elige una contraseña más segura.";
  return "No se pudo completar la solicitud. Intenta de nuevo.";
}

export async function sendRecovery(email: string, origin: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/reset-password` });
  if (error) throw error;
}

export async function verifyRecovery(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "recovery" });
  if (error) throw error;
  if (!data.session) throw new Error("No recovery session");
}