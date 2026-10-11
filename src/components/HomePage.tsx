import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ChefHat,
  Check,
  ClipboardList,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildInventoryActivities } from "@/lib/activities";
import type { MovementActivityRecord, ProductActivityRecord } from "@/lib/activities";
import { formatQty } from "@/lib/stock";
import type { AppSection } from "@/components/AppNavigation";

type RecentRecipe = {
  id: string;
  name: string;
  portions: number;
  created_by_email: string;
  created_at: string;
};

type PendingProduct = {
  id: string;
  code: string;
  name: string;
  unit: string;
  created_at: string;
  created_by_email: string;
};

function useRecentActivities() {
  return useQuery({
    queryKey: ["home-recent-activities"],
    queryFn: async () => {
      const [productsResult, movementsResult] = await Promise.all([
        supabase
          .from("products")
          .select("id,code,name,unit,created_at,created_by_email")
          .eq("pending_registration", false)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("movements")
          .select("id,type,quantity,note,created_at,created_by_email,products(code,name,unit)")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (movementsResult.error) throw movementsResult.error;

      return buildInventoryActivities(
        productsResult.data as ProductActivityRecord[],
        movementsResult.data as unknown as MovementActivityRecord[],
      );
    },
  });
}

function usePendingProducts() {
  return useQuery({
    queryKey: ["pending-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,code,name,unit,created_at,created_by_email")
        .eq("pending_registration", true)
        .eq("cancelled", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PendingProduct[];
    },
  });
}

function useHomeInventoryRole(userId: string) {
  return useQuery({
    queryKey: ["inventory-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_members")
        .select("role")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data.role;
    },
  });
}

function useRecentRecipes() {
  return useQuery({
    queryKey: ["home-recent-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,name,portions,created_by_email,created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as RecentRecipe[];
    },
  });
}

function formatActivityDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function HomePage({
  email,
  userId,
  onNavigate,
}: {
  email: string;
  userId: string;
  onNavigate: (section: AppSection) => void;
}) {
  const queryClient = useQueryClient();
  const activities = useRecentActivities();
  const pendingProducts = usePendingProducts();
  const role = useHomeInventoryRole(userId);
  const recipes = useRecentRecipes();
  const [finalizingProductId, setFinalizingProductId] = useState<string | null>(null);
  const recentActivities = activities.data ?? [];
  const preregisteredProducts = pendingProducts.data ?? [];
  const recentRecipes = recipes.data ?? [];
  const canFinalize = role.data === "admin" || role.data === "operator";

  async function finalizeProduct(product: PendingProduct) {
    setFinalizingProductId(product.id);
    const { error } = await supabase.rpc("finalize_inventory_product", {
      p_product_id: product.id,
    });
    if (error) {
      setFinalizingProductId(null);
      toast.error(error.message);
      return;
    }
    toast.success(`${product.name} liberado no estoque`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pending-products"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["home-recent-activities"] }),
      queryClient.invalidateQueries({ queryKey: ["recipe-inventory-products"] }),
    ]);
    setFinalizingProductId(null);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-10 pt-6 sm:px-6">
      <header className="mb-8">
        <p className="text-sm text-muted-foreground">Olá, {email}</p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Visão geral</h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe as atividades recentes do estoque e das receitas.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border bg-card">
        <div className="flex items-center gap-3 border-b p-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-warning/15 text-warning-foreground">
            <ClipboardList className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Pré-cadastros do estoque</h2>
            <p className="text-xs text-muted-foreground">
              Ingredientes identificados nas receitas e aguardando finalização
            </p>
          </div>
        </div>
        {pendingProducts.isLoading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Carregando pré-cadastros…</p>
        ) : pendingProducts.isError ? (
          <p className="p-6 text-sm text-destructive" role="alert">
            Não foi possível carregar os pré-cadastros: {pendingProducts.error.message}
          </p>
        ) : preregisteredProducts.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Não há produtos aguardando finalização.
          </p>
        ) : (
          <>
            <ul className="divide-y">
              {preregisteredProducts.map((product) => (
                <li key={product.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.code} · {product.unit}
                      {" · "}saldo 0 {product.unit.toLowerCase()}
                      {" · "}por {product.created_by_email || "usuário"}
                    </p>
                  </div>
                  {canFinalize ? (
                    <Button
                      size="sm"
                      disabled={finalizingProductId !== null}
                      onClick={() => void finalizeProduct(product)}
                    >
                      <Check aria-hidden="true" />
                      {finalizingProductId === product.id ? "Finalizando…" : "Finalizar cadastro"}
                    </Button>
                  ) : role.isError ? (
                    <span role="alert" className="text-xs text-destructive">
                      Não foi possível verificar a permissão
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aguardando Operador/Admin</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="border-t p-4 text-xs text-muted-foreground">
              O saldo permanece zerado. Após a finalização, registre uma entrada para adicionar
              quantidade ao estoque.
            </p>
          </>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Boxes className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Atividades do estoque</h2>
                <p className="text-xs text-muted-foreground">Cadastros, entradas e saídas</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("estoque")}>
              Ver estoque
            </Button>
          </div>

          {activities.isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando atividades…</p>
          ) : activities.isError ? (
            <p className="p-6 text-center text-sm text-destructive" role="alert">
              Não foi possível carregar as atividades do estoque.
            </p>
          ) : recentActivities.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Ainda não há atividades registradas.
            </p>
          ) : (
            <ul className="divide-y">
              {recentActivities.map((activity) => {
                const isEntry = activity.kind === "entrada";
                const Icon =
                  activity.kind === "product" ? Plus : isEntry ? ArrowDownToLine : ArrowUpFromLine;

                return (
                  <li key={activity.id} className="flex items-start gap-3 p-4">
                    <div
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${
                        activity.kind === "product"
                          ? "bg-primary/10 text-primary"
                          : isEntry
                            ? "bg-success/15 text-success"
                            : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="truncate text-sm">{activity.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.productCode ? `${activity.productCode} · ` : ""}
                        {formatActivityDate(activity.createdAt)}
                        {activity.actorEmail ? ` · ${activity.actorEmail}` : ""}
                      </p>
                      {activity.kind !== "product" && activity.note && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {activity.note}
                        </p>
                      )}
                    </div>
                    {activity.kind !== "product" && (
                      <span className="shrink-0 font-mono text-sm">
                        {isEntry ? "+" : "−"}
                        {formatQty(activity.quantity, activity.unit)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <ChefHat className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Atividades de receitas</h2>
                <p className="text-xs text-muted-foreground">Receitas criadas recentemente</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate("receitas")}>
              Abrir receitas
            </Button>
          </div>

          <div className="p-6">
            {recipes.isLoading ? (
              <p className="text-center text-sm text-muted-foreground">Carregando receitas…</p>
            ) : recipes.isError ? (
              <p className="text-sm text-destructive" role="alert">
                Não foi possível carregar as receitas recentes.
              </p>
            ) : recentRecipes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há receitas cadastradas.</p>
            ) : (
              <ul className="space-y-4">
                {recentRecipes.map((recipe) => (
                  <li key={recipe.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Rende {recipe.portions} {recipe.portions === 1 ? "porção" : "porções"}
                        {" · "}por {recipe.created_by_email || "usuário"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatActivityDate(recipe.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button className="mt-5" variant="outline" onClick={() => onNavigate("receitas")}>
              <ChefHat aria-hidden="true" />
              Acessar receitas
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
