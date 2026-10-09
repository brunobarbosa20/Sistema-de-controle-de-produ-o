DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'code'
  ) THEN
    RAISE EXCEPTION 'Aplique 0005_product_code.sql antes desta migração';
  END IF;
END;
$$;

ALTER TABLE public.products
  ADD COLUMN notes text NOT NULL DEFAULT '';

GRANT UPDATE (name, notes) ON public.products TO authenticated;

DROP FUNCTION public.create_inventory_product(text, text, numeric);

CREATE FUNCTION public.create_inventory_product(
  p_name text,
  p_unit text,
  p_initial_quantity numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_product_id uuid;
  new_product_code text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_inventory_role('operator') THEN
    RAISE EXCEPTION 'Apenas operadores e administradores podem cadastrar produtos'
      USING ERRCODE = '42501';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Informe o nome do produto';
  END IF;
  IF p_unit IS NULL OR p_unit NOT IN ('UN', 'GR') THEN
    RAISE EXCEPTION 'Unidade inválida';
  END IF;
  IF p_initial_quantity IS NOT NULL AND p_initial_quantity <= 0 THEN
    RAISE EXCEPTION 'O saldo inicial precisa ser maior que zero';
  END IF;
  IF p_initial_quantity IS NOT NULL
    AND p_initial_quantity <> trunc(p_initial_quantity) THEN
    RAISE EXCEPTION 'Produtos em UN e GR aceitam apenas quantidades inteiras';
  END IF;

  INSERT INTO public.products (name, unit, notes)
  VALUES (trim(p_name), p_unit, COALESCE(trim(p_notes), ''))
  RETURNING id, code INTO new_product_id, new_product_code;

  IF p_initial_quantity IS NOT NULL THEN
    INSERT INTO public.movements (product_id, type, quantity, unit_price, note)
    VALUES (new_product_id, 'entrada', p_initial_quantity, 0, 'Saldo inicial');
  END IF;

  RETURN new_product_code;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inventory_product(text, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_product(text, text, numeric, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
