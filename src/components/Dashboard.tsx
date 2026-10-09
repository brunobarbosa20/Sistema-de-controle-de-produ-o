import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Archive,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl, formatQty, parseDecimal, validateQuantity, type Unit } from "@/lib/stock";

type Product = {
  id: string;
  name: string;
  unit: Unit;
  quantity: number;
  active: boolean;
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
  products: { name: string; unit: Unit } | null;
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
        .select("id,name,unit,quantity,active")
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
        .select("id,type,quantity,unit_price,note,created_at,created_by_email,products(name,unit)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Movement[];
    },
  });
}

export function Dashboard({ email, userId }: { email: string; userId: string }) {
  const queryClient = useQueryClient();
  const products = useProducts();
  const movements = useMovements();
  const membership = useInventoryRole(userId);
  const [dialog, setDialog] = useState<null | "product" | "edit-product" | "entrada" | "saida">(
    null,
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDeactivate, setProductToDeactivate] = useState<Product | null>(null);
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();
  const [q, setQ] = useState("");

  const activeProducts = (products.data ?? []).filter((product) => product.active);
  const list = (products.data ?? []).filter(
    (product) =>
      product.active !== showInactiveProducts &&
      product.name.toLowerCase().includes(q.toLowerCase()),
  );
  const zero = activeProducts.filter((product) => product.quantity === 0).length;
  const role = membership.data;
  const canOperate = role === "admin" || role === "operator";

  const open = (d: "entrada" | "saida", id?: string) => {
    setPreset(id);
    setDialog(d);
  };

  const editProduct = (product: Product) => {
    setEditingProduct(product);
    setDialog("edit-product");
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
              variant={showInactiveProducts ? "outline" : "secondary"}
              onClick={() => setShowInactiveProducts(false)}
            >
              Ativos
            </Button>
            <Button
              variant={showInactiveProducts ? "secondary" : "outline"}
              onClick={() => setShowInactiveProducts(true)}
            >
              Inativos
            </Button>
          </div>
          {canOperate && !showInactiveProducts && (
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
                {showInactiveProducts ? "Nenhum produto inativo." : "Nenhum produto ainda."}
              </p>
              {canOperate && !showInactiveProducts && (
                <Button className="mt-4" onClick={() => setDialog("product")}>
                  <Plus /> Cadastrar produto
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {list.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.unit.toLowerCase()}</p>
                  </div>
                  <span
                    className={`font-mono text-base ${p.quantity === 0 ? "text-destructive" : ""}`}
                  >
                    {formatQty(p.quantity, p.unit)}
                  </span>
                  {canOperate && !showInactiveProducts && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Editar ${p.name}`}
                        onClick={() => editProduct(p)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="sm"
                        variant="entrada"
                        aria-label={`Entrada ${p.name}`}
                        onClick={() => open("entrada", p.id)}
                      >
                        <ArrowDownToLine />
                      </Button>
                      <Button
                        size="sm"
                        variant="saida"
                        aria-label={`Saída ${p.name}`}
                        onClick={() => open("saida", p.id)}
                      >
                        <ArrowUpFromLine />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Inativar ${p.name}`}
                        title={
                          p.quantity === 0 ? "Inativar produto" : "Zere o saldo antes de inativar"
                        }
                        disabled={p.quantity !== 0}
                        onClick={() => setProductToDeactivate(p)}
                      >
                        <Archive />
                      </Button>
                    </div>
                  )}
                  {canOperate && showInactiveProducts && (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Reativar ${p.name}`}
                      onClick={() => void changeProductStatus(p, true)}
                    >
                      <RotateCcw /> Reativar
                    </Button>
                  )}
                </li>
              ))}
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
                        <p className="text-xs text-muted-foreground">
                          {brl(Number(m.quantity) * Number(m.unit_price))}
                        </p>
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

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          {dialog === "product" && <ProductForm onDone={() => setDialog(null)} />}
          {dialog === "edit-product" && editingProduct && (
            <EditProductForm
              product={editingProduct}
              onDone={() => {
                setDialog(null);
                setEditingProduct(null);
              }}
            />
          )}
          {(dialog === "entrada" || dialog === "saida") && (
            <MovementForm
              type={dialog}
              products={activeProducts}
              preset={preset}
              onDone={() => setDialog(null)}
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
    </div>
  );
}

function EditProductForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(product.name);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Informe a descrição do produto");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase
      .from("products")
      .update({ name: name.trim() })
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
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Editar produto</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="product-description">Descrição do produto</Label>
        <Input
          id="product-description"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        Salvar alterações
      </Button>
    </form>
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
    const { error } = await supabase.rpc("create_inventory_product", {
      p_name: name.trim(),
      p_unit: unit,
      p_initial_quantity: qty ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Produto cadastrado");
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
        <Label>Unidade</Label>
        <Select
          value={unit}
          onValueChange={(value) => {
            if (value === "UN" || value === "GR") setUnit(value);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UN">UN (unidade)</SelectItem>
            <SelectItem value="GR">GR (gramas)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Cada produto usa uma unidade fixa. Cadastre itens por peça em UN ou ingredientes pesados em
        gramas (GR).
      </p>
      <div className="space-y-1.5">
        <Label>Saldo inicial (opcional)</Label>
        <Input
          inputMode="decimal"
          placeholder={unit === "GR" ? "ex: 500" : "ex: 10"}
          value={initial}
          onChange={(e) => setInitial(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        Salvar
      </Button>
    </form>
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
      const parsedPrice = parseDecimal(price);
      if (parsedPrice === null) {
        toast.error("Informe um valor válido para a entrada");
        return;
      }
      entryPrice = parsedPrice;
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
                    {p.name}
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
                placeholder={product?.unit === "GR" ? "ex: 500" : "ex: 1"}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            {type === "entrada" && (
              <div className="space-y-1.5">
                <Label>Valor por {product?.unit.toLowerCase() ?? "un"} (R$)</Label>
                <Input
                  inputMode="decimal"
                  placeholder={product?.unit === "GR" ? "ex: 0,05" : "0,00"}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            )}
          </div>
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
