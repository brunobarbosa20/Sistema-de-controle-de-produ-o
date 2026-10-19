import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes } from "lucide-react";

<<<<<<< HEAD
function getAuthRedirectUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

=======
>>>>>>> 2a4d539 (primeiro git)
export function AuthCard() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
<<<<<<< HEAD
            options: { emailRedirectTo: getAuthRedirectUrl() },
=======
            options: { emailRedirectTo: window.location.origin },
>>>>>>> 2a4d539 (primeiro git)
          });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "up" && !data.session)
      toast.success("Confira seu e-mail para confirmar o cadastro.");
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
<<<<<<< HEAD
      options: { redirectTo: getAuthRedirectUrl() },
=======
      options: { redirectTo: window.location.origin },
>>>>>>> 2a4d539 (primeiro git)
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Sistema de Controle de Produção</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "in" ? "Entre na sua conta" : "Crie sua conta"}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Senha</Label>
            <Input
              id="pw"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "in" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google}>
          Continuar com Google
        </Button>
        <button
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
