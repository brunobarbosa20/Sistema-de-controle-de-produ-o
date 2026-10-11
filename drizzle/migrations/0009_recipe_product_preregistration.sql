ALTER TABLE public.products
  ADD COLUMN pending_registration boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_product_active(p_product_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product public.products%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_inventory_role('operator') THEN
    RAISE EXCEPTION 'Apenas operadores e administradores podem alterar produtos'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  IF product.pending_registration THEN
    RAISE EXCEPTION 'Finalize o pré-cadastro antes de alterar a situação';
  END IF;
  IF product.cancelled THEN
    RAISE EXCEPTION 'Restaure o produto cancelado antes de alterar sua situação';
  END IF;
  IF NOT p_active AND product.quantity <> 0 THEN
    RAISE EXCEPTION 'Zere o saldo do produto antes de inativá-lo'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.products SET active = p_active WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product public.products%ROWTYPE;
BEGIN
  SELECT * INTO product
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  IF product.cancelled THEN
    RAISE EXCEPTION 'Não é possível movimentar um produto cancelado';
  END IF;
  IF product.pending_registration THEN
    RAISE EXCEPTION 'Finalize o pré-cadastro antes de movimentar o produto';
  END IF;
  IF NOT product.active THEN
    RAISE EXCEPTION 'Não é possível movimentar um produto inativo';
  END IF;
  IF product.unit = 'UN' AND NEW.quantity <> trunc(NEW.quantity) THEN
    RAISE EXCEPTION 'Produtos em UN aceitam apenas quantidades inteiras';
  END IF;

  IF NEW.type = 'saida' THEN
    NEW.unit_price := 0;
    IF product.quantity < NEW.quantity THEN
      RAISE EXCEPTION 'Saldo insuficiente (disponível: %)', product.quantity;
    END IF;
    UPDATE public.products
    SET quantity = quantity - NEW.quantity
    WHERE id = product.id;
  ELSE
    UPDATE public.products
    SET quantity = quantity + NEW.quantity
    WHERE id = product.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_inventory_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  product public.products%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_inventory_role('operator') THEN
    RAISE EXCEPTION 'Apenas operadores e administradores podem finalizar cadastros'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  IF product.cancelled THEN
    RAISE EXCEPTION 'Não é possível finalizar um produto cancelado';
  END IF;
  IF NOT product.pending_registration THEN
    RAISE EXCEPTION 'Este produto não está aguardando finalização';
  END IF;

  UPDATE public.products
  SET pending_registration = false
  WHERE id = p_product_id;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_inventory_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_inventory_product(uuid) TO authenticated;

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
      SELECT * INTO matched_product
      FROM public.products
      WHERE id = ingredient_product_id
        AND active
        AND NOT cancelled
        AND unit = ingredient_unit;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'O produto selecionado não existe, está inativo ou não corresponde à unidade';
      END IF;
      IF matched_product.name <> ingredient_name THEN
        RAISE EXCEPTION 'O nome deve corresponder ao produto selecionado no estoque';
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
