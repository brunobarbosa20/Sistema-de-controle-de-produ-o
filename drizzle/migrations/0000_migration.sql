CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'UN' CHECK (unit IN ('UN','KG')),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products select" ON public.products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own products insert" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own products update" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own products delete" ON public.products FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('entrada','saida')),
  quantity numeric(14,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.movements TO authenticated;
GRANT ALL ON public.movements TO service_role;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own movements select" ON public.movements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own movements insert" ON public.movements FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid())
);
CREATE INDEX movements_product_idx ON public.movements(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_movement()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
END $$;
CREATE TRIGGER movements_apply BEFORE INSERT ON public.movements
FOR EACH ROW EXECUTE FUNCTION public.apply_movement();