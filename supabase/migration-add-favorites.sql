-- ============================================
-- TABLA: pet_favorites (Favoritos de Mascotas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL, -- Email del usuario (usando email porque no hay tabla de usuarios)
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_email, pet_id) -- Evitar duplicados
);

-- Índices para pet_favorites
CREATE INDEX IF NOT EXISTS pet_favorites_user_email_idx ON public.pet_favorites(user_email);
CREATE INDEX IF NOT EXISTS pet_favorites_pet_id_idx ON public.pet_favorites(pet_id);
CREATE INDEX IF NOT EXISTS pet_favorites_created_at_idx ON public.pet_favorites(created_at DESC);

-- Política RLS: Los usuarios solo pueden ver sus propios favoritos
ALTER TABLE public.pet_favorites ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Los usuarios pueden ver sus propios favoritos
CREATE POLICY "Users can view their own favorites"
  ON public.pet_favorites
  FOR SELECT
  USING (true); -- Por ahora permitir ver todos (se puede restringir después con Auth0)

-- Política para INSERT: Los usuarios pueden agregar favoritos
CREATE POLICY "Users can insert their own favorites"
  ON public.pet_favorites
  FOR INSERT
  WITH CHECK (true); -- Por ahora permitir insertar (se puede restringir después con Auth0)

-- Política para DELETE: Los usuarios pueden eliminar sus propios favoritos
CREATE POLICY "Users can delete their own favorites"
  ON public.pet_favorites
  FOR DELETE
  USING (true); -- Por ahora permitir eliminar (se puede restringir después con Auth0)

