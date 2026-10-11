DO $$
DECLARE
  ingredient record;
  matching_product_id uuid;
  original_jwt_sub text := current_setting('request.jwt.claim.sub', true);
BEGIN
  FOR ingredient IN
    SELECT
      lower(trim(ri.name)) AS normalized_name,
      min(trim(ri.name)) AS name,
      ri.unit,
      (array_agg(r.created_by ORDER BY r.created_at, r.id))[1] AS creator_id
    FROM public.recipe_ingredients AS ri
    JOIN public.recipes AS r ON r.id = ri.recipe_id
    WHERE ri.product_id IS NULL
    GROUP BY lower(trim(ri.name)), ri.unit
    ORDER BY lower(trim(ri.name)), ri.unit
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtextextended('recipe_pre_registration:' || ingredient.normalized_name, 0)
    );

    SELECT product.id INTO matching_product_id
    FROM public.products AS product
    WHERE lower(trim(product.name)) = ingredient.normalized_name
      AND product.unit = ingredient.unit
      AND product.active
      AND NOT product.cancelled
    ORDER BY product.pending_registration, product.created_at, product.id
    LIMIT 1
    FOR UPDATE;

    IF matching_product_id IS NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM public.products AS product
        WHERE lower(trim(product.name)) = ingredient.normalized_name
      ) THEN
        PERFORM set_config(
          'request.jwt.claim.sub',
          ingredient.creator_id::text,
          true
        );

        INSERT INTO public.products (name, unit, pending_registration)
        VALUES (ingredient.name, ingredient.unit, true)
        RETURNING id INTO matching_product_id;
      END IF;
    END IF;

    IF matching_product_id IS NOT NULL THEN
      UPDATE public.recipe_ingredients AS ri
      SET product_id = matching_product_id
      WHERE ri.product_id IS NULL
        AND lower(trim(ri.name)) = ingredient.normalized_name
        AND ri.unit = ingredient.unit;
    END IF;
  END LOOP;

  PERFORM set_config(
    'request.jwt.claim.sub',
    COALESCE(original_jwt_sub, ''),
    true
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
