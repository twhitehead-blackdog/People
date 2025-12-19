-- ============================================
-- Datos Iniciales: Razas de Perros y Gatos
-- Ejecuta este archivo después de pet-breeds-schema.sql
-- ============================================

-- Limpiar datos existentes (opcional, comentar si quieres mantener datos existentes)
-- DELETE FROM public.pet_breeds;

-- ============================================
-- RAZAS DE PERROS
-- ============================================
INSERT INTO public.pet_breeds (name, species, is_active, display_order) VALUES
-- Razas grandes
('Labrador Retriever', 'dog', true, 1),
('Golden Retriever', 'dog', true, 2),
('Pastor Alemán', 'dog', true, 3),
('Bulldog', 'dog', true, 4),
('Rottweiler', 'dog', true, 5),
('Doberman', 'dog', true, 6),
('Boxer', 'dog', true, 7),
('Gran Danés', 'dog', true, 8),
('San Bernardo', 'dog', true, 9),
('Mastín', 'dog', true, 10),
('Husky Siberiano', 'dog', true, 11),
('Alaskan Malamute', 'dog', true, 12),
('Pastor Belga', 'dog', true, 13),
('Pastor Australiano', 'dog', true, 14),
('Border Collie', 'dog', true, 15),
('Dálmata', 'dog', true, 16),
('Weimaraner', 'dog', true, 17),
('Pointer', 'dog', true, 18),
('Setter Irlandés', 'dog', true, 19),
('Braco Alemán', 'dog', true, 20),

-- Razas medianas
('Beagle', 'dog', true, 21),
('Cocker Spaniel', 'dog', true, 22),
('Bulldog Francés', 'dog', true, 23),
('Shar Pei', 'dog', true, 24),
('Chow Chow', 'dog', true, 25),
('Shiba Inu', 'dog', true, 26),
('Akita', 'dog', true, 27),
('Basenji', 'dog', true, 28),
('Whippet', 'dog', true, 29),
('Greyhound', 'dog', true, 30),
('Saluki', 'dog', true, 31),
('Basset Hound', 'dog', true, 32),
('Dachshund', 'dog', true, 33),
('Pembroke Welsh Corgi', 'dog', true, 34),
('Cardigan Welsh Corgi', 'dog', true, 35),
('Bulldog Inglés', 'dog', true, 36),
('Staffordshire Bull Terrier', 'dog', true, 37),
('American Pit Bull Terrier', 'dog', true, 38),
('Bull Terrier', 'dog', true, 39),
('Airedale Terrier', 'dog', true, 40),

-- Razas pequeñas
('Chihuahua', 'dog', true, 41),
('Yorkshire Terrier', 'dog', true, 42),
('Pomerania', 'dog', true, 43),
('Shih Tzu', 'dog', true, 44),
('Pug', 'dog', true, 45),
('Maltés', 'dog', true, 46),
('Bichón Frisé', 'dog', true, 47),
('Cavalier King Charles Spaniel', 'dog', true, 48),
('King Charles Spaniel', 'dog', true, 49),
('Pinscher Miniatura', 'dog', true, 50),
('Schnauzer Miniatura', 'dog', true, 51),
('West Highland White Terrier', 'dog', true, 52),
('Scottish Terrier', 'dog', true, 53),
('Jack Russell Terrier', 'dog', true, 54),
('Fox Terrier', 'dog', true, 55),
('Boston Terrier', 'dog', true, 56),
('French Bulldog', 'dog', true, 57),
('Poodle Miniatura', 'dog', true, 58),
('Poodle Toy', 'dog', true, 59),
('Caniche', 'dog', true, 60),

-- Razas mixtas comunes (para referencia)
('Mestizo', 'dog', true, 100),
('Criollo', 'dog', true, 101),
('Sin raza específica', 'dog', true, 102)

ON CONFLICT (name, species) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

-- ============================================
-- RAZAS DE GATOS
-- ============================================
INSERT INTO public.pet_breeds (name, species, is_active, display_order) VALUES
-- Razas de pelo largo
('Persa', 'cat', true, 1),
('Maine Coon', 'cat', true, 2),
('Ragdoll', 'cat', true, 3),
('Angora Turco', 'cat', true, 4),
('Bosque de Noruega', 'cat', true, 5),
('Siberiano', 'cat', true, 6),
('Birmano', 'cat', true, 7),
('Himalayo', 'cat', true, 8),
('Exótico de Pelo Largo', 'cat', true, 9),
('Selkirk Rex', 'cat', true, 10),

-- Razas de pelo corto
('British Shorthair', 'cat', true, 11),
('American Shorthair', 'cat', true, 12),
('Europeo', 'cat', true, 13),
('Siamés', 'cat', true, 14),
('Abisinio', 'cat', true, 15),
('Bengalí', 'cat', true, 16),
('Oriental', 'cat', true, 17),
('Ruso Azul', 'cat', true, 18),
('Chartreux', 'cat', true, 19),
('Bombay', 'cat', true, 20),
('Burmés', 'cat', true, 21),
('Tonkinés', 'cat', true, 22),
('Somalí', 'cat', true, 23),
('Manx', 'cat', true, 24),
('Cornish Rex', 'cat', true, 25),
('Devon Rex', 'cat', true, 26),
('Esfinge', 'cat', true, 27),
('Peterbald', 'cat', true, 28),
('Scottish Fold', 'cat', true, 29),
('American Curl', 'cat', true, 30),

-- Razas especiales
('Savannah', 'cat', true, 31),
('Maine Coon Polidáctilo', 'cat', true, 32),
('Van Turco', 'cat', true, 33),
('Korat', 'cat', true, 34),
('LaPerm', 'cat', true, 35),
('Munchkin', 'cat', true, 36),
('Sphynx', 'cat', true, 37),
('Exótico de Pelo Corto', 'cat', true, 38),

-- Gatos sin raza específica
('Mestizo', 'cat', true, 100),
('Criollo', 'cat', true, 101),
('Sin raza específica', 'cat', true, 102),
('Común Europeo', 'cat', true, 103),
('Doméstico de Pelo Corto', 'cat', true, 104),
('Doméstico de Pelo Largo', 'cat', true, 105)

ON CONFLICT (name, species) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

COMMENT ON TABLE public.pet_breeds IS 'Catálogo de razas de perros y gatos - Datos iniciales insertados';










