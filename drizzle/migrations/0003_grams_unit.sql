DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'active'
  ) THEN
    RAISE EXCEPTION 'Aplique 0002_product_archive.sql antes desta migração';
  END IF;
END;
$$;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_unit_check;
ALTER TABLE public.products
  ALTER COLUMN unit_price TYPE numeric(14, 6);

ALTER TABLE public.movements
  ALTER COLUMN unit_price TYPE numeric(14, 6);

UPDATE public.movements AS movement
SET quantity = movement.quantity * 1000,
    unit_price = movement.unit_price / 1000
FROM public.products AS product
WHERE movement.product_id = product.id
  AND product.unit = 'KG';

UPDATE public.products
SET quantity = quantity * 1000,
    unit_price = unit_price / 1000,
    unit = 'GR'
WHERE unit = 'KG';

ALTER TABLE public.products
  ADD CONSTRAINT products_unit_check CHECK (unit IN ('UN', 'GR'));

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
  IF NOT product.active THEN
    RAISE EXCEPTION 'Não é possível movimentar um produto inativo';
  END IF;
  IF NEW.quantity <> trunc(NEW.quantity) THEN
    RAISE EXCEPTION 'Produtos em UN e GR aceitam apenas quantidades inteiras';
  END IF;

  IF NEW.type = 'saida' THEN
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

CREATE OR REPLACE FUNCTION public.create_inventory_product(
  p_name text,
  p_unit text,
  p_unit_price numeric,
  p_initial_quantity numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_product_id uuid;
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
  IF p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'Valor unitário inválido';
  END IF;
  IF p_initial_quantity IS NOT NULL AND p_initial_quantity <= 0 THEN
    RAISE EXCEPTION 'O saldo inicial precisa ser maior que zero';
  END IF;
  IF p_initial_quantity IS NOT NULL
    AND p_initial_quantity <> trunc(p_initial_quantity) THEN
    RAISE EXCEPTION 'Produtos em UN e GR aceitam apenas quantidades inteiras';
  END IF;

  INSERT INTO public.products (name, unit, unit_price)
  VALUES (trim(p_name), p_unit, p_unit_price)
  RETURNING id INTO new_product_id;

  IF p_initial_quantity IS NOT NULL THEN
    INSERT INTO public.movements (product_id, type, quantity, unit_price, note)
    VALUES (new_product_id, 'entrada', p_initial_quantity, p_unit_price, 'Saldo inicial');
  END IF;

  RETURN new_product_id;
END;
$$;
