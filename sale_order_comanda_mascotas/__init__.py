from . import models, controllers, report

def pre_init_hook(cr):
    """Preparar la base de datos antes de cargar datos"""
    # Asegurar que la columna tiempo_total_responsables existe
    cr.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'x_mascota_line' 
                AND column_name = 'tiempo_total_responsables'
            ) THEN
                ALTER TABLE x_mascota_line 
                ADD COLUMN tiempo_total_responsables double precision;
            END IF;
        END $$;
    """)

def post_init_hook(cr, registry):
    """Ejecutar después de la instalación/actualización del módulo"""
    # Asegurar que la columna tiempo_total_responsables existe
    # Esto es necesario porque el pre_init_hook puede no ejecutarse en actualizaciones
    cr.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'x_mascota_line' 
                AND column_name = 'tiempo_total_responsables'
            ) THEN
                ALTER TABLE x_mascota_line 
                ADD COLUMN tiempo_total_responsables double precision;
            END IF;
        END $$;
    """)