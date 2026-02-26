# -*- coding: utf-8 -*-
"""
Pre-migration script para v2.2.0
Migra datos de estilista_id (Many2one) a estilista_ids (Many2many)
"""
import logging

_logger = logging.getLogger(__name__)


def migrate(cr, version):
    """
    Migra los datos existentes de estilista_id (Many2one) a la nueva
    tabla relacional sale_order_line_estilista_rel (Many2many).
    
    También crea la tabla para pos.order.line si no existe.
    """
    if not version:
        return
    
    _logger.info("=== Inicio migración v2.2.0: estilista_id -> estilista_ids ===")
    
    # 1. Verificar si la columna estilista_id existe en sale_order_line
    cr.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'sale_order_line'
              AND column_name = 'estilista_id'
        );
    """)
    estilista_id_exists = cr.fetchone()[0]
    
    if not estilista_id_exists:
        _logger.info("Columna estilista_id no existe en sale_order_line. Saltando migración.")
        return
    
    # 2. Crear tabla sale_order_line_estilista_rel si no existe
    cr.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'sale_order_line_estilista_rel'
        );
    """)
    if not cr.fetchone()[0]:
        _logger.info("Creando tabla sale_order_line_estilista_rel...")
        cr.execute("""
            CREATE TABLE sale_order_line_estilista_rel (
                order_line_id integer NOT NULL,
                employee_id integer NOT NULL,
                PRIMARY KEY (order_line_id, employee_id)
            );
        """)
        cr.execute("""
            CREATE INDEX sale_order_line_estilista_rel_order_line_id_idx 
            ON sale_order_line_estilista_rel (order_line_id);
        """)
        cr.execute("""
            CREATE INDEX sale_order_line_estilista_rel_employee_id_idx 
            ON sale_order_line_estilista_rel (employee_id);
        """)
        _logger.info("Tabla sale_order_line_estilista_rel creada correctamente")
    
    # 3. Migrar datos de estilista_id a la nueva tabla relacional
    cr.execute("""
        INSERT INTO sale_order_line_estilista_rel (order_line_id, employee_id)
        SELECT id, estilista_id
        FROM sale_order_line
        WHERE estilista_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM sale_order_line_estilista_rel rel
              WHERE rel.order_line_id = sale_order_line.id
                AND rel.employee_id = sale_order_line.estilista_id
          );
    """)
    migrados = cr.rowcount
    if migrados > 0:
        _logger.info("Migrados %s registros de estilista_id a estilista_ids", migrados)
    else:
        _logger.info("No hay registros para migrar de estilista_id")
    
    # 4. Crear tabla pos_order_line_estilista_rel si no existe
    cr.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'pos_order_line_estilista_rel'
        );
    """)
    if not cr.fetchone()[0]:
        _logger.info("Creando tabla pos_order_line_estilista_rel...")
        cr.execute("""
            CREATE TABLE pos_order_line_estilista_rel (
                pos_order_line_id integer NOT NULL,
                employee_id integer NOT NULL,
                PRIMARY KEY (pos_order_line_id, employee_id)
            );
        """)
        cr.execute("""
            CREATE INDEX pos_order_line_estilista_rel_line_id_idx 
            ON pos_order_line_estilista_rel (pos_order_line_id);
        """)
        cr.execute("""
            CREATE INDEX pos_order_line_estilista_rel_employee_id_idx 
            ON pos_order_line_estilista_rel (employee_id);
        """)
        _logger.info("Tabla pos_order_line_estilista_rel creada correctamente")
    
    # 5. Si existe estilista_id en pos_order_line, migrar también
    cr.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'pos_order_line'
              AND column_name = 'estilista_id'
        );
    """)
    if cr.fetchone()[0]:
        cr.execute("""
            INSERT INTO pos_order_line_estilista_rel (pos_order_line_id, employee_id)
            SELECT id, estilista_id
            FROM pos_order_line
            WHERE estilista_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM pos_order_line_estilista_rel rel
                  WHERE rel.pos_order_line_id = pos_order_line.id
                    AND rel.employee_id = pos_order_line.estilista_id
              );
        """)
        migrados_pos = cr.rowcount
        if migrados_pos > 0:
            _logger.info("Migrados %s registros de pos_order_line.estilista_id", migrados_pos)
    
    # 6. Limpiar estilistas en productos de Clínica (no deberían tener estilista)
    cr.execute("""
        DELETE FROM sale_order_line_estilista_rel
        WHERE order_line_id IN (
            SELECT sol.id FROM sale_order_line sol
            JOIN product_product pp ON pp.id = sol.product_id
            JOIN product_template pt ON pp.product_tmpl_id = pt.id
            JOIN product_category pc ON pt.categ_id = pc.id
            WHERE pc.name = 'Clínica' OR pc.complete_name LIKE '%Clínica%'
        );
    """)
    if cr.rowcount > 0:
        _logger.info("Limpiados %s estilistas en productos de Clínica", cr.rowcount)
    
    _logger.info("=== Fin migración v2.2.0 ===")
