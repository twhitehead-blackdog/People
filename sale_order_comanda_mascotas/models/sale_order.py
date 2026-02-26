from odoo import models, fields, api, _
from odoo.exceptions import ValidationError, UserError

class SaleOrder(models.Model):
    _inherit = 'sale.order'

    # Relaciones
    mascota_line_ids = fields.One2many(
        'x.mascota.line',
        'order_id',
        string='Mascotas Detalle',
        copy=True
    )

    # Campos para mostrar nombres de mascotas
    nombres_mascotas = fields.Char(
        string='Nombres de Mascotas',
        compute='_compute_nombres_mascotas',
        store=True,
        index=True,
        help="Lista separada por comas con los nombres de las mascotas en el presupuesto"
    )
    
    # IDs de mascotas asignadas (para filtrar en líneas de venta)
    mascotas_asignadas_ids = fields.Many2many(
        'x_mascota',
        'sale_order_mascota_asignada_rel',
        'order_id',
        'mascota_id',
        string='Mascotas Asignadas',
        compute='_compute_mascotas_asignadas_ids',
        store=True,
        help="Mascotas que tienen una línea de servicio en este presupuesto"
    )

    # Contadores de servicios
    count_peluqueria = fields.Integer(
        string='# Mascotas Peluquería',
        compute='_compute_servicios_count',
        store=True,
        index=True,
        help="Cantidad de mascotas con servicios de peluquería"
    )
    count_veterinaria = fields.Integer(
        string='# Mascotas Veterinaria',
        compute='_compute_servicios_count',
        store=True,
        index=True,
        help="Cantidad de mascotas con servicios veterinarios"
    )
    count_total_mascotas = fields.Integer(
        string='Total Mascotas Únicas',
        compute='_compute_count_total_mascotas',
        store=True,
        index=True,
        help="Total de mascotas únicas en el presupuesto"
    )
    count_mascotas_presupuesto = fields.Integer(
        string='Total Líneas Mascotas',
        compute='_compute_count_mascotas_presupuesto',
        store=True,
        index=True,
        help="Total de líneas de mascotas en el presupuesto (sin importar tipo de servicio)"
    )
    count_total_servicios = fields.Integer(
        string='Total Servicios',
        compute='_compute_count_total_servicios',
        store=True,
        index=True,
        help="Suma total de servicios (peluquería + veterinaria) en el presupuesto"
    )
    
    # Contador de cortes en el presupuesto
    count_cortes = fields.Integer(
        string='Cortes',
        compute='_compute_count_cortes',
        store=True,
        index=True,
        help="Cantidad de servicios de corte en este presupuesto"
    )
    
    # Contadores de baño
    count_solo_bano = fields.Integer(
        string='Solo Baño',
        compute='_compute_count_bano',
        store=True,
        index=True,
        help="Cantidad de servicios que son solo baño (sin corte)"
    )
    
    count_bano_y_corte = fields.Integer(
        string='Baño y Corte',
        compute='_compute_count_bano',
        store=True,
        index=True,
        help="Cantidad de servicios que tienen baño y corte"
    )

    # Flags para servicios
    tiene_peluqueria = fields.Boolean(
        string='Tiene Peluquería',
        compute='_compute_servicios_count',
        store=True,
        index=True,
        help="Indica si el presupuesto tiene al menos un servicio de peluquería"
    )
    tiene_veterinaria = fields.Boolean(
        string='Tiene Veterinaria',
        compute='_compute_servicios_count',
        store=True,
        index=True,
        help="Indica si el presupuesto tiene al menos un servicio veterinario"
    )
    tiene_ambos_servicios = fields.Boolean(
        string='Tiene Ambos Servicios',
        compute='_compute_servicios_count',
        store=True,
        index=True,
        help="Indica si el presupuesto tiene servicios de peluquería y veterinaria"
    )
    tiene_servicios = fields.Boolean(
        string='Tiene Servicios',
        compute='_compute_has_services',
        store=True,
        index=True,
        help="Indica si el presupuesto tiene algún servicio"
    )

    # Tipo de servicio
    tipo_servicio = fields.Selection([
        ('solo_peluqueria', 'Solo Peluquería'),
        ('solo_veterinaria', 'Solo Veterinaria'),
        ('ambos', 'Peluquería y Veterinaria'),
        ('ninguno', 'Sin Servicios'),
    ], compute='_compute_servicios_count', store=True, index=True, help="Tipo de servicio del presupuesto")

    # Campos relacionados para filtros y búsquedas
    fecha_presupuesto = fields.Datetime(
        string='Fecha de Presupuesto',
        related='date_order',
        store=True,
        index=True,
        readonly=True,
        help="Fecha en que se creó el presupuesto"
    )
    cliente_id = fields.Many2one(
        'res.partner',
        string='Cliente',
        related='partner_id',
        store=True,
        index=True,
        readonly=True,
        help="Cliente asociado al presupuesto"
    )
    estado_presupuesto = fields.Selection(
        related='state',
        string='Estado del Presupuesto',
        store=True,
        index=True,
        readonly=True,
        help="Estado actual del presupuesto"
    )

    # Flags de estado para filtros rápidos
    is_confirmed = fields.Boolean(
        string='Confirmado',
        compute='_compute_is_confirmed',
        store=True,
        index=True,
        help="Indica si el presupuesto está confirmado"
    )
    is_done = fields.Boolean(
        string='Hecho',
        compute='_compute_is_done',
        store=True,
        index=True,
        help="Indica si el presupuesto está marcado como hecho"
    )
    is_cancelled = fields.Boolean(
        string='Cancelado',
        compute='_compute_is_cancelled',
        store=True,
        index=True,
        help="Indica si el presupuesto está cancelado"
    )

    # Métodos compute

    @api.depends('mascota_line_ids.mascota_id')
    def _compute_count_total_mascotas(self):
        for order in self:
            # Contar mascotas únicas (sin duplicados)
            mascota_ids = set(order.mascota_line_ids.mapped('mascota_id.id'))
            order.count_total_mascotas = len(mascota_ids)

    @api.depends('mascota_line_ids')
    def _compute_count_mascotas_presupuesto(self):
        for order in self:
            # Contar todas las líneas de mascota en el presupuesto
            order.count_mascotas_presupuesto = len(order.mascota_line_ids)

    @api.depends('mascota_line_ids')
    def _compute_count_total_servicios(self):
        for order in self:
            total_servicios = 0
            for line in order.mascota_line_ids:
                servicios_pelu = sum([
                    bool(line.servicio_peluqueria), bool(line.bano), bool(line.corte),
                    bool(line.acicalado), bool(line.rapado), bool(line.deslanado),
                    bool(line.profilaxis), bool(line.tinte), bool(line.corte_unas),
                    bool(line.limpieza_oidos), bool(line.mantenimiento)
                ])
                servicios_vete = sum([
                    bool(line.servicio_veterinaria), bool(line.vacunacion), bool(line.desparasitacion),
                    bool(line.consulta_general), bool(line.consulta_Derma), bool(line.cirugia_menor),
                    bool(line.analisis_sangre), bool(line.analisis_quimica)
                ])
                total_servicios += servicios_pelu + servicios_vete
            order.count_total_servicios = total_servicios

    @api.depends('mascota_line_ids.corte')
    def _compute_count_cortes(self):
        """Cuenta cuántos servicios de corte hay en este presupuesto"""
        for order in self:
            order.count_cortes = sum(1 for line in order.mascota_line_ids if line.corte)

    @api.depends('mascota_line_ids.bano', 'mascota_line_ids.corte')
    def _compute_count_bano(self):
        """Cuenta servicios de solo baño y baño con corte
        Si hay corte, el baño es obligatorio, por lo tanto:
        - Solo Baño: tiene baño pero NO tiene corte
        - Baño y Corte: tiene corte (y por lo tanto también baño)
        """
        for order in self:
            count_solo_bano = 0
            count_bano_y_corte = 0
            for line in order.mascota_line_ids:
                if line.corte:
                    # Si tiene corte, cuenta como "Baño y Corte" (baño es obligatorio)
                    count_bano_y_corte += 1
                elif line.bano:
                    # Si tiene baño pero NO tiene corte, cuenta como "Solo Baño"
                    count_solo_bano += 1
            order.count_solo_bano = count_solo_bano
            order.count_bano_y_corte = count_bano_y_corte

    @api.depends('mascota_line_ids.mascota_id')
    def _compute_nombres_mascotas(self):
        for order in self:
            nombres = order.mascota_line_ids.mapped('mascota_id.display_name')
            order.nombres_mascotas = ', '.join(nombres) if nombres else ''

    @api.depends('mascota_line_ids.mascota_id')
    def _compute_mascotas_asignadas_ids(self):
        """Calcula las mascotas que tienen línea de servicio en este presupuesto"""
        for order in self:
            order.mascotas_asignadas_ids = order.mascota_line_ids.mapped('mascota_id')

    @api.depends(
        'mascota_line_ids.servicio_peluqueria', 'mascota_line_ids.bano', 'mascota_line_ids.corte',
        'mascota_line_ids.acicalado', 'mascota_line_ids.rapado', 'mascota_line_ids.deslanado',
        'mascota_line_ids.profilaxis', 'mascota_line_ids.tinte', 'mascota_line_ids.corte_unas',
        'mascota_line_ids.limpieza_oidos', 'mascota_line_ids.mantenimiento',
        'mascota_line_ids.servicio_veterinaria', 'mascota_line_ids.vacunacion', 'mascota_line_ids.desparasitacion',
        'mascota_line_ids.consulta_general', 'mascota_line_ids.consulta_Derma',
        'mascota_line_ids.cirugia_menor', 'mascota_line_ids.analisis_sangre',
        'mascota_line_ids.analisis_quimica'
    )
    def _compute_servicios_count(self):
        for order in self:
            count_pelu, count_vete = 0, 0
            for line in order.mascota_line_ids:
                if any([
                    line.servicio_peluqueria, line.bano, line.corte, line.acicalado,
                    line.rapado, line.deslanado, line.profilaxis, line.tinte,
                    line.corte_unas, line.limpieza_oidos, line.mantenimiento
                ]):
                    count_pelu += 1
                if any([
                    line.servicio_veterinaria, line.vacunacion, line.desparasitacion,
                    line.consulta_general, line.consulta_Derma, line.cirugia_menor,
                    line.analisis_sangre, line.analisis_quimica
                ]):
                    count_vete += 1
            
            order.count_peluqueria = count_pelu
            order.count_veterinaria = count_vete
            order.tiene_peluqueria = count_pelu > 0
            order.tiene_veterinaria = count_vete > 0
            order.tiene_ambos_servicios = count_pelu > 0 and count_vete > 0
            order.tipo_servicio = (
                'ambos' if count_pelu and count_vete else
                'solo_peluqueria' if count_pelu else
                'solo_veterinaria' if count_vete else
                'ninguno'
            )

    @api.depends('tipo_servicio')
    def _compute_has_services(self):
        for order in self:
            order.tiene_servicios = order.tipo_servicio != 'ninguno'

    @api.depends('state')
    def _compute_is_confirmed(self):
        for order in self:
            order.is_confirmed = order.state == 'sale'

    @api.depends('state')
    def _compute_is_done(self):
        for order in self:
            order.is_done = order.state == 'done'

    @api.depends('state')
    def _compute_is_cancelled(self):
        for order in self:
            order.is_cancelled = order.state == 'cancel'

    # Validaciones y restricciones

    @api.constrains('mascota_line_ids')
    def _check_no_duplicate_mascota_lines(self):
        # Solo validar si no estamos en modo test o si se especifica explícitamente
        if self.env.context.get('skip_duplicate_check', False):
            return
        for order in self:
            # Solo validar si hay mascotas asignadas (evitar errores en tests)
            mascota_ids = [mid for mid in order.mascota_line_ids.mapped('mascota_id.id') if mid]
            if len(mascota_ids) != len(set(mascota_ids)):
                raise ValidationError(_("No puede haber mascotas duplicadas en el presupuesto."))

    # Métodos de creación y escritura
    def write(self, vals):
        """Guardar automáticamente el presupuesto si no está guardado y se está agregando una mascota"""
        # Si el presupuesto no está guardado (no tiene id) y se está modificando mascota_line_ids
        # o si se está escribiendo cualquier campo y hay mascota_line_ids en memoria, guardar primero
        for order in self:
            if not order.id and order.partner_id:
                # El presupuesto no está guardado pero tiene cliente
                # Si se está agregando una mascota (mascota_line_ids en vals o ya existe en memoria)
                # o si simplemente se está escribiendo cualquier campo, guardar el presupuesto primero
                if 'mascota_line_ids' in vals or order.mascota_line_ids:
                    try:
                        # Guardar el presupuesto con los campos mínimos
                        order_vals = {
                            'partner_id': order.partner_id.id,
                        }
                        if hasattr(order, 'date_order') and order.date_order:
                            order_vals['date_order'] = order.date_order
                        # Hacer un write para forzar el guardado
                        order.write(order_vals)
                        _logger.info("Presupuesto guardado automáticamente antes de agregar mascota: %s", order.id if order.id else 'N/A')
                    except Exception as e:
                        _logger.warning("No se pudo guardar presupuesto automáticamente: %s", e)
                        # Continuar de todas formas, el error se mostrará en mascota_line.create si es necesario
        
        return super().write(vals)

    # Métodos de acción

    def action_confirm(self):
        # Validar solo si hay mascotas y están configuradas
        # Permitir confirmar órdenes sin mascotas (compatibilidad con tests e integraciones)
        # Solo validar si estamos en un contexto real (no en tests)
        if not self.env.context.get('skip_mascota_validation', False):
            for order in self:
                if order.mascota_line_ids:
                    mascotas_sin_servicio = []
                    for line in order.mascota_line_ids:
                        # Solo validar si la línea tiene una mascota asignada y está en un estado que requiere validación
                        if line.mascota_id and line.estado_servicio not in ['cancelado', 'no_se_presento']:
                            if not any([
                                line.servicio_peluqueria, line.bano, line.corte, line.acicalado,
                                line.rapado, line.deslanado, line.profilaxis, line.tinte,
                                line.corte_unas, line.limpieza_oidos, line.mantenimiento,
                                line.servicio_veterinaria, line.vacunacion, line.desparasitacion,
                                line.consulta_general, line.consulta_Derma, line.cirugia_menor,
                                line.analisis_sangre, line.analisis_quimica
                            ]):
                                mascotas_sin_servicio.append(line.mascota_id.display_name or 'Sin nombre')
                    
                    if mascotas_sin_servicio:
                        mascotas_str = ', '.join(mascotas_sin_servicio)
                        # Detectar si viene desde POS para mostrar un mensaje más amigable
                        # Verificar múltiples formas de detectar que viene desde POS
                        context_str = str(self.env.context)
                        from_pos = (
                            self.env.context.get('from_pos', False) or 
                            self.env.context.get('pos_session_id', False) or
                            self.env.context.get('active_model') == 'pos.order' or
                            'pos' in str(self.env.context.get('active_model', '')).lower() or
                            'sync_from_ui' in context_str.lower() or
                            'pos.order' in context_str.lower()
                        )
                        
                        # Siempre usar UserError para que se muestre como popup en POS
                        # UserError se muestra mejor que ValidationError en interfaces de usuario
                        raise UserError(
                            _("⚠️ No se puede confirmar el pedido\n\n"
                              "Las siguientes mascotas deben tener al menos un servicio seleccionado:\n\n"
                              "%s\n\n"
                              "Por favor, seleccione un servicio para cada mascota antes de confirmar.") % mascotas_str
                        )

        return super().action_confirm()

    def _create_invoices(self, grouped=False, final=False, date=None):
        """
        Sobrescribe el método de creación de facturas para validar que todas las mascotas
        tengan al menos un servicio seleccionado antes de facturar.
        También valida que las líneas de productos de Peluquería/Clínica tengan mascota asignada.
        """
        # Validar que todas las mascotas tengan servicios antes de facturar
        if not self.env.context.get('skip_mascota_validation', False):
            for order in self:
                # Validar que líneas de Peluquería/Clínica tengan mascota asignada
                lineas_sin_mascota = []
                for line in order.order_line:
                    if line.product_id and (line.es_categoria_peluqueria or line.es_categoria_clinica):
                        # Verificar si hay mascotas disponibles en el presupuesto
                        if order.mascotas_asignadas_ids and not line.mascota_id:
                            producto_nombre = line.product_id.display_name
                            tipo_servicio = 'Peluquería' if line.es_categoria_peluqueria else 'Clínica'
                            if line.es_categoria_peluqueria and line.es_categoria_clinica:
                                tipo_servicio = 'Peluquería o Clínica'
                            lineas_sin_mascota.append(f"• {producto_nombre} ({tipo_servicio})")
                
                if lineas_sin_mascota:
                    lineas_str = '\n'.join(lineas_sin_mascota)
                    raise UserError(
                        _("⚠️ No se puede facturar el pedido\n\n"
                          "Las siguientes líneas de productos de Peluquería/Clínica requieren seleccionar una mascota:\n\n"
                          "%s\n\n"
                          "Por favor, seleccione una mascota en la columna 'Mascota' para cada línea antes de facturar.") % lineas_str
                    )
                
                if order.mascota_line_ids:
                    mascotas_sin_servicio = []
                    for line in order.mascota_line_ids:
                        # Solo validar si la línea tiene una mascota asignada y está en un estado que requiere validación
                        if line.mascota_id and line.estado_servicio not in ['cancelado', 'no_se_presento']:
                            tiene_servicio = any([
                                line.servicio_peluqueria, line.bano, line.corte, line.acicalado,
                                line.rapado, line.deslanado, line.profilaxis, line.tinte,
                                line.corte_unas, line.limpieza_oidos, line.mantenimiento,
                                line.servicio_veterinaria, line.vacunacion, line.desparasitacion,
                                line.consulta_general, line.consulta_Derma, line.cirugia_menor,
                                line.analisis_sangre, line.analisis_quimica
                            ])
                            if not tiene_servicio:
                                mascotas_sin_servicio.append(line.mascota_id.display_name or 'Sin nombre')
                    
                    if mascotas_sin_servicio:
                        mascotas_str = ', '.join(mascotas_sin_servicio)
                        # Detectar si viene desde POS para mostrar un mensaje más amigable
                        # Verificar múltiples formas de detectar que viene desde POS
                        from_pos = (
                            self.env.context.get('from_pos', False) or 
                            self.env.context.get('pos_session_id', False) or
                            self.env.context.get('active_model') == 'pos.order' or
                            'pos' in str(self.env.context.get('active_model', '')).lower()
                        )
                        
                        if from_pos:
                            # Usar UserError para POS, que se muestra mejor como popup
                            raise UserError(
                                _("⚠️ No se puede facturar el pedido\n\n"
                                  "Las siguientes mascotas deben tener al menos un servicio seleccionado:\n\n"
                                  "%s\n\n"
                                  "Por favor, seleccione un servicio para cada mascota antes de facturar.") % mascotas_str
                            )
                        else:
                            # Usar UserError también para otros contextos, ya que es más amigable
                            # y se muestra como popup tanto en web como en POS
                            raise UserError(
                                _("No se puede facturar el pedido.\n\n"
                                  "Las siguientes mascotas deben tener al menos un servicio seleccionado:\n\n"
                                  "%s\n\n"
                                  "Por favor, seleccione un servicio para cada mascota antes de facturar.") % mascotas_str
                            )
        
        return super()._create_invoices(grouped=grouped, final=final, date=date)

    def name_get(self):
        # No usar HTML en name_get, solo texto plano
        tipo_texto = {
            'solo_peluqueria': '[Peluquería]',
            'solo_veterinaria': '[Veterinaria]',
            'ambos': '[Peluquería + Veterinaria]',
            'ninguno': '[Sin Servicios]',
        }
        result = []
        for order in self:
            tag = tipo_texto.get(order.tipo_servicio, '')
            name = order.name or ''
            display_name = f"{name} {tag}" if tag else name
            result.append((order.id, display_name))
        return result

    # ==================== INTEGRACIÓN CON POS ====================
    
    def _get_sale_order_line_fields(self):
        """Campos de sale.order.line para enviar al POS cuando se carga un presupuesto"""
        fields = super()._get_sale_order_line_fields()
        # Agregar campos de mascota y estilistas (ahora Many2many)
        # mascota_id_valor es un Integer para evitar problemas con Many2one a modelo de Studio
        fields.extend(['estilista_ids', 'estilista_nombres', 'mascota_id', 'mascota_id_valor', 'mascota_nombre'])
        return fields
    
    def _get_fields_for_draft_order_lines(self):
        """Campos adicionales para enviar al POS cuando se carga un presupuesto"""
        fields = []
        if hasattr(super(), '_get_fields_for_draft_order_lines'):
            fields = super()._get_fields_for_draft_order_lines()
        # Agregar campos de mascota y estilistas (ahora Many2many)
        fields.extend(['estilista_ids', 'estilista_nombres', 'mascota_id', 'mascota_nombre'])
        return fields

    def read_for_pos(self):
        """Leer datos del presupuesto para el POS, incluyendo estilistas"""
        result = {}
        if hasattr(super(), 'read_for_pos'):
            result = super().read_for_pos()
        
        # Agregar información de líneas con estilistas (ahora Many2many)
        lines_data = []
        for line in self.order_line:
            line_data = {
                'id': line.id,
                'product_id': line.product_id.id,
                'estilista_ids': line.estilista_ids.ids if line.estilista_ids else [],
                'estilista_nombres': line.estilista_nombres or '',
                'mascota_id': line.mascota_id.id if line.mascota_id else False,
                'mascota_name': line.mascota_id.display_name if line.mascota_id else '',
            }
            lines_data.append(line_data)
        
        result['order_lines_extra'] = lines_data
        return result
