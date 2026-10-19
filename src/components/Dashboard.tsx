import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Archive,
<<<<<<< HEAD
  Ban,
=======
>>>>>>> 2a4d539 (primeiro git)
  Boxes,
  History,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  brl,
<<<<<<< HEAD
  calculateInventoryValue,
=======
>>>>>>> 2a4d539 (primeiro git)
  calculateUnitPrice,
  calculateWeightedAverageUnitCost,
  formatAverageUnitCost,
  formatCurrencyInput,
  formatQty,
  formatQuantityInput,
  formatUnitPrice,
  parseCurrencyInput,
  validateQuantity,
  type Unit,
} from "@/lib/stock";

type Product = {
  id: string;
  code: string;
  name: string;
  notes: string;
  unit: Unit;
<<<<<<< HEAD
  grams_per_unit: number | null;
  quantity: number;
  active: boolean;
  cancelled: boolean;
  pending_registration: boolean;
=======
  quantity: number;
  active: boolean;
>>>>>>> 2a4d539 (primeiro git)
};
type InventoryRole = "admin" | "operator" | "viewer";
type InventoryMember = { user_id: string; email: string; role: InventoryRole; created_at: string };
type Movement = {
  id: string;
  type: "entrada" | "saida";
  quantity: number;
  unit_price: number;
  note: string | null;
  created_at: string;
  created_by_email: string;
  products: { code: string; name: string; unit: Unit } | null;
};

const roleLabels: Record<InventoryRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  viewer: "Consulta",
};

function isInventoryRole(role: string): role is InventoryRole {
  return role === "admin" || role === "operator" || role === "viewer";
}

function useInventoryRole(userId: string) {
  return useQuery({
    queryKey: ["inventory-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_members")
        .select("role")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      if (!isInventoryRole(data.role)) throw new Error("Nível de acesso inválido");
      return data.role;
    },
  });
}

function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
<<<<<<< HEAD
        .select(
          "id,code,name,notes,unit,grams_per_unit,quantity,active,cancelled,pending_registration",
        )
=======
        .select("id,code,name,notes,unit,quantity,active")
>>>>>>> 2a4d539 (primeiro git)
        .order("name");
      if (error) throw error;
      return data.map((p) => ({
        ...p,
        unit: p.unit as Unit,
        quantity: Number(p.quantity),
      }));
    },
  });
}
function useMovements() {
  return useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movements")
        .select(
          "id,type,quantity,unit_price,note,created_at,created_by_email,products(code,name,unit)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Movement[];
    },
  });
}

<<<<<<< HEAD
function useInventoryCosts(products: Product[]) {
  return useQuery({
    queryKey: ["inventory-costs", products.map((product) => product.id).sort()],
    queryFn: async () => {
      const pageSize = 500;
      const costsByProduct = new Map<
        string,
        Array<{ type: string; quantity: number; unit_price: number; note: string | null }>
      >();
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("movements")
          .select("product_id,type,quantity,unit_price,note")
          .eq("type", "entrada")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;

        for (const movement of data) {
          const entries = costsByProduct.get(movement.product_id) ?? [];
          entries.push({
            type: movement.type,
            quantity: Number(movement.quantity),
            unit_price: Number(movement.unit_price),
            note: movement.note,
          });
          costsByProduct.set(movement.product_id, entries);
        }

        if (data.length < pageSize) break;
        offset += pageSize;
      }

      return Object.fromEntries(
        products.map((product) => [
          product.id,
          calculateWeightedAverageUnitCost(costsByProduct.get(product.id) ?? []),
        ]),
      ) as Record<string, number | null>;
    },
  });
}

