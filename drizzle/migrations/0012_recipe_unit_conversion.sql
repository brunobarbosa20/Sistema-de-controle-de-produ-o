ALTER TABLE public.products
  ADD COLUMN grams_per_unit integer,
  ADD CONSTRAINT products_grams_per_unit_check
    CHECK (grams_per_unit IS NULL OR (unit = 'GR' AND grams_per_unit > 0));

GRANT UPDATE (grams_per_unit) ON public.products TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_removing_recipe_unit_conversion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.grams_per_unit IS NOT NULL
    AND NEW.grams_per_unit IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.recipe_ingredients
      WHERE product_id = OLD.id
        AND unit = 'UN'
    ) THEN
    RAISE EXCEPTION 'Este produto é usado como UN em receitas; mantenha o peso por unidade configurado';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER products_prevent_removing_recipe_unit_conversion
  BEFORE UPDATE OF grams_per_unit ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_removing_recipe_unit_conversion();

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
  product_name_exists boolean;
  matched_product public.products%ROWTYPE;
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
    IF ingredient_unit NOT IN ('UN', 'GR', 'ML') THEN
      RAISE EXCEPTION 'Unidade inválida para o ingrediente %', ingredient_name;
    END IF;
    IF ingredient_quantity IS NULL OR ingredient_quantity <= 0
      OR ingredient_quantity <> trunc(ingredient_quantity)
      OR ingredient_quantity > 2147483647 THEN
      RAISE EXCEPTION 'A quantidade de % deve ser um número inteiro maior que zero',
        ingredient_name;
    END IF;

    IF ingredient_product_id IS NOT NULL THEN
      SELECT * INTO matched_product
      FROM public.products
      WHERE id = ingredient_product_id
        AND active
        AND NOT cancelled
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'O produto selecionado não existe ou está inativo';
      END IF;
      IF matched_product.name <> ingredient_name THEN
        RAISE EXCEPTION 'O nome deve corresponder ao produto selecionado no estoque';
      END IF;
      IF matched_product.unit <> ingredient_unit
        AND NOT (
          matched_product.unit = 'GR'
          AND ingredient_unit = 'UN'
          AND matched_product.grams_per_unit IS NOT NULL
        ) THEN
        RAISE EXCEPTION 'A unidade da receita não corresponde ao estoque; configure os gramas por unidade para usar UN';
      END IF;
    ELSE
      PERFORM pg_advisory_xact_lock(
        hashtextextended('recipe_pre_registration:' || lower(ingredient_name), 0)
      );

      SELECT * INTO matched_product
      FROM public.products
      WHERE lower(trim(name)) = lower(ingredient_name)
        AND unit = ingredient_unit
        AND active
        AND NOT cancelled
      ORDER BY pending_registration, created_at, id
      LIMIT 1
      FOR UPDATE;

      IF FOUND THEN
        ingredient_product_id := matched_product.id;
      ELSE
        SELECT EXISTS (
          SELECT 1
          FROM public.products
          WHERE lower(trim(name)) = lower(ingredient_name)
        ) INTO product_name_exists;

        IF NOT product_name_exists THEN
          INSERT INTO public.products (name, unit, pending_registration)
          VALUES (ingredient_name, ingredient_unit, true)
          RETURNING id INTO ingredient_product_id;
        END IF;
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
