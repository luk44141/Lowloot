-- Perfil de usuario (nombre visible + foto de perfil).
--
-- display_name: nombre que se muestra en la UI, independiente de
-- `username` (que sigue siendo el identificador de la cuenta y no se toca
-- desde acá). Si un usuario nunca lo configuró queda en NULL y el backend
-- devuelve el username como valor por defecto (ver ProfileController /
-- MeController), sin necesidad de rellenar la columna con un valor duplicado.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(50);

-- Foto de perfil en tabla aparte (no en `users`) para que JwtAuthFilter no
-- tenga que cargar un BYTEA en cada request autenticado, que es lo único
-- que necesita a `users` en cada llamada. Un usuario sin fila acá todavía
-- no tiene foto personalizada: el launcher usa
-- lowloot-launcher/assets/profile/default-profile.png en ese caso, y esa
-- imagen default nunca se guarda en la base.
CREATE TABLE IF NOT EXISTS public.user_avatars (
    user_id BIGINT PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
    image_data BYTEA NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'image/png',
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
