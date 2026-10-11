import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/AuthCard";
import { AppNavigation, type AppSection } from "@/components/AppNavigation";
import { Dashboard } from "@/components/Dashboard";
import { HomePage } from "@/components/HomePage";
import { RecipesPage } from "@/components/RecipesPage";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sistema de Controle de Produção" },
      {
        name: "description",
        content:
          "Controle seu estoque: cadastre produtos em UN, GR ou ML, registre entradas e saídas e consulte o histórico.",
      },
      { property: "og:title", content: "Sistema de Controle de Produção" },
      {
        property: "og:description",
        content: "Controle de estoque simples, no celular ou no computador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<AppSection>("home");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") qc.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  if (session === undefined) return <div className="min-h-screen" />;
  if (!session) return <AuthCard />;
  return (
    <div className="min-h-screen md:pl-64">
      <AppNavigation activeSection={activeSection} onNavigate={setActiveSection} />
      {activeSection === "home" ? (
        <HomePage
          email={session.user.email ?? ""}
          userId={session.user.id}
          onNavigate={setActiveSection}
        />
      ) : activeSection === "estoque" ? (
        <Dashboard email={session.user.email ?? ""} userId={session.user.id} />
      ) : (
        <RecipesPage email={session.user.email ?? ""} userId={session.user.id} />
      )}
    </div>
  );
}