=======
>>>>>>> 2a4d539 (primeiro git)
export function Dashboard({ email, userId }: { email: string; userId: string }) {
  const queryClient = useQueryClient();
  const products = useProducts();
  const movements = useMovements();
  const membership = useInventoryRole(userId);
  const [dialog, setDialog] = useState<
    null | "product" | "product-detail" | "edit-product" | "entrada" | "saida"
  >(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
<<<<<<< HEAD
  const [productList, setProductList] = useState<"active" | "inactive" | "pending" | "cancelled">(
    "active",
  );
  const [productToCancel, setProductToCancel] = useState<{
    product: Product;
    cancelled: boolean;
  } | null>(null);
  const [preset, setPreset] = useState<string | undefined>();
  const [q, setQ] = useState("");

  const activeProducts = (products.data ?? []).filter(
    (product) => product.active && !product.cancelled && !product.pending_registration,
  );
  const inventoryCosts = useInventoryCosts(activeProducts);
  const list = (products.data ?? []).filter(
    (product) =>
      (productList === "cancelled"
        ? product.cancelled
        : productList === "pending"
          ? product.pending_registration && !product.cancelled
          : !product.cancelled &&
            !product.pending_registration &&
            product.active === (productList === "active")) &&
=======
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();
  const [q, setQ] = useState("");

  const activeProducts = (products.data ?? []).filter((product) => product.active);
  const list = (products.data ?? []).filter(
    (product) =>
      product.active !== showInactiveProducts &&
>>>>>>> 2a4d539 (primeiro git)
      (product.name.toLowerCase().includes(q.toLowerCase()) ||
        product.code.toLowerCase().includes(q.toLowerCase())),
  );
  const zero = activeProducts.filter((product) => product.quantity === 0).length;
<<<<<<< HEAD
  const inventoryValue = calculateInventoryValue(
    activeProducts.map((product) => ({
      quantity: product.quantity,
      averageUnitCost: inventoryCosts.data?.[product.id] ?? null,
    })),
  );
  const role = membership.data;
  const canOperate = role === "admin" || role === "operator";
  const selectedProduct = (products.data ?? []).find((product) => product.id === selectedProductId);
=======
  const role = membership.data;
  const canOperate = role === "admin" || role === "operator";
  const selectedProduct = (products.data ?? []).find(
    (product) => product.id === selectedProductId,
  );
>>>>>>> 2a4d539 (primeiro git)

  const open = (d: "entrada" | "saida", id?: string) => {
    setPreset(id);
    setDialog(d);
  };

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    setDialog("product-detail");
  };

  async function changeProductStatus(product: Product, active: boolean) {
    const { error } = await supabase.rpc("set_product_active", {
      p_product_id: product.id,
      p_active: active,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(active ? "Produto reativado" : "Produto inativado");
    setProductToDeactivate(null);
    await queryClient.invalidateQueries({ queryKey: ["products"] });
  }

<<<<<<< HEAD
  async function changeProductCancellation(product: Product, cancelled: boolean) {
    const { error } = await supabase.rpc("set_product_cancelled", {
      p_product_id: product.id,
      p_cancelled: cancelled,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(cancelled ? "Produto movido para Cancelados" : "Produto restaurado");
    setProductToCancel(null);
    await queryClient.invalidateQueries({ queryKey: ["products"] });
  }

=======
>>>>>>> 2a4d539 (primeiro git)
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight sm:text-2xl">
              Sistema de Controle de Produção
            </h1>
            <p className="max-w-[180px] truncate text-xs text-muted-foreground sm:max-w-none">
              {email}
            </p>
            {role && <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
          <LogOut /> <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>

      {membership.isError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          Não foi possível carregar seu nível de acesso. Verifique se a migração de estoque
          compartilhado foi aplicada.
        </p>
      )}

<<<<<<< HEAD
      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">Produtos</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {products.data ? activeProducts.length : "–"}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-3 sm:p-4">
          <p className="text-sm text-muted-foreground">Sem saldo</p>
          <p className="mt-1 font-display text-2xl font-bold text-destructive">
            {products.data ? zero : "–"}
          </p>
        </div>
        <div className="col-span-2 rounded-2xl border bg-card p-3 sm:p-4 md:col-span-1">
          <p className="text-sm text-muted-foreground">Valor em estoque</p>
          {products.isLoading || inventoryCosts.isLoading ? (
            <p className="mt-1 font-display text-2xl font-bold">…</p>
          ) : products.isError || inventoryCosts.isError ? (
            <p className="mt-1 text-sm text-destructive">Não foi possível calcular.</p>
          ) : (
            <>
              <p className="mt-1 font-display text-2xl font-bold">{brl(inventoryValue.total)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Custo médio ponderado
                {inventoryValue.unpricedItems > 0
                  ? ` · ${inventoryValue.unpricedItems} ${inventoryValue.unpricedItems === 1 ? "item sem custo" : "itens sem custo"}`
                  : ""}
              </p>
            </>
          )}
        </div>
      </section>

      {canOperate && productList === "active" && (
=======
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Produtos</p>
          <p className="mt-1 font-display text-3xl font-bold">
            {products.data ? activeProducts.length : "–"}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Sem saldo</p>
          <p className="mt-1 font-display text-3xl font-bold text-destructive">
            {products.data ? zero : "–"}
          </p>
        </div>
      </section>

      {canOperate && !showInactiveProducts && (
>>>>>>> 2a4d539 (primeiro git)
        <div className="mb-6 hidden gap-2 sm:flex">
          <Button onClick={() => setDialog("product")}>
            <Plus /> Novo produto
          </Button>
          <Button variant="entrada" onClick={() => open("entrada")}>
            <ArrowDownToLine /> Entrada
          </Button>
          <Button variant="saida" onClick={() => open("saida")}>
            <ArrowUpFromLine /> Saída
          </Button>
        </div>
      )}

      <Tabs defaultValue="saldo">
        <TabsList className="mb-4">
          <TabsTrigger value="saldo">
            <Boxes className="mr-1.5 h-4 w-4" />
            Saldo
          </TabsTrigger>
          <TabsTrigger value="hist">
            <History className="mr-1.5 h-4 w-4" />
            Histórico
          </TabsTrigger>
          {role === "admin" && (
            <TabsTrigger value="equipe">
              <Users className="mr-1.5 h-4 w-4" />
              Equipe
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="saldo">
          <div className="mb-3 flex gap-2">
            <Button
<<<<<<< HEAD
              variant={productList === "active" ? "secondary" : "outline"}
              onClick={() => setProductList("active")}
=======
              variant={showInactiveProducts ? "outline" : "secondary"}
              onClick={() => setShowInactiveProducts(false)}
>>>>>>> 2a4d539 (primeiro git)
            >
              Ativos
            </Button>
            <Button
<<<<<<< HEAD
              variant={productList === "inactive" ? "secondary" : "outline"}
              onClick={() => setProductList("inactive")}
            >
              Inativos
            </Button>
            <Button
              variant={productList === "pending" ? "secondary" : "outline"}
              onClick={() => setProductList("pending")}
            >
              Pré-cadastro
            </Button>
            <Button
              variant={productList === "cancelled" ? "secondary" : "outline"}
              onClick={() => setProductList("cancelled")}
            >
              Cancelados
            </Button>
          </div>
          {canOperate && productList === "active" && (
=======
              variant={showInactiveProducts ? "secondary" : "outline"}
              onClick={() => setShowInactiveProducts(true)}
            >
              Inativos
            </Button>
          </div>
          {canOperate && !showInactiveProducts && (
>>>>>>> 2a4d539 (primeiro git)
            <p className="mb-3 text-xs text-muted-foreground">
              Para inativar um produto, primeiro registre saídas até zerar o saldo. O histórico será
              preservado.
            </p>
          )}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {products.isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Carregando…</p>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="text-muted-foreground">
<<<<<<< HEAD
                {productList === "cancelled"
                  ? "Nenhum produto cancelado."
                  : productList === "inactive"
                    ? "Nenhum produto inativo."
                    : productList === "pending"
                      ? "Nenhum produto aguardando finalização."
                      : "Nenhum produto ainda."}
              </p>
              {canOperate && productList === "active" && (
=======
                {showInactiveProducts ? "Nenhum produto inativo." : "Nenhum produto ainda."}
              </p>
              {canOperate && !showInactiveProducts && (
>>>>>>> 2a4d539 (primeiro git)
                <Button className="mt-4" onClick={() => setDialog("product")}>
                  <Plus /> Cadastrar produto
                </Button>
              )}
            </div>
          ) : (
<<<<<<< HEAD
            <ul className="h-[85vh] divide-y overflow-y-auto overscroll-contain rounded-2xl border bg-card">
              {list.map((p) => {
                const averageCost = inventoryCosts.data?.[p.id];
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                      onClick={() => openProduct(p.id)}
                      aria-label={`Detalhes de ${p.name}, saldo ${formatQty(p.quantity, p.unit)}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.code} · {p.unit.toLowerCase()}
                          {p.pending_registration ? " · pré-cadastro" : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xs text-muted-foreground">Saldo atual</span>
                        <span
                          className={`font-mono text-base ${p.quantity === 0 ? "text-destructive" : ""}`}
                        >
                          {formatQty(p.quantity, p.unit)}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Valor:{" "}
                          {p.quantity === 0
                            ? brl(0)
                            : inventoryCosts.isError
                              ? "Indisponível"
                              : inventoryCosts.isLoading
                                ? "Calculando…"
                                : averageCost == null
                                  ? "Sem custo"
                                  : brl(p.quantity * averageCost)}
                        </span>
                      </span>
                    </button>
                    {canOperate && (
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${p.cancelled ? "Restaurar" : "Cancelar"} ${p.name}`}
                        onClick={() => setProductToCancel({ product: p, cancelled: !p.cancelled })}
                      >
                        {p.cancelled ? <RotateCcw /> : <Ban />}
                        <span className="hidden sm:inline">
                          {p.cancelled ? "Restaurar" : "Cancelar"}
                        </span>
                      </Button>
                    )}
                  </li>
                );
              })}
=======
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {list.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    onClick={() => openProduct(p.id)}
                    aria-label={`Detalhes de ${p.name}, saldo ${formatQty(p.quantity, p.unit)}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.code} · {p.unit.toLowerCase()}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-muted-foreground">Saldo atual</span>
                      <span
                        className={`font-mono text-base ${p.quantity === 0 ? "text-destructive" : ""}`}
                      >
                        {formatQty(p.quantity, p.unit)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
>>>>>>> 2a4d539 (primeiro git)
            </ul>
          )}
        </TabsContent>

        <TabsContent value="hist">
          {(movements.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {movements.data!.map((m) => {
                const unit = m.products?.unit ?? "UN";
                return (
                  <li key={m.id} className="flex items-center gap-3 p-4">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${m.type === "entrada" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}
                    >
                      {m.type === "entrada" ? (
                        <ArrowDownToLine className="h-4 w-4" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {m.products?.name ?? "Produto removido"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.products?.code ? `${m.products.code} · ` : ""}
                        {new Date(m.created_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {m.note ? ` · ${m.note}` : ""}
                        {m.created_by_email ? ` · por ${m.created_by_email}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">
                        {m.type === "entrada" ? "+" : "−"}
                        {formatQty(Number(m.quantity), unit)}
                      </p>
                      {m.type === "entrada" && (
                        <div className="text-xs text-muted-foreground">
                          <p>{brl(Number(m.quantity) * Number(m.unit_price))} total</p>
                          <p>{formatUnitPrice(Number(m.unit_price), unit)}</p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        {role === "admin" && (
          <TabsContent value="equipe">
            <MembersPanel />
          </TabsContent>
        )}
      </Tabs>

      {canOperate && (
        <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 gap-2 border-t bg-card/95 p-3 backdrop-blur sm:hidden">
          <Button onClick={() => setDialog("product")}>
            <Plus /> Produto
          </Button>
          <Button variant="entrada" onClick={() => open("entrada")}>
            <ArrowDownToLine /> Entrada
          </Button>
          <Button variant="saida" onClick={() => open("saida")}>
            <ArrowUpFromLine /> Saída
          </Button>
        </nav>
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setSelectedProductId(null);
          }
        }}
      >
        <DialogContent
          className={
<<<<<<< HEAD
            dialog === "product-detail" ? "max-h-[90vh] max-w-2xl overflow-y-auto" : "max-w-md"
=======
            dialog === "product-detail"
              ? "max-h-[90vh] max-w-2xl overflow-y-auto"
              : "max-w-md"
>>>>>>> 2a4d539 (primeiro git)
          }
        >
          {dialog === "product" && <ProductForm onDone={() => setDialog(null)} />}
          {dialog === "product-detail" && selectedProduct && (
            <ProductDetail
              product={selectedProduct}
              canOperate={canOperate}
              onEntry={() => open("entrada", selectedProduct.id)}
              onExit={() => open("saida", selectedProduct.id)}
              onEdit={() => setDialog("edit-product")}
              onDeactivate={() => setProductToDeactivate(selectedProduct)}
              onReactivate={() => void changeProductStatus(selectedProduct, true)}
            />
          )}
          {dialog === "edit-product" && selectedProduct && (
<<<<<<< HEAD
            <EditProductForm product={selectedProduct} onDone={() => setDialog("product-detail")} />
=======
            <EditProductForm
              product={selectedProduct}
              onDone={() => setDialog("product-detail")}
            />
>>>>>>> 2a4d539 (primeiro git)
          )}
          {(dialog === "entrada" || dialog === "saida") && (
            <MovementForm
              type={dialog}
              products={activeProducts}
              preset={preset}
              onDone={() => setDialog(selectedProductId ? "product-detail" : null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={productToDeactivate !== null}
        onOpenChange={(open) => !open && setProductToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDeactivate?.name} sairá da lista de itens ativos. O cadastro e o histórico
              serão preservados, e o produto poderá ser reativado depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDeactivate) void changeProductStatus(productToDeactivate, false);
              }}
            >
              Inativar produto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
<<<<<<< HEAD
      <AlertDialog
        open={productToCancel !== null}
        onOpenChange={(open) => !open && setProductToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {productToCancel?.cancelled ? "Restaurar produto?" : "Cancelar produto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {productToCancel?.cancelled
                ? `${productToCancel.product.name} voltará à lista de ${productToCancel.product.active ? "ativos" : "inativos"}. O saldo e o histórico serão preservados.`
                : `${productToCancel?.product.name} sairá das listas e totais de estoque. O saldo atual e o histórico serão preservados como dados fantasmas, sem novas movimentações.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToCancel) {
                  void changeProductCancellation(
                    productToCancel.product,
                    productToCancel.cancelled,
                  );
                }
              }}
            >
              {productToCancel?.cancelled ? "Restaurar produto" : "Cancelar produto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
=======
>>>>>>> 2a4d539 (primeiro git)
    </div>
  );
}

function EditProductForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(product.name);
  const [notes, setNotes] = useState(product.notes);
<<<<<<< HEAD
  const [gramsPerUnit, setGramsPerUnit] = useState(
    product.grams_per_unit === null ? "" : formatQuantityInput(String(product.grams_per_unit)),
  );
=======
>>>>>>> 2a4d539 (primeiro git)
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Informe a descrição do produto");
      return;
    }
<<<<<<< HEAD
    let parsedGramsPerUnit: number | null = null;
    if (gramsPerUnit.trim()) {
      const value = validateQuantity(gramsPerUnit, "GR");
      if (value.error || value.value === undefined || value.value > 2147483647) {
        toast.error("Informe um peso inteiro em gramas por unidade");
        return;
      }
      parsedGramsPerUnit = value.value;
    }
=======
>>>>>>> 2a4d539 (primeiro git)

    setBusy(true);
    const { data, error } = await supabase
      .from("products")
<<<<<<< HEAD
      .update({
        name: name.trim(),
        notes: notes.trim(),
        grams_per_unit: parsedGramsPerUnit,
      })
=======
      .update({ name: name.trim(), notes: notes.trim() })
>>>>>>> 2a4d539 (primeiro git)
      .eq("id", product.id)
      .select("id")
      .single();
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Produto não encontrado ou sem permissão para editar");
      return;
    }

    toast.success("Produto atualizado");
    await queryClient.invalidateQueries({ queryKey: ["products"] });
<<<<<<< HEAD
    await queryClient.invalidateQueries({ queryKey: ["recipe-inventory-products"] });
=======
>>>>>>> 2a4d539 (primeiro git)
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Editar produto</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="product-description">Nome do produto</Label>
        <Input
          id="product-description"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="product-notes">Observações</Label>
        <Textarea
          id="product-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
        />
      </div>
<<<<<<< HEAD
      {product.unit === "GR" && (
        <div className="space-y-1.5">
          <Label htmlFor="product-grams-per-unit">Peso de 1 unidade (opcional)</Label>
          <Input
            id="product-grams-per-unit"
            inputMode="numeric"
            placeholder="ex: 90"
            value={gramsPerUnit}
            onChange={(event) => setGramsPerUnit(formatQuantityInput(event.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Informe quantos gramas há em uma unidade deste produto. Assim, ele pode ser usado como
            UN nas receitas e continuar controlado em GR no estoque.
          </p>
        </div>
      )}
=======
>>>>>>> 2a4d539 (primeiro git)
      <Button type="submit" className="w-full" disabled={busy}>
        Salvar alterações
      </Button>
    </form>
  );
}

function ProductDetail({
  product,
  canOperate,
  onEntry,
  onExit,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  product: Product;
  canOperate: boolean;
  onEntry: () => void;
  onExit: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const history = useQuery({
    queryKey: ["product-movements", product.id],
    queryFn: async () => {
      const pageSize = 500;
      const allMovements = [];
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("movements")
          .select("id,type,quantity,unit_price,note,created_at,created_by_email")
          .eq("product_id", product.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        allMovements.push(...data);
        if (data.length < pageSize) return allMovements;
        offset += pageSize;
      }
    },
  });
<<<<<<< HEAD
  const historyItems = history.data ?? [];
=======
>>>>>>> 2a4d539 (primeiro git)
  const averageUnitCost = history.data
    ? calculateWeightedAverageUnitCost(
        history.data.map((movement) => ({
          type: movement.type,
          quantity: Number(movement.quantity),
          unit_price: Number(movement.unit_price),
          note: movement.note,
        })),
      )
    : null;

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {product.code} · Unidade {product.unit}
<<<<<<< HEAD
          {product.unit === "GR" && product.grams_per_unit !== null
            ? ` · 1 UN = ${formatQty(product.grams_per_unit, "GR")}`
            : ""}
=======
>>>>>>> 2a4d539 (primeiro git)
        </p>
      </DialogHeader>
      <section className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Saldo atual</p>
        <p className="mt-1 font-display text-3xl font-bold">
          {formatQty(product.quantity, product.unit)}
        </p>
        <div className="mt-3 border-t pt-3">
          <p className="text-sm text-muted-foreground">Custo médio ponderado</p>
          {history.isLoading ? (
            <p className="mt-1 text-sm text-muted-foreground">Calculando…</p>
          ) : history.isError ? (
<<<<<<< HEAD
            <p className="mt-1 text-sm text-destructive">
              Indisponível: erro ao carregar entradas.
            </p>
          ) : averageUnitCost === null ? (
            <p className="mt-1 text-sm text-muted-foreground">Sem entradas com custo registrado.</p>
=======
            <p className="mt-1 text-sm text-destructive">Indisponível: erro ao carregar entradas.</p>
          ) : averageUnitCost === null ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Sem entradas com custo registrado.
            </p>
>>>>>>> 2a4d539 (primeiro git)
          ) : (
            <p className="mt-1 font-medium">
              {formatAverageUnitCost(averageUnitCost, product.unit)}
            </p>
          )}
        </div>
      </section>
      {product.notes && (
        <section className="space-y-1">
          <h3 className="text-sm font-medium">Observações</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{product.notes}</p>
        </section>
      )}
<<<<<<< HEAD
      {canOperate && !product.cancelled && (
        <div className="flex flex-wrap gap-2">
          {product.pending_registration ? (
            <p className="w-full rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
              Este item aguarda finalização na Home. Não é possível registrar movimentações antes
              disso.
            </p>
          ) : product.active ? (
=======
      {canOperate && (
        <div className="flex flex-wrap gap-2">
          {product.active ? (
>>>>>>> 2a4d539 (primeiro git)
            <>
              <Button variant="entrada" onClick={onEntry}>
                <ArrowDownToLine /> Entrada
              </Button>
              <Button variant="saida" onClick={onExit}>
                <ArrowUpFromLine /> Saída
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onReactivate}>
              <RotateCcw /> Reativar item
            </Button>
          )}
          <Button variant="outline" onClick={onEdit}>
            <Pencil /> Editar item
          </Button>
<<<<<<< HEAD
          {product.active && !product.pending_registration && (
=======
          {product.active && (
>>>>>>> 2a4d539 (primeiro git)
            <Button
              variant="outline"
              title={product.quantity === 0 ? "Inativar produto" : "Zere o saldo antes de inativar"}
              disabled={product.quantity !== 0}
              onClick={onDeactivate}
            >
              <Archive /> Inativar item
            </Button>
          )}
        </div>
      )}
      <section className="space-y-3">
        <h3 className="font-semibold">Histórico completo</h3>
        {history.isLoading ? (
<<<<<<< HEAD
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando histórico…</p>
=======
          <p className="py-6 text-center text-sm text-muted-foreground">
            Carregando histórico…
          </p>
>>>>>>> 2a4d539 (primeiro git)
        ) : history.isError ? (
          <p role="alert" className="py-6 text-center text-sm text-destructive">
            Não foi possível carregar o histórico: {history.error.message}
          </p>
<<<<<<< HEAD
        ) : historyItems.length === 0 ? (
=======
        ) : history.data.length === 0 ? (
>>>>>>> 2a4d539 (primeiro git)
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma movimentação registrada para este item.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border">
<<<<<<< HEAD
            {historyItems.map((movement) => (
              <li key={movement.id} className="flex items-start gap-3 p-3">
=======
            {history.data.map((movement) => (
              <li key={movement.id} className="flex items-center gap-3 p-3">
>>>>>>> 2a4d539 (primeiro git)
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${movement.type === "entrada" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}
                >
                  {movement.type === "entrada" ? (
                    <ArrowDownToLine className="h-4 w-4" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
<<<<<<< HEAD
                  <p className="font-medium">{movement.type === "entrada" ? "Entrada" : "Saída"}</p>
                  <p className="whitespace-normal break-words text-xs text-muted-foreground">
=======
                  <p className="font-medium">
                    {movement.type === "entrada" ? "Entrada" : "Saída"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
>>>>>>> 2a4d539 (primeiro git)
                    {new Date(movement.created_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {movement.note ? ` · ${movement.note}` : ""}
                    {movement.created_by_email ? ` · por ${movement.created_by_email}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">
                    {movement.type === "entrada" ? "+" : "−"}
                    {formatQty(Number(movement.quantity), product.unit)}
                  </p>
                  {movement.type === "entrada" && (
                    <p className="text-xs text-muted-foreground">
                      {brl(Number(movement.quantity) * Number(movement.unit_price))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MembersPanel() {
  const queryClient = useQueryClient();
  const members = useQuery({
    queryKey: ["inventory-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_members")
        .select("user_id,email,role,created_at")
        .order("email");
      if (error) throw error;
      return data.map((member) => {
        if (!isInventoryRole(member.role))
          throw new Error(`Nível de acesso inválido para ${member.email}`);
        return { ...member, role: member.role };
      }) satisfies InventoryMember[];
    },
  });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function changeRole(userId: string, role: InventoryRole) {
    setBusyUserId(userId);
    const { error } = await supabase.rpc("set_inventory_role", { p_user_id: userId, p_role: role });
    setBusyUserId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Nível de acesso atualizado");
    await queryClient.invalidateQueries({ queryKey: ["inventory-members"] });
    await queryClient.invalidateQueries({ queryKey: ["inventory-role"] });
  }

  if (members.isLoading)
    return <p className="py-8 text-center text-muted-foreground">Carregando usuários…</p>;
  if (members.isError)
    return (
      <p role="alert" className="py-8 text-center text-destructive">
        Não foi possível carregar os usuários: {members.error.message}
      </p>
    );
  if (!members.data)
    return (
      <p role="alert" className="py-8 text-center text-destructive">
        A lista de usuários não foi retornada.
      </p>
    );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Equipe do estoque</h2>
        <p className="text-sm text-muted-foreground">
          Novos cadastros entram como Consulta. Você pode alterar os acessos aqui.
        </p>
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {members.data.map((member) => (
          <li key={member.user_id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{member.email}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[member.role]}</p>
            </div>
            <Select
              value={member.role}
              onValueChange={(value) => {
                if (isInventoryRole(value)) void changeRole(member.user_id, value);
              }}
              disabled={busyUserId === member.user_id}
            >
              <SelectTrigger className="w-40" aria-label={`Nível de acesso de ${member.email}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="operator">Operador</SelectItem>
                <SelectItem value="viewer">Consulta</SelectItem>
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [unit, setUnit] = useState<Unit>("UN");
  const [initial, setInitial] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome");
      return;
    }
    let qty: number | undefined;
    if (initial.trim()) {
      const v = validateQuantity(initial, unit);
      if (v.error) {
        toast.error(v.error);
        return;
      }
      qty = v.value;
    }
    setBusy(true);
    const { data: productCode, error } = await supabase.rpc("create_inventory_product", {
      p_name: name.trim(),
      p_unit: unit,
      p_initial_quantity: qty ?? null,
      p_notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Produto cadastrado: ${productCode}`);
    qc.invalidateQueries();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Novo produto</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-product-notes">Observações (opcional)</Label>
        <Textarea
          id="new-product-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Unidade</Label>
        <Select
          value={unit}
          onValueChange={(value) => {
<<<<<<< HEAD
            if (value === "UN" || value === "GR" || value === "ML") setUnit(value);
=======
            if (value === "UN" || value === "GR") setUnit(value);
>>>>>>> 2a4d539 (primeiro git)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UN">UN (unidade)</SelectItem>
            <SelectItem value="GR">GR (gramas)</SelectItem>
<<<<<<< HEAD
            <SelectItem value="ML">ML (mililitros)</SelectItem>
=======
>>>>>>> 2a4d539 (primeiro git)
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
<<<<<<< HEAD
        Cada produto usa uma unidade fixa: UN para peças, GR para gramas e ML para mililitros.
=======
        Cada produto usa uma unidade fixa. Cadastre itens por peça em UN ou ingredientes pesados em
        gramas (GR).
>>>>>>> 2a4d539 (primeiro git)
      </p>
      <div className="space-y-1.5">
        <Label>Saldo inicial (opcional)</Label>
        <Input
          inputMode="decimal"
<<<<<<< HEAD
          placeholder={unit === "UN" ? "ex: 10" : "ex: 500"}
=======
          placeholder={unit === "GR" ? "ex: 500" : "ex: 10"}
>>>>>>> 2a4d539 (primeiro git)
          value={initial}
          onChange={(e) => setInitial(formatQuantityInput(e.target.value))}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        Salvar
      </Button>
    </form>
  );
}

<<<<<<< HEAD
function CalculatedUnitPrice({
  quantity,
  packageTotal,
  unit,
}: {
  quantity: string;
  packageTotal: string;
  unit: Unit;
}) {
  const parsedQuantity = validateQuantity(quantity, unit);
=======
function CalculatedGramPrice({
  quantity,
  packageTotal,
}: {
  quantity: string;
  packageTotal: string;
}) {
  const parsedQuantity = validateQuantity(quantity, "GR");
>>>>>>> 2a4d539 (primeiro git)
  const parsedTotal = parseCurrencyInput(packageTotal);
  if (parsedQuantity.value === undefined || parsedTotal === null) return null;

  return (
    <p className="text-sm text-muted-foreground">
      Custo calculado:{" "}
      <span className="font-medium text-foreground">
<<<<<<< HEAD
        {formatUnitPrice(calculateUnitPrice(parsedTotal, parsedQuantity.value), unit)}
=======
        {formatUnitPrice(calculateUnitPrice(parsedTotal, parsedQuantity.value), "GR")}
>>>>>>> 2a4d539 (primeiro git)
      </span>
    </p>
  );
}

function MovementForm({
  type,
  products,
  preset,
  onDone,
}: {
  type: "entrada" | "saida";
  products: Product[];
  preset?: string | undefined;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState(preset ?? "");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const product = products.find((p) => p.id === productId);
  const [price, setPrice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) {
      toast.error("Selecione um produto");
      return;
    }
    const v = validateQuantity(qty, product.unit);
    if (v.error) {
      toast.error(v.error);
      return;
    }
    if (type === "saida" && v.value! > product.quantity) {
      toast.error(`Saldo insuficiente: ${formatQty(product.quantity, product.unit)}`);
      return;
    }
    let entryPrice = 0;
    if (type === "entrada") {
      const parsedPrice = parseCurrencyInput(price);
      if (parsedPrice === null) {
        toast.error(
<<<<<<< HEAD
          product.unit !== "UN"
=======
          product.unit === "GR"
>>>>>>> 2a4d539 (primeiro git)
            ? "Informe o valor total do pacote"
            : "Informe um valor válido para a entrada",
        );
        return;
      }
<<<<<<< HEAD
      entryPrice = product.unit !== "UN" ? calculateUnitPrice(parsedPrice, v.value!) : parsedPrice;
=======
      entryPrice =
        product.unit === "GR" ? calculateUnitPrice(parsedPrice, v.value!) : parsedPrice;
>>>>>>> 2a4d539 (primeiro git)
    }
    setBusy(true);
    const { error } = await supabase.from("movements").insert({
      product_id: product.id,
      type,
      quantity: v.value!,
      unit_price: entryPrice,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(type === "entrada" ? "Entrada registrada" : "Saída registrada");
    qc.invalidateQueries();
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{type === "entrada" ? "Registrar entrada" : "Registrar saída"}</DialogTitle>
      </DialogHeader>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cadastre um produto primeiro.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label>Produto</Label>
            <Select
              value={productId}
              onValueChange={(id) => {
                setProductId(id);
                setPrice("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={`grid gap-3 ${type === "entrada" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="space-y-1.5">
              <Label>Quantidade {product ? `(${product.unit})` : ""}</Label>
              <Input
                inputMode="decimal"
<<<<<<< HEAD
                placeholder={product?.unit === "UN" ? "ex: 1" : "ex: 500"}
=======
                placeholder={product?.unit === "GR" ? "ex: 500" : "ex: 1"}
>>>>>>> 2a4d539 (primeiro git)
                value={qty}
                onChange={(e) => setQty(formatQuantityInput(e.target.value))}
              />
            </div>
            {type === "entrada" && (
              <div className="space-y-1.5">
                <Label>
<<<<<<< HEAD
                  {product?.unit === "UN" ? "Valor por unidade (R$)" : "Valor total do pacote (R$)"}
                </Label>
                <Input
                  inputMode="decimal"
                  placeholder={product?.unit === "UN" ? "ex: 5,00" : "ex: 10,00"}
=======
                  {product?.unit === "GR" ? "Valor total do pacote (R$)" : "Valor por unidade (R$)"}
                </Label>
                <Input
                  inputMode="decimal"
                  placeholder={product?.unit === "GR" ? "ex: 10,00" : "ex: 5,00"}
>>>>>>> 2a4d539 (primeiro git)
                  value={price}
                  onChange={(event) => {
                    const input = event.currentTarget;
                    const formatted = formatCurrencyInput(input.value);
                    setPrice(formatted);
                    requestAnimationFrame(() => {
                      input.setSelectionRange(formatted.length, formatted.length);
                    });
                  }}
                />
              </div>
            )}
          </div>
<<<<<<< HEAD
          {type === "entrada" && product && product.unit !== "UN" && (
            <CalculatedUnitPrice quantity={qty} packageTotal={price} unit={product.unit} />
=======
          {type === "entrada" && product?.unit === "GR" && (
            <CalculatedGramPrice quantity={qty} packageTotal={price} />
>>>>>>> 2a4d539 (primeiro git)
          )}
          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Input placeholder="opcional" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit" variant={type} className="w-full" disabled={busy}>
            Confirmar
          </Button>
        </>
      )}
    </form>
  );
}
