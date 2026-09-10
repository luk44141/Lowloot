-- Favoritos de Biblioteca: hasta ahora se simulaban solo en memoria del
-- launcher (se perdian al cerrar la app y no dependian del usuario real).
-- Se guardan como un atributo mas de la relacion usuario-juego, ya que
-- `user_games` ya modela exactamente esa relacion (no se crea una tabla
-- nueva para esto).
ALTER TABLE public.user_games
    ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;
