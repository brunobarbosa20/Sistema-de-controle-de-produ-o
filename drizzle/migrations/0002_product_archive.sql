ALTER TABLE public.products
  ADD COLUMN active boolean NOT NULL DEFAULT true;

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

  IF NOT p_active AND product.quantity <> 0 THEN
    RAISE EXCEPTION 'Zere o saldo do produto antes de inativá-lo'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.products SET active = p_active WHERE id = p_product_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_product_active(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_product_active(uuid, boolean) TO authenticated;

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
  IF product.unit = 'UN' AND NEW.quantity <> trunc(NEW.quantity) THEN
    RAISE EXCEPTION 'Produtos em UN aceitam apenas quantidades inteiras';
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
