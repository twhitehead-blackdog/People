# -*- coding: utf-8 -*-
"""
Migración: Manejar cambio de picking_policy de forma segura
============================================================================

Este script intenta manejar el cambio de la restricción NOT NULL en picking_policy
de manera segura para evitar lock timeouts durante la actualización del módulo.
"""

import logging
import time

_logger = logging.getLogger(__name__)


def migrate(cr, version):
    """
    Función de migración que intenta quitar la restricción NOT NULL de picking_policy
    de manera segura, con reintentos y manejo de errores.
    
    Args:
        cr: Cursor de base de datos
        version: Versión a la que se migra
    """
    _logger.info('Iniciando migración: Manejar cambio de picking_policy de forma segura')
    
    # Verificar si la columna picking_policy existe y tiene restricción NOT NULL
    cr.execute("""
        SELECT 
            column_name,
            is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'sale_order' 
          AND column_name = 'picking_policy';
    """)
    result = cr.fetchone()
    
    if not result:
        _logger.info('Columna picking_policy no existe en sale_order. Saltando migración...')
        return
    
    column_name, is_nullable = result
    
    # Si ya es nullable, no hay nada que hacer
    if is_nullable == 'YES':
        _logger.info('Columna picking_policy ya es nullable. Saltando migración...')
        return
    
    _logger.info('Columna picking_policy tiene restricción NOT NULL. Intentando quitarla...')
    
    # Intentar quitar la restricción NOT NULL con reintentos
    max_retries = 3
    retry_delay = 5  # segundos
    
    for attempt in range(1, max_retries + 1):
        try:
            _logger.info(f'Intento {attempt}/{max_retries}: Quitando restricción NOT NULL de picking_policy...')
            
            # Intentar quitar la restricción NOT NULL
            cr.execute("""
                ALTER TABLE sale_order 
                ALTER COLUMN picking_policy DROP NOT NULL;
            """)
            
            cr.commit()
            _logger.info('✅ Restricción NOT NULL quitada exitosamente de picking_policy')
            return
            
        except Exception as e:
            error_msg = str(e)
            _logger.warning(f'Intento {attempt}/{max_retries} falló: {error_msg}')
            
            # Si es un error de lock timeout y no es el último intento, esperar y reintentar
            if 'lock timeout' in error_msg.lower() and attempt < max_retries:
                _logger.info(f'Esperando {retry_delay} segundos antes de reintentar...')
                time.sleep(retry_delay)
                retry_delay *= 2  # Aumentar el delay exponencialmente
                continue
            else:
                # Si es otro tipo de error o es el último intento, loguear pero no fallar
                _logger.warning(
                    f'No se pudo quitar la restricción NOT NULL de picking_policy. '
                    f'Odoo intentará hacerlo automáticamente durante la actualización. '
                    f'Si falla, actualice el módulo cuando no haya carga activa.'
                )
                # No hacer rollback, dejar que Odoo lo maneje
                return
    
    _logger.warning(
        'No se pudo quitar la restricción NOT NULL después de todos los intentos. '
        'Odoo intentará hacerlo automáticamente durante la actualización.'
    )
