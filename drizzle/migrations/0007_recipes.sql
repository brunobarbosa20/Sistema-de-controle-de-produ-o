CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  portions integer NOT NULL CHECK (portions > 0),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_by_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (unit IN ('UN', 'GR')),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0)
);

CREATE INDEX recipes_created_at_idx ON public.recipes(created_at DESC);
CREATE INDEX recipe_ingredients_recipe_idx
  ON public.recipe_ingredients(recipe_id, position);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users read recipes"
  ON public.recipes FOR SELECT TO authenticated USING (true);
CREATE POLICY "recipe owners delete recipes"
  ON public.recipes FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "authenticated users read recipe ingredients"
  ON public.recipe_ingredients FOR SELECT TO authenticated USING (true);

GRANT SELECT, DELETE ON public.recipes TO authenticated;
GRANT SELECT ON public.recipe_ingredients TO authenticated;

CREATE OR REPLACE FUNCTION public.save_recipe(
  p_recipe_id uuid,
  p_name text,
  p_portions integer,
  p_ingredients jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  saved_recipe_id uuid;
  creator_email text;
  item jsonb;
  ingredient_name text;
  ingredient_unit text;
  ingredient_quantity numeric;
  ingredient_product_id uuid;
  inventory_product public.products%ROWTYPE;
  item_position integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário entrar para salvar receitas'
      USING ERRCODE = '42501';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'O nome da receita deve ter entre 1 e 120 caracteres';
  END IF;
  IF p_portions IS NULL OR p_portions <= 0 THEN
    RAISE EXCEPTION 'Informe uma quantidade de porções maior que zero';
  END IF;
  IF p_ingredients IS NULL
    OR jsonb_typeof(p_ingredients) <> 'array'
    OR jsonb_array_length(p_ingredients) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos um ingrediente';
  END IF;

  IF p_recipe_id IS NULL THEN
    SELECT email INTO creator_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.recipes (name, portions, created_by, created_by_email)
    VALUES (trim(p_name), p_portions, auth.uid(), COALESCE(creator_email, ''))
    RETURNING id INTO saved_recipe_id;
  ELSE
    UPDATE public.recipes
    SET name = trim(p_name), portions = p_portions, updated_at = now()
    WHERE id = p_recipe_id AND created_by = auth.uid()
    RETURNING id INTO saved_recipe_id;

    IF saved_recipe_id IS NULL THEN
      RAISE EXCEPTION 'Receita não encontrada ou você não tem permissão para editá-la'
        USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.recipe_ingredients WHERE recipe_id = saved_recipe_id;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_ingredients)
  LOOP
    ingredient_name := trim(COALESCE(item->>'name', ''));
    ingredient_unit := item->>'unit';
    ingredient_quantity := NULLIF(item->>'quantity', '')::numeric;
    ingredient_product_id := NULLIF(item->>'product_id', '')::uuid;

    IF length(ingredient_name) NOT BETWEEN 1 AND 120 THEN
      RAISE EXCEPTION 'O nome de cada ingrediente deve ter entre 1 e 120 caracteres';
    END IF;
    IF ingredient_unit NOT IN ('UN', 'GR') THEN
      RAISE EXCEPTION 'Unidade inválida para o ingrediente %', ingredient_name;
    END IF;
    IF ingredient_quantity IS NULL OR ingredient_quantity <= 0
      OR ingredient_quantity <> trunc(ingredient_quantity)
      OR ingredient_quantity > 2147483647 THEN
      RAISE EXCEPTION 'A quantidade de % deve ser um número inteiro maior que zero',
        ingredient_name;
    END IF;

    IF ingredient_product_id IS NOT NULL THEN
      SELECT * INTO inventory_product
      FROM public.products
      WHERE id = ingredient_product_id AND active;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'O produto selecionado não existe ou está inativo';
      END IF;
      IF inventory_product.name <> ingredient_name
        OR inventory_product.unit <> ingredient_unit THEN
        RAISE EXCEPTION 'O nome e a unidade devem corresponder ao produto selecionado no estoque';
      END IF;
    END IF;

    INSERT INTO public.recipe_ingredients (
      recipe_id, product_id, name, quantity, unit, position
    )
    VALUES (
      saved_recipe_id, ingredient_product_id, ingredient_name,
      ingredient_quantity::integer, ingredient_unit, item_position
    );
    item_position := item_position + 1;
  END LOOP;

  RETURN saved_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_recipe(uuid, text, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_recipe(uuid, text, integer, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
