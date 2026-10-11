import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChefHat, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatQty, type Unit } from "@/lib/stock";
import type { Json } from "@/integrations/supabase/types";

type InventoryProduct = {
  id: string;
  code: string;
  name: string;
  unit: Unit;
  grams_per_unit: number | null;
};

type RecipeIngredient = {
  id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit: Unit;
  position: number;
};

type Recipe = {
  id: string;
  name: string;
  portions: number;
  created_by: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  ingredients: RecipeIngredient[];
};

type IngredientDraft = {
  key: string;
  productId: string | null;
  name: string;
  quantity: number;
  unit: Unit;
};

function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const recipesResult = await supabase
        .from("recipes")
        .select("id,name,portions,created_by,created_by_email,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (recipesResult.error) throw recipesResult.error;
      if (recipesResult.data.length === 0) return [];

      const ingredientsResult = await supabase
        .from("recipe_ingredients")
        .select("id,recipe_id,product_id,name,quantity,unit,position")
        .in(
          "recipe_id",
          recipesResult.data.map((recipe) => recipe.id),
        )
        .order("position");
      if (ingredientsResult.error) throw ingredientsResult.error;

      return recipesResult.data.map((recipe) => ({
        ...recipe,
        ingredients: ingredientsResult.data
          .filter((ingredient) => ingredient.recipe_id === recipe.id)
          .map((ingredient) => ({
            ...ingredient,
            unit: ingredient.unit as Unit,
            quantity: Number(ingredient.quantity),
          })),
      })) satisfies Recipe[];
    },
  });
}

function useInventoryProducts() {
  return useQuery({
    queryKey: ["recipe-inventory-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,code,name,unit,grams_per_unit")
        .eq("active", true)
        .eq("cancelled", false)
        .eq("pending_registration", false)
        .order("name");
      if (error) throw error;
      return data.map((product) => ({ ...product, unit: product.unit as Unit }));
    },
  });
}

function recipeUnitsForProduct(product: InventoryProduct): Unit[] {
  return product.unit === "GR" && product.grams_per_unit !== null ? ["GR", "UN"] : [product.unit];
}

function stockGramsForIngredient(
  quantity: number,
  unit: Unit,
  product: InventoryProduct | undefined,
): string | null {
  if (unit !== "UN" || product?.unit !== "GR" || product.grams_per_unit === null) return null;
  const grams = BigInt(quantity) * BigInt(product.grams_per_unit);
  return `${grams.toLocaleString("pt-BR")} GR no estoque`;
}

