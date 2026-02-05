# -*- coding: utf-8 -*-
import logging

from odoo import models, fields, api, _

_logger = logging.getLogger(__name__)

# Categorías cuyos productos no pueden modificar cantidad (siempre líneas individuales)
CATEGORIAS_CANTIDAD_FIJA = [
    'Peluquería',
]


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    # Campo para identificar si el producto es de categoría con cantidad fija
    es_servicio_mascota = fields.Boolean(
        string='Es Servicio de Mascota',
        compute='_compute_es_servicio_mascota',
        store=True,
        help="Indica si el producto pertenece a una categoría de servicios de mascotas (cantidad no editable)"
    )
    
    # Campos para controlar visibilidad de estilista/veterinario según categoría
    es_categoria_peluqueria = fields.Boolean(
        string='Es Peluquería',
        compute='_compute_tipo_categoria',
        store=True,
        help="Indica si el producto es de categoría Peluquería"
    )
    es_categoria_clinica = fields.Boolean(
        string='Es Clínica',
        compute='_compute_tipo_categoria',
        store=True,
        help="Indica si el producto es de categoría Clínica"
    )
    
    mascota_required = fields.Boolean(
        string='Mascota Requerida',
        compute='_compute_mascota_required',
        store=True,
        help="Indica si el campo mascota_id debe ser obligatorio"
    )

    @api.depends('product_id', 'product_id.categ_id', 'product_id.categ_id.name', 'product_id.categ_id.parent_id')
    def _compute_es_servicio_mascota(self):
        """Verifica si el producto pertenece a una categoría de servicios de mascotas"""
        for line in self:
            es_servicio = False
            if line.product_id and line.product_id.categ_id:
                # Verificar la categoría y sus padres
                categ = line.product_id.categ_id
                while categ:
                    if categ.name in CATEGORIAS_CANTIDAD_FIJA:
                        es_servicio = True
                        break
                    categ = categ.parent_id
            line.es_servicio_mascota = es_servicio
    
    @api.depends('product_id', 'product_id.categ_id', 'product_id.categ_id.name', 'product_id.categ_id.parent_id')
    def _compute_tipo_categoria(self):
        """Determina si el producto es de Peluquería o Clínica"""
        for line in self:
            es_peluqueria = False
            es_clinica = False
            if line.product_id and line.product_id.categ_id:
                categ = line.product_id.categ_id
                while categ:
                    if categ.name == 'Peluquería':
                        es_peluqueria = True
                        break
                    elif categ.name == 'Clínica':
                        es_clinica = True
                        break
                    categ = categ.parent_id
            line.es_categoria_peluqueria = es_peluqueria
            line.es_categoria_clinica = es_clinica
    
    @api.depends('es_categoria_peluqueria', 'es_categoria_clinica', 'order_id', 'order_id.mascotas_asignadas_ids', 'mascotas_disponibles_ids')
    def _compute_mascota_required(self):
        """Calcula si mascota_id debe ser requerido: (Peluquería OR Clínica) AND hay mascotas disponibles"""
        for line in self:
            es_servicio = line.es_categoria_peluqueria or line.es_categoria_clinica
            # Verificar si hay mascotas disponibles usando len() para Many2many
            # mascotas_disponibles_ids es related, así que puede estar vacío al inicio
            if line.order_id and line.order_id.mascotas_asignadas_ids:
                tiene_mascotas = len(line.order_id.mascotas_asignadas_ids) > 0
            else:
                tiene_mascotas = len(line.mascotas_disponibles_ids) > 0 if line.mascotas_disponibles_ids else False
            line.mascota_required = es_servicio and tiene_mascotas

    @api.onchange('product_id')
    def _onchange_product_id_cantidad_fija(self):
        """Si el producto es de categoría Peluquería, establecer cantidad a 1"""
        if self.product_id and self.es_categoria_peluqueria:
            self.product_uom_qty = 1.0

    @api.onchange('product_uom_qty')
    def _onchange_product_uom_qty_servicio(self):
        """Evitar cambio de cantidad para servicios de Peluquería (no aplica a Clínica)"""
        if self.es_categoria_peluqueria and self.product_uom_qty != 1.0:
            self.product_uom_qty = 1.0
            return {
                'warning': {
                    'title': _('Cantidad no modificable'),
                    'message': _('Los servicios de peluquería siempre tienen cantidad 1. Si necesita agregar más, cree una nueva línea.')
                }
            }

    def _asignar_responsable_desde_mascota(self, mascota_id, order_id, tipo='peluqueria'):
        """Busca el responsable asignado a la mascota en x.mascota.line de ESTE presupuesto.
        
        Para peluquería: devuelve lista de IDs (Many2many)
        Para veterinaria: devuelve un solo ID (Many2one)
        """
        if not mascota_id or not order_id or (isinstance(order_id, int) and order_id <= 0):
            return [] if tipo == 'peluqueria' else False
        mid = mascota_id if isinstance(mascota_id, int) else (mascota_id.id if mascota_id else None)
        if not mid:
            return [] if tipo == 'peluqueria' else False
        mascota_line = self.env['x.mascota.line'].search([
            ('mascota_id', '=', mid),
            ('order_id', '=', order_id)
        ], limit=1)
        if mascota_line:
            if tipo == 'veterinaria' and mascota_line.responsable_veterinaria:
                return mascota_line.responsable_veterinaria.id
            elif tipo == 'peluqueria' and mascota_line.responsable_peluqueria:
                return mascota_line.responsable_peluqueria.ids
        return [] if tipo == 'peluqueria' else False

    def _asignar_responsable_desde_historico(self, mascota_id, tipo='peluqueria'):
        """Fallback: busca el responsable en la última x.mascota.line de esta mascota (cualquier presupuesto).
        Usado cuando en el presupuesto actual no hay mascota_line o no tiene responsable asignado.
        """
        mid = mascota_id if isinstance(mascota_id, int) else (mascota_id.id if mascota_id else None)
        if not mid:
            return [] if tipo == 'peluqueria' else False
        lineas = self.env['x.mascota.line'].search(
            [('mascota_id', '=', mid)],
            order='create_date desc, id desc',
            limit=50
        )
        if tipo == 'peluqueria':
            for m in lineas:
                if m.responsable_peluqueria:
                    return m.responsable_peluqueria.ids
            return []
        else:
            for m in lineas:
                if m.responsable_veterinaria:
                    return m.responsable_veterinaria.id
            return False

    def _get_responsable_para_mascota(self, mascota_id, order_id, tipo='peluqueria'):
        """Obtiene estilistas o veterinario SOLO desde x.mascota.line del presupuesto actual.
        NO usa histórico para evitar asignar peluqueros de servicios anteriores.
        Si no hay mascota_line en el presupuesto actual o no tiene responsable, devuelve vacío.
        """
        return self._asignar_responsable_desde_mascota(mascota_id, order_id, tipo)
    
    def _es_producto_peluqueria(self):
        """Verifica si el producto es de categoría Peluquería"""
        if not self.product_id or not self.product_id.categ_id:
            return False
        categ = self.product_id.categ_id
        while categ:
            if categ.name == 'Peluquería':
                return True
            categ = categ.parent_id
        return False
    
    def _es_producto_clinica(self):
        """Verifica si el producto es de categoría Clínica"""
        if not self.product_id or not self.product_id.categ_id:
            return False
        categ = self.product_id.categ_id
        while categ:
            if categ.name == 'Clínica':
                return True
            categ = categ.parent_id
        return False

    @api.model_create_multi
    def create(self, vals_list):
        """Al crear líneas, asignar estilistas/veterinario automáticamente desde x.mascota.line"""
        for vals in vals_list:
            product_id = vals.get('product_id')
            if product_id:
                product = self.env['product.product'].browse(product_id)
                es_peluqueria = self._check_categoria_producto(product, 'Peluquería')
                es_clinica = self._check_categoria_producto(product, 'Clínica')
                
                # Limpiar campo incorrecto según categoría
                if es_peluqueria:
                    vals['veterinario_id'] = False
                elif es_clinica:
                    vals['estilista_ids'] = [(5, 0, 0)]  # Limpiar Many2many
                
                # Asignar responsable automáticamente SOLO desde x.mascota.line del presupuesto actual
                # NO usar histórico para evitar asignar peluqueros de servicios anteriores
                if vals.get('mascota_id'):
                    order_id = vals.get('order_id')
                    if es_peluqueria and not vals.get('estilista_ids') and order_id:
                        estilista_ids = self._get_responsable_para_mascota(vals['mascota_id'], order_id, 'peluqueria')
                        if estilista_ids:
                            vals['estilista_ids'] = [(6, 0, estilista_ids)]
                            _logger.info("CREATE - Estilistas %s asignados a mascota %s desde presupuesto %s", estilista_ids, vals['mascota_id'], order_id)
                    elif es_clinica and not vals.get('veterinario_id') and order_id:
                        veterinario_id = self._get_responsable_para_mascota(vals['mascota_id'], order_id, 'veterinaria')
                        if veterinario_id:
                            vals['veterinario_id'] = veterinario_id
                            _logger.info("CREATE - Veterinario %s asignado a mascota %s desde presupuesto %s", veterinario_id, vals['mascota_id'], order_id)
        return super().create(vals_list)
    
    def _check_categoria_producto(self, product, categoria_nombre):
        """Verifica si el producto pertenece a una categoría específica"""
        if not product or not product.categ_id:
            return False
        categ = product.categ_id
        while categ:
            if categ.name == categoria_nombre:
                return True
            categ = categ.parent_id
        return False

    def write(self, vals):
        """Prevenir cambio de cantidad en servicios de Peluquería y asignar estilistas/veterinario"""
        if 'product_uom_qty' in vals:
            for line in self:
                if line.es_categoria_peluqueria and vals.get('product_uom_qty', 1.0) != 1.0:
                    vals['product_uom_qty'] = 1.0
        
        # Si se cambia la mascota, actualizar el responsable SOLO desde presupuesto actual
        # NO usar histórico para evitar asignar peluqueros de servicios anteriores
        if 'mascota_id' in vals and vals.get('mascota_id'):
            for line in self:
                order_id = line.order_id.id if (line.order_id and isinstance(line.order_id.id, int) and line.order_id.id > 0) else None
                if order_id:
                    if line._es_producto_peluqueria():
                        estilista_ids = self._get_responsable_para_mascota(vals['mascota_id'], order_id, 'peluqueria')
                        if estilista_ids:
                            vals['estilista_ids'] = [(6, 0, estilista_ids)]
                            vals['veterinario_id'] = False
                            _logger.info("WRITE - Estilistas %s asignados automáticamente a mascota %s desde presupuesto %s", estilista_ids, vals['mascota_id'], order_id)
                        else:
                            vals['estilista_ids'] = [(5, 0, 0)]
                            vals['veterinario_id'] = False
                    elif line._es_producto_clinica():
                        veterinario_id = self._get_responsable_para_mascota(vals['mascota_id'], order_id, 'veterinaria')
                        if veterinario_id:
                            vals['veterinario_id'] = veterinario_id
                            vals['estilista_ids'] = [(5, 0, 0)]
                            _logger.info("WRITE - Veterinario %s asignado automáticamente a mascota %s desde presupuesto %s", veterinario_id, vals['mascota_id'], order_id)
                        else:
                            vals['veterinario_id'] = False
                            vals['estilista_ids'] = [(5, 0, 0)]
        
        return super().write(vals)

    @api.constrains('mascota_id', 'es_categoria_peluqueria', 'es_categoria_clinica', 'es_servicio_mascota', 'product_id')
    def _check_mascota_required(self):
        """Validar que productos de Peluquería o Clínica tengan mascota asignada (solo si hay mascotas disponibles).
        No se ejecuta durante la instalación del módulo para evitar errores con datos existentes.
        """
        # Saltar validación durante instalación del módulo o en contexto de migración
        if self.env.context.get('skip_mascota_validation', False):
            return
        
        # Verificar si el módulo está siendo instalado/actualizado
        # Durante la instalación, puede haber datos existentes sin mascota que no deben bloquear la instalación
        try:
            # Verificar si la tabla ir_module_module existe (puede no existir durante instalación inicial)
            self.env.cr.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'ir_module_module'
                );
            """)
            table_exists = self.env.cr.fetchone()[0]
            
            if table_exists:
                module = self.env['ir.module.module'].search([
                    ('name', '=', 'sale_order_comanda_mascotas')
                ], limit=1)
                # Si el módulo está en proceso de instalación o actualización, saltar validación
                if module and module.state in ['to install', 'to upgrade', 'to remove']:
                    return
                # Si el módulo no existe aún, estamos en instalación inicial - saltar validación
                elif not module:
                    return
        except Exception:
            # Si hay algún error al verificar el módulo (p. ej. durante instalación inicial),
            # asumir que estamos instalando y saltar validación para evitar bloquear la instalación
            return
        
        # Validar solo cuando hay cambios reales en los campos relevantes
        # No validar durante carga inicial de datos existentes (que pueden no tener mascota)
        for line in self:
            # Solo validar si la línea tiene producto
            if not line.product_id:
                continue
            
            # Verificar si hay cambios reales comparando con _origin
            # Si la línea ya existía y no tiene cambios, puede ser carga inicial - saltar validación
            has_changes = True
            try:
                if hasattr(line, '_origin') and line._origin:
                    origin_id = getattr(line._origin, 'id', None)
                    if origin_id:
                        # Línea existente - verificar si hay cambios en campos relevantes
                        origin_product = getattr(line._origin, 'product_id', False)
                        origin_mascota = getattr(line._origin, 'mascota_id', False)
                        origin_es_peluqueria = getattr(line._origin, 'es_categoria_peluqueria', False)
                        origin_es_clinica = getattr(line._origin, 'es_categoria_clinica', False)
                        
                        # Si no hay cambios en los campos relevantes, puede ser carga inicial
                        if (line.product_id == origin_product and 
                            line.mascota_id == origin_mascota and
                            line.es_categoria_peluqueria == origin_es_peluqueria and
                            line.es_categoria_clinica == origin_es_clinica):
                            # No hay cambios - puede ser carga inicial durante instalación, saltar validación
                            has_changes = False
            except Exception:
                # Si hay error al comparar, asumir que hay cambios y validar
                has_changes = True
            
            # Solo validar si hay cambios reales o si es una línea nueva
            if has_changes:
                # Verificar si es producto de Peluquería o Clínica
                es_servicio_mascota = line.es_categoria_peluqueria or line.es_categoria_clinica
                
                # Validar que productos de Peluquería o Clínica tengan mascota asignada
                # SOLO si hay mascotas disponibles en el presupuesto
                if es_servicio_mascota and not line.mascota_id:
                    # Verificar si hay mascotas disponibles
                    if line.mascotas_disponibles_ids:
                        producto_nombre = line.product_id.display_name if line.product_id else 'Sin producto'
                        tipo_servicio = 'Peluquería' if line.es_categoria_peluqueria else 'Clínica'
                        if line.es_categoria_peluqueria and line.es_categoria_clinica:
                            tipo_servicio = 'Peluquería o Clínica'
                        raise models.ValidationError(
                            _('⚠️ MASCOTA REQUERIDA\n\n'
                              'El producto "%s" es de categoría %s.\n'
                              'Debe seleccionar una mascota en la columna "Mascota" de las líneas del pedido.\n\n'
                              'Hay %d mascota(s) disponible(s) en este presupuesto.') % (
                                producto_nombre, tipo_servicio, len(line.mascotas_disponibles_ids))
                        )
                
                # Solo permitir asignar mascota a servicios, no a productos regulares
                if line.mascota_id and not line.es_servicio_mascota:
                    raise models.ValidationError(
                        _('Solo se puede asignar mascota a productos de Peluquería o Clínica, no a productos regulares.')
                    )
    
    @api.onchange('product_id')
    def _onchange_product_limpiar_responsable_incorrecto(self):
        """Limpiar responsable incorrecto al cambiar producto y, si ya hay mascota, asignar el correcto.
        SOLO usa x.mascota.line del presupuesto actual, NO histórico.
        """
        # Forzar recálculo de mascota_required cuando cambia el producto
        self._compute_mascota_required()
        if self._es_producto_peluqueria():
            # Producto de Peluquería: limpiar veterinario y asignar estilistas si hay mascota_line
            self.veterinario_id = False
            if self.mascota_id:
                order_id = self._get_order_id_from_context()
                if order_id:
                    mascota_line = self.env['x.mascota.line'].search([
                        ('mascota_id', '=', self.mascota_id.id),
                        ('order_id', '=', order_id)
                    ], limit=1)
                    if mascota_line and mascota_line.responsable_peluqueria:
                        self.estilista_ids = [(6, 0, mascota_line.responsable_peluqueria.ids)]
                    else:
                        self.estilista_ids = [(5, 0, 0)]
                else:
                    self.estilista_ids = [(5, 0, 0)]
        elif self._es_producto_clinica():
            # Producto de Clínica: limpiar estilistas y asignar veterinario si hay mascota_line
            self.estilista_ids = [(5, 0, 0)]
            if self.mascota_id:
                order_id = self._get_order_id_from_context()
                if order_id:
                    mascota_line = self.env['x.mascota.line'].search([
                        ('mascota_id', '=', self.mascota_id.id),
                        ('order_id', '=', order_id)
                    ], limit=1)
                    if mascota_line and mascota_line.responsable_veterinaria:
                        self.veterinario_id = mascota_line.responsable_veterinaria
                    else:
                        self.veterinario_id = False
                else:
                    self.veterinario_id = False
        else:
            # Producto no es de Peluquería ni Clínica: limpiar ambos campos
            self.estilista_ids = [(5, 0, 0)]
            self.veterinario_id = False

    @api.constrains('mascota_id', 'product_id', 'order_id')
    def _check_mascota_unique_per_product(self):
        """Validar que una mascota no esté duplicada en el mismo producto o en productos incompatibles"""
        for line in self:
            if not line.mascota_id or not line.product_id or not line.order_id:
                continue
            
            # Buscar otras líneas en el mismo pedido con la misma mascota
            other_lines = self.search([
                ('order_id', '=', line.order_id.id),
                ('mascota_id', '=', line.mascota_id.id),
                ('id', '!=', line.id),
            ])
            
            for other in other_lines:
                # Validación 1: Mismo producto = error
                if other.product_id.id == line.product_id.id:
                    raise models.ValidationError(
                        _('La mascota "%s" ya está asignada al producto "%s" en otra línea de este pedido.') % 
                        (line.mascota_id.display_name, line.product_id.display_name)
                    )
                
                # Validación 2: Incompatibilidad BAÑO vs BAÑO Y CORTE
                line_name = (line.product_id.name or '').upper()
                other_name = (other.product_id.name or '').upper()
                
                line_is_bano_y_corte = 'BAÑO' in line_name and 'CORTE' in line_name
                line_is_solo_bano = 'BAÑO' in line_name and 'CORTE' not in line_name
                other_is_bano_y_corte = 'BAÑO' in other_name and 'CORTE' in other_name
                other_is_solo_bano = 'BAÑO' in other_name and 'CORTE' not in other_name
                
                # Si uno es BAÑO y el otro es BAÑO Y CORTE → incompatible
                if (line_is_solo_bano and other_is_bano_y_corte) or (line_is_bano_y_corte and other_is_solo_bano):
                    raise models.ValidationError(
                        _('La mascota "%s" no puede tener servicios de "Baño" y "Baño y Corte" al mismo tiempo. '
                          'Ya tiene asignado el producto "%s".') % 
                        (line.mascota_id.display_name, other.product_id.display_name)
                    )

    def _auto_init(self):
        """
        Odoo.sh a veces no corre upgrade automático del módulo al cambiar código.
        Para evitar errores por columnas/tablas faltantes, aseguramos aquí lo mínimo.
        """
        res = super()._auto_init()
        cr = self._cr

        # Columnas M2O (si el módulo no se ha "upgradeado")
        for column in ('mascota_id', 'mascota_line_id'):
            cr.execute("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'sale_order_line'
                      AND column_name = %s
                );
            """, (column,))
            if not cr.fetchone()[0]:
                _logger.info("Creando columna %s en sale_order_line", column)
                cr.execute(f"ALTER TABLE sale_order_line ADD COLUMN {column} integer;")

        # Tabla relación Many2many para compatibilidad (si falta)
        cr.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'sale_order_line_peluquero_rel'
            );
        """)
        if not cr.fetchone()[0]:
            _logger.info("Creando tabla sale_order_line_peluquero_rel")
            cr.execute("""
                CREATE TABLE sale_order_line_peluquero_rel (
                    order_line_id integer NOT NULL,
                    employee_id integer NOT NULL
                );
            """)
            cr.execute("CREATE INDEX sale_order_line_peluquero_rel_order_line_id_idx ON sale_order_line_peluquero_rel (order_line_id);")
            cr.execute("CREATE INDEX sale_order_line_peluquero_rel_employee_id_idx ON sale_order_line_peluquero_rel (employee_id);")

        # Nueva tabla relación Many2many para estilista_ids (si falta)
        cr.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'sale_order_line_estilista_rel'
            );
        """)
        if not cr.fetchone()[0]:
            _logger.info("Creando tabla sale_order_line_estilista_rel")
            cr.execute("""
                CREATE TABLE sale_order_line_estilista_rel (
                    order_line_id integer NOT NULL,
                    employee_id integer NOT NULL,
                    PRIMARY KEY (order_line_id, employee_id)
                );
            """)
            cr.execute("CREATE INDEX sale_order_line_estilista_rel_order_line_id_idx ON sale_order_line_estilista_rel (order_line_id);")
            cr.execute("CREATE INDEX sale_order_line_estilista_rel_employee_id_idx ON sale_order_line_estilista_rel (employee_id);")
            _logger.info("Tabla sale_order_line_estilista_rel creada correctamente")
        
        # Migrar datos de estilista_id (Many2one antiguo) a estilista_ids (Many2many nuevo)
        cr.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'sale_order_line'
                  AND column_name = 'estilista_id'
            );
        """)
        if cr.fetchone()[0]:
            # Migrar datos existentes de estilista_id a la nueva tabla relacional
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
            if cr.rowcount > 0:
                _logger.info("Migrados %s registros de estilista_id a estilista_ids", cr.rowcount)

        # Limpiar datos inconsistentes: estilistas en productos de Clínica
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
        
        # Limpiar datos inconsistentes: veterinario en productos de Peluquería
        cr.execute("""
            UPDATE sale_order_line sol
            SET veterinario_id = NULL
            WHERE veterinario_id IS NOT NULL
              AND EXISTS (
                  SELECT 1 FROM product_product pp
                  JOIN product_template pt ON pp.product_tmpl_id = pt.id
                  JOIN product_category pc ON pt.categ_id = pc.id
                  WHERE pp.id = sol.product_id
                    AND (pc.name = 'Peluquería' OR pc.complete_name LIKE '%Peluquería%')
              );
        """)
        if cr.rowcount > 0:
            _logger.info("Limpiados %s registros con veterinario en productos de Peluquería", cr.rowcount)

        return res

    # Campo relacionado para acceder a mascotas asignadas del pedido (para dominio)
    mascotas_disponibles_ids = fields.Many2many(
        'x_mascota',
        related='order_id.mascotas_asignadas_ids',
        string='Mascotas Disponibles',
        help="Mascotas asignadas al presupuesto actual"
    )

    # Relación con mascota
    mascota_id = fields.Many2one(
        'x_mascota',
        string='Mascota',
        domain="[('id', 'in', mascotas_disponibles_ids)]",
        help="Mascota asociada a esta línea de venta (solo mascotas asignadas al presupuesto actual)"
    )
    
    # Nombre de mascota para POS (campo almacenado para que se pueda leer en POS)
    mascota_nombre = fields.Char(
        string='Nombre Mascota',
        compute='_compute_mascota_nombre',
        store=True,
        help="Nombre de la mascota para mostrar en POS"
    )
    
    # ID de mascota como Integer para el POS (evita problemas con Many2one a modelo de Studio)
    mascota_id_valor = fields.Integer(
        string='ID Mascota (POS)',
        compute='_compute_mascota_id_valor',
        store=True,
        help="ID numérico de la mascota para enviar al POS"
    )
    
    @api.depends('mascota_id')
    def _compute_mascota_id_valor(self):
        for line in self:
            line.mascota_id_valor = line.mascota_id.id if line.mascota_id else 0
    
    @api.depends('mascota_id', 'mascota_id.display_name')
    def _compute_mascota_nombre(self):
        for line in self:
            line.mascota_nombre = line.mascota_id.display_name if line.mascota_id else ''

    mascota_line_id = fields.Many2one(
        'x.mascota.line',
        string='Servicio de Mascota',
        help="Línea de servicio de mascota asociada"
    )

    # Estilistas asignados a esta línea (para Peluquería) - Multiple para división de comisiones
    estilista_ids = fields.Many2many(
        'hr.employee',
        'sale_order_line_estilista_rel',
        'order_line_id',
        'employee_id',
        string='Estilistas',
        domain="[('job_id.name', 'ilike', 'Peluquero')]",
        help="Peluqueros que participan en el servicio (para división de comisiones). "
             "Si es SOLO BAÑO, agregue a todos los peluqueros de la sucursal."
    )
    
    # Campo computed para nombres de estilistas (para mostrar en POS)
    estilista_nombres = fields.Char(
        string='Nombres Estilistas',
        compute='_compute_estilista_nombres',
        store=True,
        help="Nombres de los estilistas separados por coma"
    )
    
    @api.depends('estilista_ids', 'estilista_ids.name')
    def _compute_estilista_nombres(self):
        for line in self:
            if line.estilista_ids:
                line.estilista_nombres = ', '.join(line.estilista_ids.mapped('name'))
            else:
                line.estilista_nombres = ''
    
    # Veterinario asignado a esta línea (para Clínica)
    veterinario_id = fields.Many2one(
        'hr.employee',
        string='Veterinario',
        domain="[('job_id.name', 'ilike', 'Veterinario')]",
        help="Veterinario que realizará el servicio clínico"
    )
    
    # Campo de compatibilidad Many2one para vistas cacheadas que todavía usan estilista_id
    # NOTA: Este campo es para compatibilidad temporal - las nuevas vistas deben usar estilista_ids
    estilista_id = fields.Many2one(
        'hr.employee',
        string='Estilista (Legacy)',
        compute='_compute_estilista_id_compat',
        inverse='_inverse_estilista_id_compat',
        store=False,
        domain="[('job_id.name', 'ilike', 'Peluquero')]",
        help="Campo de compatibilidad - usar estilista_ids para selección múltiple"
    )
    
    @api.depends('estilista_ids')
    def _compute_estilista_id_compat(self):
        """Devuelve el primer estilista de estilista_ids para compatibilidad"""
        for line in self:
            line.estilista_id = line.estilista_ids[:1] if line.estilista_ids else False
    
    def _inverse_estilista_id_compat(self):
        """Si se asigna estilista_id, agregarlo a estilista_ids"""
        for line in self:
            if line.estilista_id and line.estilista_id not in line.estilista_ids:
                line.estilista_ids = [(4, line.estilista_id.id)]
    
    # Campo de compatibilidad (para vistas de Odoo Studio que aún referencian peluquero_ids)
    peluquero_ids = fields.Many2many(
        'hr.employee',
        'sale_order_line_peluquero_rel',
        'order_line_id',
        'employee_id',
        string='Estilistas (Legacy)',
        compute='_compute_peluquero_ids',
        inverse='_inverse_peluquero_ids',
        store=False,
        help="Campo de compatibilidad - usar estilista_ids"
    )
    
    @api.depends('estilista_ids')
    def _compute_peluquero_ids(self):
        for line in self:
            if line.estilista_ids:
                line.peluquero_ids = [(6, 0, line.estilista_ids.ids)]
            else:
                line.peluquero_ids = [(5, 0, 0)]
    
    def _inverse_peluquero_ids(self):
        for line in self:
            if line.peluquero_ids:
                line.estilista_ids = [(6, 0, line.peluquero_ids.ids)]
            else:
                line.estilista_ids = [(5, 0, 0)]

    def _get_mascotas_presupuesto_ids(self):
        """Obtener IDs de mascotas asignadas al presupuesto actual"""
        if not self.order_id:
            return []
        # Usar el campo almacenado si está disponible
        if self.order_id.mascotas_asignadas_ids:
            return self.order_id.mascotas_asignadas_ids.ids
        # Fallback: buscar directamente
        mascota_lines = self.env['x.mascota.line'].search([('order_id', '=', self.order_id.id)])
        return mascota_lines.mapped('mascota_id').ids

    @api.model
    def default_get(self, fields_list):
        """Aplica dominio de mascotas al crear nueva línea"""
        res = super().default_get(fields_list)
        # Obtener el order_id del contexto
        order_id = self.env.context.get('default_order_id') or self.env.context.get('active_id')
        if order_id:
            order = self.env['sale.order'].browse(order_id)
            if order.exists() and order.mascotas_asignadas_ids:
                # El dominio se aplicará via onchange
                pass
        return res

    @api.onchange('order_id')
    def _onchange_order_id(self):
        """Actualizar dominio de mascota_id cuando cambia el presupuesto"""
        mascota_ids = self._get_mascotas_presupuesto_ids()
        # Forzar recálculo de mascota_required
        self._compute_mascota_required()
        return {
            'domain': {
                'mascota_id': [('id', 'in', mascota_ids)] if mascota_ids else [('id', '=', False)],
            }
        }

    @api.onchange('mascota_line_id')
    def _onchange_mascota_line_id(self):
        """Al seleccionar un servicio de mascota, asigna la mascota y todos los estilistas"""
        if self.mascota_line_id:
            self.mascota_id = self.mascota_line_id.mascota_id
            # Agregar todos los responsables de peluquería (Many2many a Many2many)
            if self.mascota_line_id.responsable_peluqueria:
                self.estilista_ids = [(6, 0, self.mascota_line_id.responsable_peluqueria.ids)]

    def _get_order_id_from_context(self):
        """Obtener order_id de múltiples fuentes. Solo devuelve IDs reales (enteros > 0), no NewIds."""
        order_id = None
        # 1. Desde self.order_id (solo si es id real, no NewId)
        if self.order_id:
            oid = getattr(self.order_id, 'id', None)
            if isinstance(oid, int) and oid > 0:
                order_id = oid
        # 2. Desde contexto
        if not order_id:
            c = self.env.context.get('default_order_id')
            if isinstance(c, int) and c > 0:
                order_id = c
        if not order_id and self.env.context.get('active_model') == 'sale.order':
            aid = self.env.context.get('active_id')
            if isinstance(aid, int) and aid > 0:
                order_id = aid
        if not order_id:
            params = self.env.context.get('params', {}) or {}
            pid = params.get('id') if params.get('model') == 'sale.order' else None
            if isinstance(pid, int) and pid > 0:
                order_id = pid
        return order_id

    @api.onchange('mascota_id')
    def _onchange_mascota_id(self):
        """Al seleccionar una mascota, asignar peluquero o veterinario desde x.mascota.line del presupuesto.
        IMPORTANTE: Busca primero en registros EN MEMORIA (no guardados) del presupuesto actual,
        luego en la base de datos. Esto permite asignar el peluquero antes de guardar.
        """
        mascota_ids = self._get_mascotas_presupuesto_ids()
        domain_vals = {
            'mascota_id': [('id', 'in', mascota_ids)] if mascota_ids else [('id', '=', False)],
            'mascota_line_id': [('id', '=', False)],
        }
        order_id = self._get_order_id_from_context()

        if not self.mascota_id:
            self.estilista_ids = [(5, 0, 0)]
            self.veterinario_id = False
            self.mascota_line_id = False
            return {'domain': domain_vals}

        # Buscar mascota_line - PRIMERO en registros en memoria del presupuesto actual
        # Esto funciona incluso si el presupuesto no está guardado aún
        mascota_line = False
        
        # Método 1: Buscar en self.order_id.mascota_line_ids (incluye registros no guardados)
        if self.order_id and hasattr(self.order_id, 'mascota_line_ids'):
            for ml in self.order_id.mascota_line_ids:
                if ml.mascota_id and ml.mascota_id.id == self.mascota_id.id:
                    mascota_line = ml
                    break
        
        # Método 2: Si no se encontró en memoria y hay order_id guardado, buscar en BD
        if not mascota_line and order_id:
            mascota_line = self.env['x.mascota.line'].search([
                ('mascota_id', '=', self.mascota_id.id),
                ('order_id', '=', order_id),
            ], limit=1)
        
        # Actualizar dominio para mascota_line_id
        if order_id:
            domain_vals['mascota_line_id'] = [
                ('mascota_id', '=', self.mascota_id.id),
                ('order_id', '=', order_id),
            ]
        
        self.mascota_line_id = mascota_line or False

        # Asignar responsable desde x.mascota.line del presupuesto actual
        if self.product_id:
            if self._es_producto_peluqueria():
                # Asignar estilistas si hay mascota_line con responsable
                if mascota_line and mascota_line.responsable_peluqueria:
                    self.estilista_ids = [(6, 0, mascota_line.responsable_peluqueria.ids)]
                else:
                    self.estilista_ids = [(5, 0, 0)]
                self.veterinario_id = False
            elif self._es_producto_clinica():
                # Asignar veterinario si hay mascota_line con responsable
                if mascota_line and mascota_line.responsable_veterinaria:
                    self.veterinario_id = mascota_line.responsable_veterinaria
                else:
                    self.veterinario_id = False
                self.estilista_ids = [(5, 0, 0)]
            else:
                # Producto no es Peluquería ni Clínica: limpiar ambos
                self.estilista_ids = [(5, 0, 0)]
                self.veterinario_id = False
        # Si no hay producto, no asignar automáticamente (campos visibles pero vacíos)

        return {'domain': domain_vals}

    def _can_be_merged_to(self, line):
        """
        Evita que líneas se combinen en los siguientes casos:
        1. Productos de categorías de servicios de mascotas (Peluquería, Clínica)
        2. Líneas con diferente mascota asignada
        """
        # NUNCA combinar servicios de mascota - siempre líneas individuales
        if self.es_servicio_mascota or line.es_servicio_mascota:
            return False
        
        # Si alguna de las líneas tiene mascota asignada, no combinar si son diferentes
        if self.mascota_id or line.mascota_id:
            if self.mascota_id != line.mascota_id:
                return False
        
        return super()._can_be_merged_to(line)

    # ==================== INTEGRACIÓN CON POS ====================
    
    def _prepare_order_line_for_pos(self):
        """Preparar datos de la línea para enviar al POS (pos_sale)"""
        result = {}
        if hasattr(super(), '_prepare_order_line_for_pos'):
            result = super()._prepare_order_line_for_pos()
        
        # Agregar estilistas para POS (campo separado, no user_id) - Ahora múltiples
        if self.estilista_ids:
            result['estilista_ids'] = self.estilista_ids.ids
            result['estilista_nombres'] = self.estilista_nombres or ', '.join(self.estilista_ids.mapped('name'))
            _logger.info("POS EXPORT - Línea %s: estilista_ids=%s", 
                        self.id, self.estilista_nombres)
        
        # Agregar veterinario para POS (se asigna a user_id/Salesperson)
        if self.veterinario_id:
            result['veterinario_id'] = self.veterinario_id.id
            result['veterinario_nombre'] = self.veterinario_id.name
            _logger.info("POS EXPORT - Línea %s: veterinario_id=%s", 
                        self.id, self.veterinario_id.name)
        
        # Agregar nombre de mascota
        if self.mascota_id:
            result['mascota_nombre'] = self.mascota_id.display_name
        
        return result

    @api.model
    def _load_pos_data_fields(self, config_id):
        """Campos adicionales para cargar en POS desde sale.order.line"""
        fields = []
        if hasattr(super(), '_load_pos_data_fields'):
            fields = super()._load_pos_data_fields(config_id)
        # Agregar campos de estilistas, veterinario y mascota
        # mascota_id_valor es un Integer para evitar problemas con Many2one a modelo de Studio
        fields.extend(['estilista_ids', 'estilista_nombres', 'veterinario_id', 'mascota_id', 'mascota_id_valor', 'mascota_nombre'])
        return fields

    def read_converted(self):
        """Override para incluir estilistas, veterinario y mascota cuando se lee para POS"""
        result = super().read_converted()
        
        _logger.info("READ_CONVERTED llamado para líneas: %s", self.ids)
        
        # result es una lista de diccionarios, uno por cada línea
        if isinstance(result, list):
            for idx, line_data in enumerate(result):
                if idx < len(self):
                    line = self[idx]
                    if line.estilista_ids:
                        line_data['estilista_ids'] = line.estilista_ids.ids
                        line_data['estilista_nombres'] = line.estilista_nombres or ', '.join(line.estilista_ids.mapped('name'))
                        _logger.info("READ_CONVERTED - Línea %s: estilistas=%s", 
                                    line.id, line.estilista_nombres)
                    if line.veterinario_id:
                        line_data['veterinario_id'] = line.veterinario_id.id
                        line_data['veterinario_nombre'] = line.veterinario_id.name
                        _logger.info("READ_CONVERTED - Línea %s: veterinario=%s", 
                                    line.id, line.veterinario_id.name)
                    if line.mascota_id:
                        line_data['mascota_nombre'] = line.mascota_id.display_name
                        _logger.info("READ_CONVERTED - Línea %s: mascota=%s", 
                                    line.id, line.mascota_id.display_name)
        elif isinstance(result, dict):
            for line in self:
                if line.estilista_ids:
                    result['estilista_ids'] = line.estilista_ids.ids
                    result['estilista_nombres'] = line.estilista_nombres or ', '.join(line.estilista_ids.mapped('name'))
                if line.veterinario_id:
                    result['veterinario_id'] = line.veterinario_id.id
                    result['veterinario_nombre'] = line.veterinario_id.name
                if line.mascota_id:
                    result['mascota_nombre'] = line.mascota_id.display_name
        
        return result

