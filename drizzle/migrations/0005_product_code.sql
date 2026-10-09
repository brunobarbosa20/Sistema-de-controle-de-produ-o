DO $$
DECLARE
  product_count bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'active'
  ) THEN
    RAISE EXCEPTION 'Aplique as migrações de estoque até 0004_entry_only_prices.sql antes desta migração';
  END IF;

  SELECT count(*) INTO product_count FROM public.products;
  IF product_count > 99999999 THEN
    RAISE EXCEPTION 'Não é possível atribuir códigos MP: limite de 99.999.999 produtos excedido';
  END IF;
END;
$$;

CREATE SEQUENCE public.product_code_seq
  AS bigint
  MINVALUE 1
  MAXVALUE 99999999
  START WITH 1
  NO CYCLE;

ALTER TABLE public.products
  ADD COLUMN code text;

WITH numbered_products AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at, id) AS number
  FROM public.products
)
UPDATE public.products AS product
SET code = 'MP' || lpad(numbered_products.number::text, 8, '0')
FROM numbered_products
WHERE product.id = numbered_products.id;

SELECT setval(
  'public.product_code_seq'::regclass,
  COALESCE(MAX(substring(code FROM 3)::bigint), 1),
  count(*) > 0
)
FROM public.products;

ALTER TABLE public.products
  ALTER COLUMN code SET DEFAULT (
    'MP' || lpad(nextval('public.product_code_seq'::regclass)::text, 8, '0')
  ),
  ALTER COLUMN code SET NOT NULL,
  ADD CONSTRAINT products_code_format_check CHECK (code ~ '^MP[0-9]{8}$'),
  ADD CONSTRAINT products_code_unique UNIQUE (code);

DROP FUNCTION public.create_inventory_product(text, text, numeric);

CREATE FUNCTION public.create_inventory_product(
  p_name text,
  p_unit text,
  p_initial_quantity numeric DEFAULT NULL
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

  INSERT INTO public.products (name, unit)
  VALUES (trim(p_name), p_unit)
  RETURNING id, code INTO new_product_id, new_product_code;

  IF p_initial_quantity IS NOT NULL THEN
    INSERT INTO public.movements (product_id, type, quantity, unit_price, note)
    VALUES (new_product_id, 'entrada', p_initial_quantity, 0, 'Saldo inicial');
  END IF;

  RETURN new_product_code;
END;
$$;

REVOKE ALL ON FUNCTION public.create_inventory_product(text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_product(text, text, numeric) TO authenticated;

NOTIFY pgrst, 'reload schema';