function RecipeForm({
  products,
  recipe,
  onCancel,
  onSaved,
}: {
  products: InventoryProduct[];
  recipe: Recipe | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(recipe?.name ?? "");
  const [portions, setPortions] = useState(String(recipe?.portions ?? 1));
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientQuantity, setIngredientQuantity] = useState("1");
  const [freeIngredientUnit, setFreeIngredientUnit] = useState<Unit>("GR");
  const [ingredientUnit, setIngredientUnit] = useState<Unit>("GR");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    recipe?.ingredients.map((ingredient) => ({
      key: ingredient.id,
      productId: ingredient.product_id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    })) ?? [],
  );
  const [busy, setBusy] = useState(false);

  const exactProduct = products.find(
    (product) =>
      product.name.toLocaleLowerCase("pt-BR") === ingredientName.trim().toLocaleLowerCase("pt-BR"),
  );
  const suggestions = useMemo(() => {
    const query = ingredientName.trim().toLocaleLowerCase("pt-BR");
    if (!query) return [];
    return products
      .filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(query))
      .slice(0, 5);
  }, [ingredientName, products]);

  function addIngredient(product: InventoryProduct | null = exactProduct ?? null) {
    const trimmedName = product?.name ?? ingredientName.trim();
    const quantity = Number(ingredientQuantity);
    if (!trimmedName) {
      toast.error("Informe o nome do ingrediente");
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 2147483647) {
      toast.error("A quantidade deve ser um número inteiro maior que zero");
      return;
    }
    if (trimmedName.length > 120) {
      toast.error("O nome do ingrediente não pode passar de 120 caracteres");
      return;
    }

    setIngredients((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        productId: product?.id ?? null,
        name: trimmedName,
        quantity,
        unit: product ? ingredientUnit : freeIngredientUnit,
      },
    ]);
    if (!product) {
      toast.info("Este ingrediente não está cadastrado entre os itens ativos do estoque.");
    }
    setIngredientName("");
    setIngredientQuantity("1");
    setIngredientUnit(freeIngredientUnit);
  }

  function addSuggestedProduct(product: InventoryProduct) {
    setIngredientName(product.name);
    setIngredientUnit(product.unit);
  }

  async function saveRecipe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedPortions = Number(portions);
    if (
      !Number.isSafeInteger(parsedPortions) ||
      parsedPortions <= 0 ||
      parsedPortions > 2147483647
    ) {
      toast.error("O rendimento deve ser um número inteiro maior que zero");
      return;
    }
    if (ingredients.length === 0) {
      toast.error("Adicione pelo menos um ingrediente");
      return;
    }

    setBusy(true);
    const { error } = await supabase.rpc("save_recipe", {
      p_recipe_id: recipe?.id ?? null,
      p_name: name.trim(),
      p_portions: parsedPortions,
      p_ingredients: ingredients.map((ingredient) => ({
        product_id: ingredient.productId,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      })) as Json,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(recipe ? "Receita atualizada" : "Receita criada");
    await queryClient.invalidateQueries({ queryKey: ["recipes"] });
    await queryClient.invalidateQueries({ queryKey: ["home-recent-recipes"] });
    await queryClient.invalidateQueries({ queryKey: ["pending-products"] });
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    await queryClient.invalidateQueries({ queryKey: ["recipe-inventory-products"] });
    onSaved();
  }

  return (
    <form onSubmit={saveRecipe} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{recipe ? "Editar receita" : "Nova receita"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="recipe-name">Nome da receita</Label>
        <Input
          id="recipe-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
          autoFocus
        />
      </div>

      <div className="max-w-48 space-y-2">
        <Label htmlFor="recipe-portions">Rendimento (porções)</Label>
        <Input
          id="recipe-portions"
          type="number"
          min="1"
          step="1"
          value={portions}
          onChange={(event) => setPortions(event.target.value)}
          required
        />
      </div>

      <section className="space-y-3 rounded-xl border p-4">
        <div>
          <h3 className="font-semibold">Ingredientes</h3>
          <p className="text-xs text-muted-foreground">
            Escolha um produto ativo do estoque ou informe outro ingrediente para criar um
            pré-cadastro automaticamente.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-start">
          <div className="relative space-y-2">
            <Label htmlFor="ingredient-name">Ingrediente</Label>
            <Input
              id="ingredient-name"
              value={ingredientName}
              onChange={(event) => {
                const value = event.target.value;
                setIngredientName(value);
                const matchedProduct = products.find(
                  (product) =>
                    product.name.toLocaleLowerCase("pt-BR") ===
                    value.trim().toLocaleLowerCase("pt-BR"),
                );
                if (matchedProduct) setIngredientUnit(matchedProduct.unit);
              }}
              maxLength={120}
              placeholder="Digite para buscar no estoque"
            />
            {ingredientName.trim() && !exactProduct && suggestions.length > 0 && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
                <p className="px-2 text-xs text-muted-foreground">Produtos do estoque</p>
                {suggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addSuggestedProduct(product)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span>{product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {product.code} · {product.unit}
                      {product.unit === "GR" && product.grams_per_unit !== null
                        ? ` · 1 UN = ${product.grams_per_unit} GR`
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ingredient-quantity">Quantidade</Label>
            <Input
              id="ingredient-quantity"
              type="number"
              min="1"
              step="1"
              value={ingredientQuantity}
              onChange={(event) => setIngredientQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            {exactProduct ? (
              recipeUnitsForProduct(exactProduct).length === 1 ? (
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                  {exactProduct.unit}
                </div>
              ) : (
                <Select
                  value={ingredientUnit}
                  onValueChange={(value) => setIngredientUnit(value as Unit)}
                >
                  <SelectTrigger aria-label="Unidade do ingrediente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recipeUnitsForProduct(exactProduct).map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            ) : (
              <Select
                value={freeIngredientUnit}
                onValueChange={(value) => setFreeIngredientUnit(value as Unit)}
              >
                <SelectTrigger aria-label="Unidade do ingrediente livre">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN</SelectItem>
                  <SelectItem value="GR">GR</SelectItem>
                  <SelectItem value="ML">ML</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="sm:pt-6">
            <Button
              type="button"
              aria-label="Adicionar ingrediente à receita"
              onClick={() => addIngredient()}
            >
              <Plus aria-hidden="true" />
              <span className="sm:hidden">Adicionar ingrediente</span>
            </Button>
          </div>
        </div>
        {exactProduct?.unit === "GR" && exactProduct.grams_per_unit !== null && (
          <p className="text-xs text-muted-foreground">
            Estoque em GR · 1 UN equivale a {exactProduct.grams_per_unit} GR.
          </p>
        )}

        {!products.length && !ingredientName.trim() && (
          <p className="text-xs text-muted-foreground">
            Não há produtos ativos disponíveis no estoque para vincular.
          </p>
        )}

        {ingredients.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {ingredients.map((ingredient) => {
              const product = products.find((item) => item.id === ingredient.productId);
              const stockEquivalent = stockGramsForIngredient(
                ingredient.quantity,
                ingredient.unit,
                product,
              );

              return (
                <li key={ingredient.key} className="flex items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{ingredient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ingredient.productId ? "Do estoque" : "Não cadastrado no estoque"}
                      {stockEquivalent ? ` · ${stockEquivalent}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono">
                    {formatQty(ingredient.quantity, ingredient.unit)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${ingredient.name}`}
                    onClick={() =>
                      setIngredients((current) =>
                        current.filter((item) => item.key !== ingredient.key),
                      )
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Salvando…" : recipe ? "Salvar alterações" : "Criar receita"}
        </Button>
      </div>
    </form>
  );
}

export function RecipesPage({ email, userId }: { email: string; userId: string }) {
  const queryClient = useQueryClient();
  const recipes = useRecipes();
  const inventoryProducts = useInventoryProducts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const recipeList = recipes.data ?? [];

  function openNewRecipe() {
    setEditingRecipe(null);
    setFormOpen(true);
  }

  function openEditRecipe(recipe: Recipe) {
    setEditingRecipe(recipe);
    setFormOpen(true);
  }

  async function deleteRecipe() {
    if (!deletingRecipe) return;
    setDeleteBusy(true);
    const { data, error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", deletingRecipe.id)
      .select("id")
      .maybeSingle();
    setDeleteBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Não foi possível excluir esta receita. Somente quem a criou pode excluí-la.");
      return;
    }

    toast.success("Receita excluída");
    setDeletingRecipe(null);
    await queryClient.invalidateQueries({ queryKey: ["recipes"] });
    await queryClient.invalidateQueries({ queryKey: ["home-recent-recipes"] });
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-10 pt-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Receitas</h1>
          <p className="max-w-[220px] truncate text-xs text-muted-foreground sm:max-w-none">
            Compartilhadas com a equipe · {email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNewRecipe}>
            <Plus aria-hidden="true" />
            <span className="hidden sm:inline">Nova receita</span>
            <span className="sm:hidden">Nova</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Sair"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main>
        {inventoryProducts.isError && (
          <p
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
          >
            Não foi possível carregar os produtos do estoque. Ingredientes livres ainda podem ser
            informados.
          </p>
        )}

        {recipes.isLoading ? (
          <p className="py-16 text-center text-muted-foreground">Carregando receitas…</p>
        ) : recipes.isError ? (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-card p-8 text-center"
          >
            <p className="font-medium text-destructive">Não foi possível carregar as receitas.</p>
            <Button className="mt-4" variant="outline" onClick={() => void recipes.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : recipeList.length === 0 ? (
          <section className="rounded-2xl border border-dashed bg-card p-10 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <ChefHat className="size-7" aria-hidden="true" />
            </div>
            <h2 className="font-display text-xl font-semibold">Nenhuma receita cadastrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie sua primeira receita com ingredientes do estoque ou ingredientes livres.
            </p>
            <Button className="mt-5" onClick={openNewRecipe}>
              <Plus aria-hidden="true" />
              Criar receita
            </Button>
          </section>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {recipeList.map((recipe) => (
              <li key={recipe.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-xl font-semibold">{recipe.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Rende {recipe.portions} {recipe.portions === 1 ? "porção" : "porções"}
                      {" · "}por {recipe.created_by_email || "usuário"}
                    </p>
                  </div>
                  {recipe.created_by === userId && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar receita ${recipe.name}`}
                        onClick={() => openEditRecipe(recipe)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Excluir receita ${recipe.name}`}
                        onClick={() => setDeletingRecipe(recipe)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t pt-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ingredientes
                  </h3>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient) => {
                      const product = inventoryProducts.data?.find(
                        (item) => item.id === ingredient.product_id,
                      );
                      const stockEquivalent = stockGramsForIngredient(
                        ingredient.quantity,
                        ingredient.unit,
                        product,
                      );

                      return (
                        <li
                          key={ingredient.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            {ingredient.name}
                            {!ingredient.product_id && (
                              <span className="ml-2 text-xs text-muted-foreground">livre</span>
                            )}
                          </span>
                          <span className="shrink-0 text-right font-mono text-muted-foreground">
                            {formatQty(ingredient.quantity, ingredient.unit)}
                            {stockEquivalent && (
                              <span className="block text-xs font-sans">{stockEquivalent}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRecipe(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <RecipeForm
            key={editingRecipe?.id ?? "new"}
            products={inventoryProducts.data ?? []}
            recipe={editingRecipe}
            onCancel={() => setFormOpen(false)}
            onSaved={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletingRecipe !== null}
        onOpenChange={(open) => !open && setDeletingRecipe(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              A receita “{deletingRecipe?.name}” e seus ingredientes serão excluídos
              permanentemente. Essa ação não altera o estoque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteRecipe();
              }}
            >
              {deleteBusy ? "Excluindo…" : "Excluir receita"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
