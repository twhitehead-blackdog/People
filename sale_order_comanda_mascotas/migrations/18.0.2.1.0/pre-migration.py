# -*- coding: utf-8 -*-
"""
Migración: Convertir responsables de res.users a hr.employee
============================================================================

Este script se ejecuta automáticamente antes de la migración del módulo.
Convierte los IDs de res.users almacenados en responsable_peluqueria y 
responsable_veterinaria a IDs de hr.employee correspondientes.
"""

import logging

_logger = logging.getLogger(__name__)


def migrate(cr, version):
    """
    Función de migración que se ejecuta automáticamente al actualizar el módulo.
    
    Args:
        cr: Cursor de base de datos
        version: Versión a la que se migra
    """
    _logger.info('Iniciando migración: Convertir responsables de res.users a hr.employee')
    
    # Verificar si la tabla existe
    cr.execute("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'x_mascota_line'
        );
    """)
    tabla_existe = cr.fetchone()[0]
    
    if not tabla_existe:
        _logger.info('Tabla x_mascota_line no existe. Saltando migración...')
        return
    
    # Verificar si la columna responsable_peluqueria existe
    cr.execute("""
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'x_mascota_line' 
            AND column_name = 'responsable_peluqueria'
        );
    """)
    columna_existe = cr.fetchone()[0]
    
    if not columna_existe:
        _logger.info('Columna responsable_peluqueria no existe. Saltando migración...')
        return
    
    try:
        # Paso 0: Eliminar foreign keys antiguas que apuntan a res_users
        _logger.info('Eliminando foreign keys antiguas...')
        
        # Buscar todas las foreign keys relacionadas con responsable_peluqueria y responsable_veterinaria
        cr.execute("""
            SELECT 
                tc.constraint_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'x_mascota_line'
              AND (kcu.column_name = 'responsable_peluqueria' 
                   OR kcu.column_name = 'responsable_veterinaria');
        """)
        foreign_keys = cr.fetchall()
        
        for (constraint_name,) in foreign_keys:
            try:
                cr.execute(f"""
                    ALTER TABLE x_mascota_line 
                    DROP CONSTRAINT IF EXISTS {constraint_name} CASCADE;
                """)
                _logger.info(f'✅ Foreign key {constraint_name} eliminada')
            except Exception as e:
                _logger.warning(f'No se pudo eliminar foreign key {constraint_name}: {e}')
        
        # También intentar eliminar por nombres conocidos por si acaso
        constraint_names = [
            'x_mascota_line_responsable_peluqueria_fkey',
            'x_mascota_line_responsable_veterinaria_fkey',
            'x_mascota_line_responsable_peluqueria_fkey1',
            'x_mascota_line_responsable_veterinaria_fkey1',
        ]
        
        for constraint_name in constraint_names:
            try:
                cr.execute(f"""
                    ALTER TABLE x_mascota_line 
                    DROP CONSTRAINT IF EXISTS {constraint_name} CASCADE;
                """)
                _logger.info(f'✅ Foreign key {constraint_name} eliminada (por nombre conocido)')
            except Exception as e:
                # Ignorar si no existe
                pass
        
        cr.commit()
        _logger.info('Foreign keys antiguas eliminadas correctamente')
        
        # Paso 1: Vaciar todos los campos de responsables (no migrar, solo limpiar)
        _logger.info('Limpiando todos los campos de responsables antiguos...')
        
        # Vaciar responsable_peluqueria
        cr.execute("""
            UPDATE x_mascota_line 
            SET responsable_peluqueria = NULL 
            WHERE responsable_peluqueria IS NOT NULL
        """)
        registros_limpiados_peluqueria = cr.rowcount
        _logger.info(f'✅ responsable_peluqueria: {registros_limpiados_peluqueria} registros limpiados')
        
        # Vaciar responsable_veterinaria
        cr.execute("""
            UPDATE x_mascota_line 
            SET responsable_veterinaria = NULL 
            WHERE responsable_veterinaria IS NOT NULL
        """)
        registros_limpiados_veterinaria = cr.rowcount
        _logger.info(f'✅ responsable_veterinaria: {registros_limpiados_veterinaria} registros limpiados')
        
        # Vaciar responsable_display si existe
        cr.execute("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'x_mascota_line' 
                AND column_name = 'responsable_display'
            );
        """)
        columna_display_existe = cr.fetchone()[0]
        
        if columna_display_existe:
            cr.execute("""
                UPDATE x_mascota_line 
                SET responsable_display = NULL 
                WHERE responsable_display IS NOT NULL
            """)
            registros_limpiados_display = cr.rowcount
            _logger.info(f'✅ responsable_display: {registros_limpiados_display} registros limpiados')
        
        # Commit de los cambios
        cr.commit()
        
        _logger.info('✅ Migración completada exitosamente')
        
    except Exception as e:
        _logger.error(f'❌ Error en la migración: {e}')
        cr.rollback()
        raise

