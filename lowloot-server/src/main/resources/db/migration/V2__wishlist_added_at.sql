-- La tabla `wishlist` ya existia en la base real (id, user_id, game_id,
-- UNIQUE(user_id, game_id)), pero sin fecha de agregado. El launcher ya
-- necesita ordenar la wishlist por "fecha agregada", asi que sumamos la
-- columna sin tocar filas existentes ni recrear la tabla.
ALTER TABLE public.wishlist
    ADD COLUMN IF NOT EXISTS added_at timestamp without time zone
        DEFAULT CURRENT_TIMESTAMP NOT NULL;
