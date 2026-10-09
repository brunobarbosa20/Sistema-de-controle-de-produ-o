ALTER TABLE public.products RENAME COLUMN user_id TO created_by;
ALTER TABLE public.products ADD COLUMN created_by_email text;
UPDATE public.products AS p
SET created_by_email = COALESCE(u.email, '')
FROM auth.users AS u
WHERE u.id = p.created_by;
UPDATE public.products SET created_by_email = '' WHERE created_by_email IS NULL;
ALTER TABLE public.products ALTER COLUMN created_by_email SET DEFAULT '';
ALTER TABLE public.products ALTER COLUMN created_by_email SET NOT NULL;

ALTER TABLE public.movements RENAME COLUMN user_id TO created_by;
ALTER TABLE public.movements ADD COLUMN created_by_email text;
UPDATE public.movements AS m
SET created_by_email = COALESCE(u.email, '')
FROM auth.users AS u
WHERE u.id = m.created_by;
UPDATE public.movements SET created_by_email = '' WHERE created_by_email IS NULL;
ALTER TABLE public.movements ALTER COLUMN created_by_email SET DEFAULT '';
ALTER TABLE public.movements ALTER COLUMN created_by_email SET NOT NULL;

DROP POLICY "own products select" ON public.products;
DROP POLICY "own products insert" ON public.products;
DROP POLICY "own products update" ON public.products;
DROP POLICY "own products delete" ON public.products;
DROP POLICY "own movements select" ON public.movements;
DROP POLICY "own movements insert" ON public.movements;

ALTER TABLE public.movements DROP CONSTRAINT movements_product_id_fkey;
ALTER TABLE public.movements
  ADD CONSTRAINT movements_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

CREATE TABLE public.inventory_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inventory_members TO authenticated;

CREATE OR REPLACE FUNCTION public.has_inventory_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.inventory_members AS member
    WHERE member.user_id = auth.uid()
      AND CASE member.role
        WHEN 'admin' THEN 3
        WHEN 'operator' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 0
      END >= CASE required_role
        WHEN 'admin' THEN 3
        WHEN 'operator' THEN 2
        WHEN 'viewer' THEN 1
        ELSE 4
      END
  );
$$;
REVOKE ALL ON FUNCTION public.has_inventory_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_inventory_role(text) TO authenticated;

CREATE POLICY "members read own or admin"
  ON public.inventory_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_inventory_role('admin'));

CREATE OR REPLACE FUNCTION public.sync_inventory_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.inventory_members (user_id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'viewer')
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auth_user_sync_inventory_member
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_member();

CREATE OR REPLACE FUNCTION public.protect_last_inventory_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  admin_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('inventory_role_changes'));
  IF EXISTS (
    SELECT 1
    FROM public.inventory_members
    WHERE user_id = OLD.id AND role = 'admin'
  ) THEN
    SELECT count(*) INTO admin_count
    FROM public.inventory_members
    WHERE role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Promova outro usuário a administrador antes de remover esta conta';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER auth_user_protect_last_inventory_admin
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.protect_last_inventory_admin();

INSERT INTO public.inventory_members (user_id, email, role)
SELECT id, COALESCE(email, ''), 'viewer'
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower('bruno@teste.com')
  ) THEN
    RAISE EXCEPTION 'Initial administrator bruno@teste.com was not found in auth.users';
  END IF;
END;
$$;

UPDATE public.inventory_members
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE lower(email) = lower('bruno@teste.com')
);

CREATE OR REPLACE FUNCTION public.set_inventory_role(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_role text;
  admin_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_inventory_role('admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar os níveis de acesso'
      USING ERRCODE = '42501';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('admin', 'operator', 'viewer') THEN
    RAISE EXCEPTION 'Nível de acesso inválido';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('inventory_role_changes'));

  SELECT role INTO current_role
  FROM public.inventory_members
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado no estoque';
  END IF;

  IF current_role = 'admin' AND p_role <> 'admin' THEN
    SELECT count(*) INTO admin_count
    FROM public.inventory_members
    WHERE role = 'admin';
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'O estoque precisa manter pelo menos um administrador';
    END IF;
  END IF;

  UPDATE public.inventory_members SET role = p_role WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_inventory_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_inventory_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_inventory_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE creator_email text;
BEGIN
  SELECT email INTO creator_email FROM auth.users WHERE id = auth.uid();
  NEW.created_by := auth.uid();
  NEW.created_by_email := COALESCE(creator_email, '');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_inventory_creator() FROM PUBLIC;

CREATE TRIGGER products_set_creator
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_inventory_creator();
CREATE TRIGGER movements_set_creator
  BEFORE INSERT ON public.movements
  FOR EACH ROW EXECUTE FUNCTION public.set_inventory_creator();

CREATE POLICY "shared products read"
  ON public.products FOR SELECT TO authenticated
  USING (public.has_inventory_role('viewer'));
CREATE POLICY "operators create products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_inventory_role('operator') AND created_by = auth.uid());
CREATE POLICY "operators update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.has_inventory_role('operator'))
  WITH CHECK (public.has_inventory_role('operator'));

CREATE POLICY "shared movements read"
  ON public.movements FOR SELECT TO authenticated
  USING (public.has_inventory_role('viewer'));
CREATE POLICY "operators create movements"
  ON public.movements FOR INSERT TO authenticated
  WITH CHECK (
    public.has_inventory_role('operator')
    AND created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.products AS product WHERE product.id = product_id)
  );

REVOKE INSERT, UPDATE, DELETE ON public.products FROM authenticated;
GRANT INSERT (name, unit, unit_price) ON public.products TO authenticated;
GRANT UPDATE (name, unit, unit_price) ON public.products TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.movements FROM authenticated;
GRANT INSERT (product_id, type, quantity, unit_price, note) ON public.movements TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE p public.products%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  IF p.unit = 'UN' AND NEW.quantity <> trunc(NEW.quantity) THEN
    RAISE EXCEPTION 'Produtos em UN aceitam apenas quantidades inteiras';
  END IF;
  IF NEW.type = 'saida' THEN
    IF p.quantity < NEW.quantity THEN
      RAISE EXCEPTION 'Saldo insuficiente (disponível: %)', p.quantity;
    END IF;
    UPDATE public.products SET quantity = quantity - NEW.quantity WHERE id = p.id;
  ELSE
    UPDATE public.products SET quantity = quantity + NEW.quantity WHERE id = p.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_movement() FROM PUBLIC, anon, authenticated;

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
  IF p_unit NOT IN ('UN', 'KG') THEN
    RAISE EXCEPTION 'Unidade inválida';
  END IF;
  IF p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'Valor unitário inválido';
  END IF;
  IF p_initial_quantity IS NOT NULL AND p_initial_quantity <= 0 THEN
    RAISE EXCEPTION 'O saldo inicial precisa ser maior que zero';
  END IF;
  IF p_unit = 'UN' AND p_initial_quantity IS NOT NULL
    AND p_initial_quantity <> trunc(p_initial_quantity) THEN
    RAISE EXCEPTION 'Produtos em UN aceitam apenas quantidades inteiras';
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
REVOKE ALL ON FUNCTION public.create_inventory_product(text, text, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_product(text, text, numeric, numeric) TO authenticated;
