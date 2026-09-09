-- El campo "previewVideoUrl" se agregó a la entidad Game después de que la
-- tabla `games` ya tenía filas cargadas a mano (con cover_image_url, genre,
-- developer, etc.), así que esas filas existentes quedaron con
-- preview_video_url en NULL. Por eso ninguna tarjeta mostraba el preview de
-- video al pasar el mouse ni en "Más jugado ahora": el frontend solo activa
-- el preview cuando ese campo viene con un valor (ver game-card en
-- components.js / home.js).
--
-- AssetConfig sirve la carpeta lowlootgames/ bajo /assets/**, así que la
-- ruta relativa acá es la misma que ya usan los cover_image_url existentes
-- (resolveAssetUrl en game-store.js le agrega el host de la API adelante).

ALTER TABLE public.games
    ADD COLUMN IF NOT EXISTS preview_video_url VARCHAR(500);

UPDATE public.games
SET preview_video_url = 'assets/forager/assets/FORAGER.mp4'
WHERE name ILIKE '%forager%'
  AND (preview_video_url IS NULL OR preview_video_url = '');

UPDATE public.games
SET preview_video_url = 'assets/stardew/Assets/STARDEW.mp4'
WHERE name ILIKE '%stardew%'
  AND (preview_video_url IS NULL OR preview_video_url = '');

UPDATE public.games
SET preview_video_url = 'assets/terraria/assets/TERRARIA.mp4'
WHERE name ILIKE '%terraria%'
  AND (preview_video_url IS NULL OR preview_video_url = '');

UPDATE public.games
SET preview_video_url = 'assets/ultrakill/assets/ULTRAKILL.mp4'
WHERE name ILIKE '%ultrakill%'
  AND (preview_video_url IS NULL OR preview_video_url = '');
