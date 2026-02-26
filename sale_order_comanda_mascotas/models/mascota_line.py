from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)

class MascotaLine(models.Model):
    _name = 'x.mascota.line'
    _description = 'Detalle por Mascota en Pedido'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'fecha_programada desc, create_date desc, id desc'
    _rec_name = 'display_name'

    def _auto_init(self):
        """Asegurar que las columnas y tablas necesarias existen y migrar datos"""
        res = super()._auto_init()
        cr = self._cr
        
        # 1. Verificar si la columna tiempo_total_responsables existe
        cr.execute("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'x_mascota_line' 
                AND column_name = 'tiempo_total_responsables'
            );
        """)
        columna_existe = cr.fetchone()[0]
        
        if not columna_existe:
            _logger.info('Creando columna tiempo_total_responsables en x_mascota_line')
            cr.execute("""
                ALTER TABLE x_mascota_line 
                ADD COLUMN tiempo_total_responsables double precision;
            """)
        
        # 2. Crear tabla relacional para responsable_peluqueria (Many2many) si no existe
        cr.execute("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                  AND table_name = 'x_mascota_line_responsable_peluqueria_rel'
            );
        """)
        tabla_rel_existe = cr.fetchone()[0]
        
        if not tabla_rel_existe:
            _logger.info("Creando tabla x_mascota_line_responsable_peluqueria_rel")
            cr.execute("""
                CREATE TABLE x_mascota_line_responsable_peluqueria_rel (
                    mascota_line_id INTEGER NOT NULL REFERENCES x_mascota_line(id) ON DELETE CASCADE,
                    employee_id INTEGER NOT NULL REFERENCES hr_employee(id) ON DELETE CASCADE,
                    PRIMARY KEY (mascota_line_id, employee_id)
                );
            """)
            cr.execute("CREATE INDEX x_mascota_line_resp_pel_rel_line_idx ON x_mascota_line_responsable_peluqueria_rel (mascota_line_id);")
            cr.execute("CREATE INDEX x_mascota_line_resp_pel_rel_emp_idx ON x_mascota_line_responsable_peluqueria_rel (employee_id);")
            _logger.info("Tabla x_mascota_line_responsable_peluqueria_rel creada correctamente")
        
        # 3. Migrar datos de responsable_peluqueria (Many2one antiguo) a la nueva tabla relacional
        cr.execute("""
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                  AND table_name = 'x_mascota_line' 
                  AND column_name = 'responsable_peluqueria'
                  AND data_type = 'integer'
            );
        """)
        columna_m2o_existe = cr.fetchone()[0]
        
        if columna_m2o_existe:
            # Migrar datos existentes de la columna Many2one a la tabla relacional
            cr.execute("""
                INSERT INTO x_mascota_line_responsable_peluqueria_rel (mascota_line_id, employee_id)
                SELECT id, responsable_peluqueria
                FROM x_mascota_line
                WHERE responsable_peluqueria IS NOT NULL
                AND NOT EXISTS (
                      SELECT 1 FROM x_mascota_line_responsable_peluqueria_rel rel
                      WHERE rel.mascota_line_id = x_mascota_line.id
                        AND rel.employee_id = x_mascota_line.responsable_peluqueria
                );
            """)
            if cr.rowcount > 0:
                _logger.info("Migrados %s registros de responsable_peluqueria a la nueva tabla relacional", cr.rowcount)
            
            # IMPORTANTE: Eliminar la columna INTEGER antigua para evitar conflictos con Many2many
            _logger.info("Eliminando columna responsable_peluqueria (INTEGER) antigua de x_mascota_line")
            cr.execute("""
                ALTER TABLE x_mascota_line DROP COLUMN IF EXISTS responsable_peluqueria;
            """)
            _logger.info("Columna responsable_peluqueria eliminada correctamente")
        
        return res

    order_id = fields.Many2one(
        'sale.order',
        string='Presupuesto',
        required=False,
        ondelete='cascade',
        index=True,
        help="Se asigna automáticamente al agregar desde el presupuesto.",
        default=lambda self: self.env.context.get('default_order_id'),
    )

    presupuesto_numero = fields.Char(
        string='N° Presupuesto',
        compute='_compute_presupuesto_numero',
        store=True,
        readonly=True,
    )

    cliente_id = fields.Many2one(
        'res.partner',
        related='order_id.partner_id',
        string='Cliente',
        store=True,
        readonly=True,
    )

    mascota_id = fields.Many2one(
        'x_mascota',
        string='Mascota',
        required=True,
        domain="[('x_studio_partner_id', '=', cliente_id)]",
        ondelete='restrict',
        help="Solo aparecen las mascotas asociadas al cliente del presupuesto.",
    )

    especie = fields.Selection(
        related='mascota_id.x_studio_tipo_de_mascota',
        string='Tipo de Mascota',
        store=True,
        readonly=True,
    )
    raza = fields.Char(
        related='mascota_id.x_studio_many2one_field_bo9ng.x_name',
        string='Raza',
        store=True,
        readonly=True,
    )

    servicio_veterinaria = fields.Boolean(string='Veterinaria')
    servicio_peluqueria = fields.Boolean(string='Peluquería')

    vacunacion = fields.Boolean(string='Vacunación')
    desparasitacion = fields.Boolean(string='Desparasitación')
    consulta_general = fields.Boolean(string='Consulta General')
    consulta_Derma = fields.Boolean(string='Consulta Dermatologica')
    # Alias para mantener convención snake_case sin migración de DB.
    # Se mantiene consulta_Derma como campo "real" (ya existe en base de datos).
    consulta_derma = fields.Boolean(
        string='Consulta Dermatológica',
        compute='_compute_consulta_derma',
        inverse='_inverse_consulta_derma',
        store=False,
        help="Alias de 'consulta_Derma' para evitar inconsistencias de nomenclatura."
    )
    cirugia_menor = fields.Boolean(string='Cirugía Menor')
    analisis_sangre = fields.Boolean(string='Hemograma')
    analisis_quimica = fields.Boolean(string='Quimica')

    bano = fields.Boolean(string='Baño')
    corte = fields.Boolean(string='Corte')
    acicalado = fields.Boolean(string='Acicalado')
    mantenimiento = fields.Boolean(string='Recorte de Mantenimiento')
    rapado = fields.Boolean(string='Rapado')
    deslanado = fields.Boolean(string='Deslanado')
    profilaxis = fields.Boolean(string='Profilaxis sin anestesia')
    tinte = fields.Boolean(string='Tinte')
    corte_unas = fields.Boolean(string='Corte de Uñas')
    limpieza_oidos = fields.Boolean(string='Limpieza de Oídos')

    motivo_visita = fields.Char(string='Motivo de Visita')
    observaciones = fields.Text(string='Observaciones del Doctor o Estilista')
    observaciones_cliente = fields.Text(string='Observaciones del Cliente')

    estado_servicio = fields.Selection([
        ('pendiente', 'Pendiente'),
        ('confirmado', 'Confirmado'),
        ('en_proceso', 'En Proceso'),
        ('terminado', 'Terminado'),
        ('entregado', 'Entregado'),
        ('no_se_presento', 'No se presentó'),
        ('cancelado', 'Cancelado'),
    ], string='Estado del Servicio', default='pendiente', index=True, tracking=True)

    prioridad = fields.Selection([
        ('baja', 'Baja'),
        ('normal', 'Normal'),
        ('alta', 'Alta'),
        ('urgente', 'Urgente'),
    ], string='Prioridad', default='normal')
    
    # Servicio Express - agrega línea automática con producto BEXPRESS
    peluqueria_express = fields.Boolean(
        string='Peluquería Express',
        default=False,
        tracking=True,
        help="Servicio de peluquería express. Al activar, se agrega automáticamente una línea con el producto BEXPRESS."
    )

    fecha_programada = fields.Datetime(string='Fecha Programada', index=True)
    fecha_inicio = fields.Datetime(string='Fecha de Inicio')
    fecha_fin = fields.Datetime(string='Fecha de Finalización')
    fecha_entrega = fields.Datetime(string='Fecha de Entrega')

    responsable_peluqueria = fields.Many2many(
        'hr.employee',
        'x_mascota_line_responsable_peluqueria_rel',
        'mascota_line_id',
        'employee_id',
        string='Estilistas Responsables',
        tracking=True,
        domain="[('job_id.name', '=', 'Peluquero')]",
        help="Estilistas asignados para servicios de peluquería (para división de comisiones)"
    )
    
    # Campo de compatibilidad para código que espera Many2one
    responsable_peluqueria_principal = fields.Many2one(
        'hr.employee',
        string='Estilista Principal',
        compute='_compute_responsable_peluqueria_principal',
        store=False,
        help="Primer estilista de la lista (para compatibilidad)"
    )
    responsable_veterinaria = fields.Many2one(
        'hr.employee',
        string='Veterinario Responsable',
        tracking=True,
        domain="[('job_id.name', '=', 'Médico Veterinario')]",
        help="Veterinario principal asignado para servicios veterinarios"
    )

    # Historial detallado de atención
    historial_atencion_ids = fields.One2many(
        'x.mascota.atencion.historial',
        'mascota_line_id',
        string='Historial de Atención',
        help="Registro detallado de quién atendió a la mascota y cuándo"
    )

    count_historial_atencion = fields.Integer(
        string='Registros de Atención',
        compute='_compute_count_historial',
        store=False
    )

    tiempo_total_responsables = fields.Float(
        string='Tiempo Total Trabajado (horas)',
        compute='_compute_tiempo_total_responsables',
        store=True,
        help="Suma total de horas trabajadas por todos los responsables"
    )

    responsables_asignados = fields.Char(
        string='Responsables Asignados',
        compute='_compute_responsables_asignados',
        store=True,
        help="Lista de responsables asignados a esta mascota"
    )
    
    # Campo para mostrar nombres de estilistas en Kanban/vistas
    nombres_estilistas = fields.Char(
        string='Estilistas',
        compute='_compute_nombres_estilistas',
        store=True,
        help="Nombres de los estilistas separados por coma"
    )
    
    tipo_servicio_display = fields.Char(
        string='Tipo de Servicio',
        compute='_compute_tipo_servicio_display',
        store=True,
        help="Tipo de servicio: Peluquería, Veterinaria o Ambos"
    )
    
    responsable_display = fields.Many2one(
        'hr.employee',
        string='Responsable',
        compute='_compute_responsable_display',
        store=True,
        help="Responsable principal (Peluquería o Veterinaria según corresponda)"
    )

    # Estados granulares por servicio
    estado_peluqueria = fields.Selection([
        ('no_iniciado', 'No Iniciado'),
        ('en_espera', 'En Espera'),
        ('iniciado', 'Iniciado'),
        ('en_proceso', 'En Proceso'),
        ('pausado', 'Pausado'),
        ('completado', 'Completado'),
    ], string='Estado Peluquería', default='no_iniciado', tracking=True)

    estado_veterinaria = fields.Selection([
        ('no_iniciado', 'No Iniciado'),
        ('en_espera', 'En Espera'),
        ('iniciado', 'Iniciado'),
        ('en_proceso', 'En Proceso'),
        ('pausado', 'Pausado'),
        ('completado', 'Completado'),
    ], string='Estado Veterinaria', default='no_iniciado', tracking=True)

    # Checklist de tareas
    checklist_peluqueria = fields.One2many(
        'x.mascota.checklist',
        'mascota_line_id',
        domain=[('tipo_servicio', '=', 'peluqueria')],
        string='Checklist Peluquería'
    )

    checklist_veterinaria = fields.One2many(
        'x.mascota.checklist',
        'mascota_line_id',
        domain=[('tipo_servicio', '=', 'veterinaria')],
        string='Checklist Veterinaria'
    )

    foto_llegada = fields.Image(string='Foto Llegada', max_width=1024, max_height=1024)
    foto_salida = fields.Image(string='Foto Salida', max_width=1024, max_height=1024)
    foto_proceso = fields.Image(string='Foto Durante Proceso', max_width=1024, max_height=1024)

    display_name = fields.Char(string='Nombre', compute='_compute_display_name', store=True)
    total_servicios = fields.Integer(string='Total Servicios', compute='_compute_total_servicios', store=True)
    duracion_estimada = fields.Float(string='Duración Estimada (horas)', compute='_compute_duracion_estimada', store=True)
    duracion_real = fields.Float(string='Duración Real (horas)', compute='_compute_duracion_real', store=True)
    tiempo_restante = fields.Float(string='Tiempo Restante (horas)', compute='_compute_tiempo_restante')
    numero_secuencia = fields.Char(string='Número de Secuencia', copy=False, readonly=True)
    
    # Contador de cortes históricos de la mascota
    count_cortes_historicos = fields.Integer(
        string='Cortes Totales',
        compute='_compute_count_cortes_historicos',
        store=True,
        help="Cantidad total de veces que esta mascota ha tenido servicio de corte (histórico)"
    )

    @api.model_create_multi
    def create(self, vals_list):
        new_vals_list = []
        skip_validation = self.env.context.get('skip_mascota_line_validation', False)
        
        for vals in vals_list:
            order = None

            if vals.get('order_id'):
                order = self.env['sale.order'].browse(vals['order_id'])
            elif self.env.context.get('default_order_id'):
                order = self.env['sale.order'].browse(self.env.context.get('default_order_id'))

            # Solo validar si no estamos en modo test o si se especifica explícitamente
            if not skip_validation:
                if not order or not order.exists():
                    raise ValidationError(_("Debe guardar el presupuesto antes de agregar líneas de mascota."))

                if not order.partner_id:
                    raise ValidationError(_("Debe asignar un cliente antes de agregar mascotas."))

                # Si el presupuesto no está guardado (no tiene id), guardarlo automáticamente
                if not order.id:
                    try:
                        # El presupuesto existe en memoria pero no está guardado
                        # Necesitamos guardarlo antes de poder crear la mascota_line
                        # En Odoo, cuando un registro nuevo (sin id) recibe un write, se guarda automáticamente
                        # Hacer un write con los campos mínimos para forzar el guardado
                        order.write({
                            'partner_id': order.partner_id.id,
                        })
                        
                        # Verificar que ahora tiene id
                        if not order.id:
                            # Si aún no tiene id, el presupuesto podría necesitar campos adicionales
                            # Intentar guardar con más campos si están disponibles
                            write_vals = {'partner_id': order.partner_id.id}
                            if hasattr(order, 'date_order') and order.date_order:
                                write_vals['date_order'] = order.date_order
                            order.write(write_vals)
                        
                        # Si después de intentar guardar aún no tiene id, mostrar error
                        if not order.id:
                            _logger.warning("Presupuesto aún sin id después de write")
                            raise ValidationError(_("El presupuesto debe estar guardado antes de agregar mascotas. Por favor, guarde el presupuesto primero haciendo clic en 'Guardar'."))
                        
                        _logger.info("Presupuesto guardado automáticamente al agregar mascota: %s", order.id)
                    except ValidationError:
                        # Re-lanzar ValidationError sin modificar
                        raise
                    except Exception as e:
                        _logger.error("Error al guardar presupuesto automáticamente: %s", e)
                        raise ValidationError(_("No se pudo guardar el presupuesto automáticamente. Por favor, guarde el presupuesto manualmente antes de agregar mascotas."))

            # Asignar order_id si existe y está guardado
            if order and order.exists() and order.id:
                vals['order_id'] = order.id
            elif not skip_validation:
                # Si después de intentar guardar aún no tiene id, error
                raise ValidationError(_("El presupuesto debe estar guardado antes de agregar líneas de mascota."))

            if 'numero_secuencia' not in vals or not vals['numero_secuencia']:
                vals['numero_secuencia'] = self.env['ir.sequence'].next_by_code('x.mascota.line.seq') or '/'

            new_vals_list.append(vals)

        records = super().create(new_vals_list)
        
        # Crear checklist automáticamente después de crear los registros
        # Usar sudo() para asegurar permisos y manejar errores silenciosamente
        try:
            for record in records:
                # Crear checklist de peluquería si hay servicios de peluquería
                if record.servicio_peluqueria:
                    try:
                        record.env['x.mascota.checklist'].sudo().create_default_checklist_peluqueria(record.id)
                    except Exception as e:
                        _logger.warning(f"No se pudo crear checklist de peluquería para mascota {record.id}: {e}")
                
                # Crear checklist de veterinaria si hay servicios veterinarios
                if record.servicio_veterinaria:
                    try:
                        record.env['x.mascota.checklist'].sudo().create_default_checklist_veterinaria(record.id)
                    except Exception as e:
                        _logger.warning(f"No se pudo crear checklist de veterinaria para mascota {record.id}: {e}")
        except Exception as e:
            _logger.error(f"Error al crear checklist automático: {e}")
            # No relanzar el error, solo loguearlo
        
        # Crear líneas express para registros con peluqueria_express activo
        records_express = records.filtered(lambda r: r.peluqueria_express)
        if records_express:
            records_express._crear_linea_express()
        
        return records

    @api.depends('order_id.name')
    def _compute_presupuesto_numero(self):
        for record in self:
            record.presupuesto_numero = record.order_id.name or ''

    @api.depends('mascota_id', 'order_id.name', 'numero_secuencia')
    def _compute_display_name(self):
        for record in self:
            parts = [record.mascota_id.display_name or 'Mascota']
            if record.order_id.name:
                parts.append(record.order_id.name)
            if record.numero_secuencia:
                parts.append(f"#{record.numero_secuencia}")
            record.display_name = " - ".join(parts)

    @api.depends(
        'servicio_peluqueria', 'bano', 'corte', 'acicalado', 'rapado', 'deslanado',
        'profilaxis', 'tinte', 'corte_unas', 'limpieza_oidos', 'mantenimiento',
        'servicio_veterinaria', 'vacunacion', 'desparasitacion', 'consulta_general',
        'consulta_Derma', 'cirugia_menor', 'analisis_sangre', 'analisis_quimica'
    )
    def _compute_total_servicios(self):
        for record in self:
            servicios = [
                record.servicio_peluqueria, record.bano, record.corte, record.acicalado, record.rapado, record.deslanado,
                record.profilaxis, record.tinte, record.corte_unas, record.limpieza_oidos, record.mantenimiento,
                record.servicio_veterinaria, record.vacunacion, record.desparasitacion, record.consulta_general,
                record.consulta_Derma, record.cirugia_menor, record.analisis_sangre, record.analisis_quimica
            ]
            record.total_servicios = sum(1 for s in servicios if s)

    @api.depends('consulta_Derma')
    def _compute_consulta_derma(self):
        for record in self:
            record.consulta_derma = bool(record.consulta_Derma)

    def _inverse_consulta_derma(self):
        for record in self:
            record.consulta_Derma = bool(record.consulta_derma)

    @api.depends('fecha_inicio', 'fecha_fin')
    def _compute_duracion_real(self):
        for record in self:
            if record.fecha_inicio and record.fecha_fin:
                delta = record.fecha_fin - record.fecha_inicio
                record.duracion_real = delta.total_seconds() / 3600.0
            else:
                record.duracion_real = 0.0

    @api.depends('fecha_inicio', 'duracion_estimada', 'estado_servicio')
    def _compute_tiempo_restante(self):
        for record in self:
            if record.estado_servicio == 'en_proceso' and record.fecha_inicio and record.duracion_estimada:
                tiempo_transcurrido = (fields.Datetime.now() - record.fecha_inicio).total_seconds() / 3600.0
                record.tiempo_restante = max(0, record.duracion_estimada - tiempo_transcurrido)
            else:
                record.tiempo_restante = 0.0

    @api.depends('mascota_id', 'corte')
    def _compute_count_cortes_historicos(self):
        """Cuenta cuántos cortes ha tenido esta mascota en total (histórico)"""
        if not self:
            return
        
        # Obtener todas las mascotas únicas de los registros actuales
        mascotas = self.mapped('mascota_id').filtered(lambda m: m)
        
        if not mascotas:
            # Si no hay mascotas, establecer todos los valores en 0
            for record in self:
                record.count_cortes_historicos = 0
            return
        
        # Usar una consulta SQL directa para obtener todos los conteos de una vez
        # Esto es mucho más eficiente que hacer múltiples search_count
        mascota_ids = tuple(mascotas.ids)
        self.env.cr.execute("""
            SELECT mascota_id, COUNT(*) as count
            FROM x_mascota_line
            WHERE mascota_id IN %s
              AND corte = true
            GROUP BY mascota_id
        """, (mascota_ids,))
        
        # Crear un diccionario con los conteos por mascota
        counts_by_mascota = {row[0]: row[1] for row in self.env.cr.fetchall()}
        
        # Asignar valores a cada registro
        for record in self:
            if record.mascota_id and record.mascota_id.id in counts_by_mascota:
                record.count_cortes_historicos = counts_by_mascota[record.mascota_id.id]
            else:
                record.count_cortes_historicos = 0

    @api.depends(
        'bano', 'corte', 'mantenimiento', 'acicalado', 'rapado', 'deslanado', 'profilaxis', 'tinte',
        'corte_unas', 'limpieza_oidos', 'consulta_general', 'consulta_Derma', 'vacunacion',
        'desparasitacion', 'cirugia_menor', 'analisis_sangre', 'analisis_quimica'
    )
    def _compute_duracion_estimada(self):
        for record in self:
            duracion = 0.0
            if record.bano: duracion += 0.5
            if record.corte: duracion += 1.0
            if record.mantenimiento: duracion += 0.75
            if record.acicalado: duracion += 1.0
            if record.rapado: duracion += 2.0
            if record.deslanado: duracion += 1.0
            if record.profilaxis: duracion += 0.5
            if record.tinte: duracion += 0.10
            if record.corte_unas: duracion += 0.25
            if record.limpieza_oidos: duracion += 0.25
            if record.consulta_general: duracion += 0.25
            if record.consulta_Derma: duracion += 0.6
            if record.vacunacion: duracion += 0.25
            if record.desparasitacion: duracion += 0.25
            if record.cirugia_menor: duracion += 1.5
            if record.analisis_sangre: duracion += 0.5
            if record.analisis_quimica: duracion += 0.5
            record.duracion_estimada = duracion

    @api.constrains('mascota_id', 'order_id')
    def _check_unique_mascota_per_order(self):
        for record in self:
            domain = [
                ('order_id', '=', record.order_id.id),
                ('mascota_id', '=', record.mascota_id.id),
                ('id', '!=', record.id)
            ]
            if self.env['x.mascota.line'].search_count(domain):
                raise ValidationError(_("Ya existe una línea para la mascota '%s' en este pedido.") % record.mascota_id.display_name)

    @api.constrains('total_servicios', 'mascota_id')
    def _check_at_least_one_service(self):
        # Permitir líneas sin servicios solo si se especifica explícitamente en contexto
        if self.env.context.get('skip_service_validation', False):
            return
        for record in self:
            # Validar siempre que haya una mascota asignada, independientemente del estado del pedido
            if record.mascota_id:
                if not record.total_servicios:
                    raise ValidationError(_("Debe seleccionar al menos un servicio para la mascota '%s'.") % (record.mascota_id.display_name or 'Sin nombre'))

    @api.constrains('servicio_peluqueria', 'bano', 'corte', 'acicalado', 'mantenimiento', 'rapado', 'deslanado', 'profilaxis', 'tinte', 'corte_unas', 'limpieza_oidos')
    def _check_peluqueria_has_specific_service(self):
        """Valida que si servicio_peluqueria está marcado, al menos un servicio específico de peluquería también debe estar marcado"""
        if self.env.context.get('skip_service_validation', False):
            return
        for record in self:
            if record.servicio_peluqueria:
                servicios_especificos = [
                    record.bano, record.corte, record.acicalado, record.mantenimiento,
                    record.rapado, record.deslanado, record.profilaxis, record.tinte,
                    record.corte_unas, record.limpieza_oidos
                ]
                if not any(servicios_especificos):
                    raise ValidationError(_("Si '¿Es Peluquería?' está marcado, debe seleccionar al menos un servicio específico de peluquería (Baño, Corte, Acicalado, etc.) para la mascota '%s'.") % (record.mascota_id.display_name or 'Sin nombre'))

    @api.constrains('servicio_veterinaria', 'vacunacion', 'desparasitacion', 'consulta_general', 'consulta_Derma', 'cirugia_menor', 'analisis_sangre', 'analisis_quimica')
    def _check_veterinaria_has_specific_service(self):
        """Valida que si servicio_veterinaria está marcado, al menos un servicio específico de veterinaria también debe estar marcado"""
        if self.env.context.get('skip_service_validation', False):
            return
        for record in self:
            if record.servicio_veterinaria:
                servicios_especificos = [
                    record.vacunacion, record.desparasitacion, record.consulta_general,
                    record.consulta_Derma, record.cirugia_menor, record.analisis_sangre,
                    record.analisis_quimica
                ]
                if not any(servicios_especificos):
                    raise ValidationError(_("Si 'Veterinaria' está marcado, debe seleccionar al menos un servicio específico de veterinaria (Vacunación, Desparasitación, Consulta General, etc.) para la mascota '%s'.") % (record.mascota_id.display_name or 'Sin nombre'))

    @api.constrains('servicio_peluqueria', 'responsable_peluqueria')
    def _check_responsable_peluqueria_required(self):
        """Valida que si hay servicio de peluquería, debe haber al menos un estilista responsable"""
        for record in self:
            if record.servicio_peluqueria and not record.responsable_peluqueria:
                raise ValidationError(_("Debe asignar al menos un estilista responsable cuando hay servicios de peluquería para la mascota '%s'.") % (record.mascota_id.display_name or 'Sin nombre'))

    @api.constrains('servicio_veterinaria', 'responsable_veterinaria')
    def _check_responsable_veterinaria_required(self):
        """Valida que si hay servicio de veterinaria, debe haber un veterinario responsable"""
        for record in self:
            if record.servicio_veterinaria and not record.responsable_veterinaria:
                raise ValidationError(_("Debe asignar un veterinario responsable cuando hay servicios veterinarios para la mascota '%s'.") % (record.mascota_id.display_name or 'Sin nombre'))

    def write(self, vals):
        if 'order_id' in vals:
            raise ValidationError(_("No se puede cambiar el presupuesto asignado a esta mascota."))
        
        # Detectar si se está activando peluqueria_express
        activando_express = vals.get('peluqueria_express', False)
        
        result = super().write(vals)
        
        # Si se activó peluqueria_express, crear línea de venta con producto BEXPRESS
        if activando_express:
            self._crear_linea_express()
        
        # Si cambió el campo 'corte', recalcular contadores históricos para todas las líneas de las mascotas afectadas
        if 'corte' in vals:
            mascotas_afectadas = self.mapped('mascota_id').filtered(lambda m: m)
            if mascotas_afectadas:
                # Usar el método compute optimizado en lugar de buscar todas las líneas
                # Buscar todas las líneas de las mascotas afectadas y recalcular
                mascota_ids = tuple(mascotas_afectadas.ids)
                lines = self.env['x.mascota.line'].search([('mascota_id', 'in', mascota_ids)])
                if lines:
                    lines._compute_count_cortes_historicos()
        
        return result
    
    def _crear_linea_express(self):
        """Crear línea de venta con producto BEXPRESS para cada mascota con express activo"""
        product = self.env['product.product'].search([
            ('default_code', '=', 'BEXPRESS')
        ], limit=1)
        
        if not product:
            _logger.warning("Producto BEXPRESS no encontrado")
            return
        
        SaleOrderLine = self.env['sale.order.line']
        
        for record in self:
            if not record.order_id or not record.mascota_id:
                continue
            
            # Verificar si ya existe una línea express para esta mascota
            linea_existente = SaleOrderLine.search([
                ('order_id', '=', record.order_id.id),
                ('product_id', '=', product.id),
                ('mascota_id', '=', record.mascota_id.id),
            ], limit=1)
            
            if linea_existente:
                _logger.info("Línea express ya existe para mascota %s", record.mascota_id.display_name)
                continue
            
            # Crear nueva línea
            vals_linea = {
                'order_id': record.order_id.id,
                'product_id': product.id,
                'name': f"{product.name} - {record.mascota_id.display_name}",
                'product_uom_qty': 1,
                'price_unit': product.lst_price,
                'mascota_id': record.mascota_id.id,
                'mascota_line_id': record.id,
            }
            
            # Agregar estilistas si existen
            if record.responsable_peluqueria:
                vals_linea['estilista_ids'] = [(6, 0, record.responsable_peluqueria.ids)]
            
            try:
                nueva_linea = SaleOrderLine.with_context(skip_mascota_validation=True).create(vals_linea)
                _logger.info("Línea express creada: %s para mascota %s", nueva_linea.id, record.mascota_id.display_name)
            except Exception as e:
                _logger.error("Error creando línea express: %s", str(e))

    def action_print_comanda(self):
        self.ensure_one()
        report_xmlid = 'sale_order_comanda_mascotas.report_ficha_mascota_action'
        report = self.env.ref(report_xmlid, raise_if_not_found=False)
        if not report:
            raise UserError(_("No se encontró el reporte QWeb con ID: %s") % report_xmlid)
        return report.report_action(self)

    def action_view_historial(self):
        """Abre el historial de atención de esta mascota"""
        self.ensure_one()
        return {
            'name': _('Historial de Atención - %s') % (self.mascota_id.x_name or ''),
            'type': 'ir.actions.act_window',
            'res_model': 'x.mascota.atencion.historial',
            'view_mode': 'list,form',
            'domain': [('mascota_line_id', '=', self.id)],
            'context': {
                'default_mascota_line_id': self.id,
                'create': True,
            },
            'target': 'current',
        }

    def action_open_form(self):
        """Abre el formulario completo de esta mascota line"""
        self.ensure_one()
        return {
            'name': _('Detalle de Servicio - %s') % (self.mascota_id.x_name or ''),
            'type': 'ir.actions.act_window',
            'res_model': 'x.mascota.line',
            'view_mode': 'form',
            'res_id': self.id,
            'target': 'current',
        }

    def get_company_logo_data_uri(self):
        """Devuelve el logo de la compañía como data URI (para QWeb PDF)."""
        self.ensure_one()
        company = (self.order_id.company_id if self.order_id and self.order_id.company_id else self.env.company)
        logo = (company.logo or getattr(company, 'logo_web', False))
        if not logo:
            return ''
        try:
            if isinstance(logo, bytes):
                logo = logo.decode('utf-8')
        except Exception:
            pass
        return 'data:image/png;base64,%s' % logo

    def get_servicios_peluqueria_activos(self):
        """Retorna lista de servicios de peluquería activos con nombres legibles"""
        self.ensure_one()
        servicios = []
        if self.bano:
            servicios.append('BANO')
        if self.corte:
            servicios.append('CORTE')
        if self.mantenimiento:
            servicios.append('RECORTE MANTENIMIENTO')
        if self.acicalado:
            servicios.append('ACICALADO')
        if self.rapado:
            servicios.append('RAPADO')
        if self.deslanado:
            servicios.append('DESLANADO')
        if self.profilaxis:
            servicios.append('PROFILAXIS SIN ANESTESIA')
        if self.tinte:
            servicios.append('TINTE')
        if self.corte_unas:
            servicios.append('CORTE DE UNAS')
        if self.limpieza_oidos:
            servicios.append('LIMPIEZA DE OIDOS')
        return servicios

    def get_servicios_veterinaria_activos(self):
        """Retorna lista de servicios veterinarios activos con nombres legibles"""
        self.ensure_one()
        servicios = []
        if self.vacunacion:
            servicios.append('VACUNACION')
        if self.desparasitacion:
            servicios.append('DESPARASITACION')
        if self.consulta_general:
            servicios.append('CONSULTA GENERAL')
        if self.consulta_Derma:
            servicios.append('CONSULTA DERMATOLOGICA')
        if self.cirugia_menor:
            servicios.append('CIRUGIA MENOR')
        if self.analisis_sangre:
            servicios.append('HEMOGRAMA')
        if self.analisis_quimica:
            servicios.append('QUIMICA SANGUINEA')
        return servicios

    def get_estado_display(self):
        """Retorna el estado en formato legible"""
        self.ensure_one()
        estados = {
            'pendiente': 'PENDIENTE',
            'confirmado': 'CONFIRMADO',
            'en_proceso': 'EN PROCESO',
            'terminado': 'TERMINADO',
            'entregado': 'ENTREGADO',
            'no_se_presento': 'NO SE PRESENTO',
            'cancelado': 'CANCELADO',
        }
        return estados.get(self.estado_servicio, '-')

    def get_prioridad_display(self):
        """Retorna la prioridad en formato legible"""
        self.ensure_one()
        prioridades = {
            'baja': 'BAJA',
            'normal': 'NORMAL',
            'alta': '*** ALTA ***',
            'urgente': '!!! URGENTE !!!',
        }
        return prioridades.get(self.prioridad, 'NORMAL')

    def get_especie_display(self):
        """Retorna el tipo de mascota"""
        self.ensure_one()
        if not self.especie:
            return '-'
        especies = {
            'perro': 'PERRO',
            'gato': 'GATO',
            'ave': 'AVE',
            'otro': 'OTRO',
        }
        return especies.get(self.especie, self.especie.upper() if self.especie else '-')

    def get_telefono_cliente(self):
        """Retorna el teléfono del cliente"""
        self.ensure_one()
        partner = self.order_id.partner_id if self.order_id else False
        if not partner:
            return '-'
        return partner.phone or partner.mobile or '-'

    def get_fecha_cita_display(self):
        """Retorna la fecha/hora de cita programada"""
        self.ensure_one()
        if self.fecha_programada:
            return self.fecha_programada.strftime('%d/%m/%Y %H:%M')
        return None

    def get_numero_visita(self):
        """Retorna el número de visita de la mascota"""
        self.ensure_one()
        if not self.mascota_id:
            return 1
        # Contar todas las líneas anteriores de esta mascota
        count = self.env['x.mascota.line'].search_count([
            ('mascota_id', '=', self.mascota_id.id),
            ('create_date', '<=', self.create_date or fields.Datetime.now()),
        ])
        return count or 1

    @api.onchange('order_id')
    def _onchange_order_id_filter_mascota(self):
        if self.order_id and self.order_id.partner_id:
            return {'domain': {'mascota_id': [('x_studio_partner_id', '=', self.order_id.partner_id.id)]}}
        return {'domain': {'mascota_id': []}}
    
    @api.onchange('peluqueria_express')
    def _onchange_peluqueria_express(self):
        """Aviso al activar Peluquería Express - la línea se crea al guardar"""
        if self.peluqueria_express and self.mascota_id:
            # Verificar que el producto BEXPRESS existe
            product = self.env['product.product'].search([
                ('default_code', '=', 'BEXPRESS')
            ], limit=1)
            
            if not product:
                return {
                    'warning': {
                        'title': 'Producto no encontrado',
                        'message': 'No se encontró el producto con referencia BEXPRESS. Por favor, verifique que existe.',
                    }
                }
            
            return {
                'warning': {
                    'title': 'Peluquería Express',
                    'message': f'Al guardar, se agregará automáticamente el servicio Peluquería Express para {self.mascota_id.display_name}',
                    'type': 'notification',
                }
            }

    def action_cambiar_estado(self, nuevo_estado):
        estados_validos = dict(self._fields['estado_servicio'].selection)
        for record in self:
            if nuevo_estado not in estados_validos:
                raise UserError(_("Estado inválido: %s") % nuevo_estado)
            record.estado_servicio = nuevo_estado

    def action_marcar_como_terminado(self):
        self.action_cambiar_estado('terminado')

    def calcular_duracion_total_minutos(self):
        for record in self:
            record.duracion_real = 0.0
            if record.fecha_inicio and record.fecha_fin:
                delta = record.fecha_fin - record.fecha_inicio
                record.duracion_real = delta.total_seconds() / 60.0  # minutos
        return True

    # Métodos computados para tracking de responsables
    @api.depends('historial_atencion_ids')
    def _compute_count_historial(self):
        for record in self:
            record.count_historial_atencion = len(record.historial_atencion_ids)

    @api.depends('historial_atencion_ids.duracion_horas', 'historial_atencion_ids.estado')
    def _compute_tiempo_total_responsables(self):
        for record in self:
            total = sum(
                hist.duracion_horas for hist in record.historial_atencion_ids
                if hist.estado == 'completado' and hist.duracion_horas
            )
            record.tiempo_total_responsables = total

    @api.depends('servicio_peluqueria', 'servicio_veterinaria')
    def _compute_tipo_servicio_display(self):
        """Calcula el tipo de servicio para agrupación"""
        for record in self:
            if record.servicio_peluqueria and record.servicio_veterinaria:
                record.tipo_servicio_display = 'Ambos'
            elif record.servicio_peluqueria:
                record.tipo_servicio_display = 'Peluquería'
            elif record.servicio_veterinaria:
                record.tipo_servicio_display = 'Veterinaria'
            else:
                record.tipo_servicio_display = 'Sin Servicio'
    
    @api.depends('responsable_peluqueria')
    def _compute_responsable_peluqueria_principal(self):
        """Devuelve el primer estilista de responsable_peluqueria para compatibilidad"""
        for record in self:
            record.responsable_peluqueria_principal = record.responsable_peluqueria[:1] if record.responsable_peluqueria else False
    
    @api.depends('servicio_peluqueria', 'servicio_veterinaria', 'responsable_peluqueria', 'responsable_veterinaria')
    def _compute_responsable_display(self):
        """Calcula el responsable principal para agrupación (prioriza peluquería)"""
        for record in self:
            if record.servicio_peluqueria and record.responsable_peluqueria:
                # Usar el primer estilista para el display
                record.responsable_display = record.responsable_peluqueria[:1]
            elif record.servicio_veterinaria and record.responsable_veterinaria:
                record.responsable_display = record.responsable_veterinaria
            else:
                record.responsable_display = False
    
    @api.depends('responsable_peluqueria', 'responsable_veterinaria')
    def _compute_responsables_asignados(self):
        for record in self:
            responsables = []
            if record.responsable_peluqueria:
                # Ahora es Many2many, mostrar todos los nombres
                nombres_peluqueria = ', '.join(record.responsable_peluqueria.mapped('name'))
                responsables.append(f"Peluquería: {nombres_peluqueria}")
            if record.responsable_veterinaria:
                responsables.append(f"Veterinaria: {record.responsable_veterinaria.name}")
            record.responsables_asignados = " | ".join(responsables) if responsables else "Sin asignar"
    
    @api.depends('responsable_peluqueria')
    def _compute_nombres_estilistas(self):
        """Calcula los nombres de los estilistas para mostrar en Kanban"""
        for record in self:
            if record.responsable_peluqueria:
                record.nombres_estilistas = ', '.join(record.responsable_peluqueria.mapped('name'))
            else:
                record.nombres_estilistas = ''

    # Métodos para gestionar historial de atención
    def action_iniciar_atencion(self, responsable_id, tipo_servicio, servicio_especifico):
        """
        Inicia una nueva atención registrada en el historial
        :param responsable_id: ID del usuario responsable
        :param tipo_servicio: 'peluqueria', 'veterinaria' o 'ambos'
        :param servicio_especifico: Servicio específico que se va a realizar
        :return: Historial creado
        """
        self.ensure_one()
        historial = self.env['x.mascota.atencion.historial'].create({
            'mascota_line_id': self.id,
            'responsable_id': responsable_id,
            'tipo_servicio': tipo_servicio,
            'servicio_especifico': servicio_especifico,
            'fecha_inicio': fields.Datetime.now(),
            'estado': 'en_proceso',
        })
        self.message_post(
            body=f"Atención iniciada por {historial.responsable_id.name} - {dict(historial._fields['servicio_especifico'].selection).get(servicio_especifico)}"
        )
        return historial

    def action_finalizar_atencion(self, historial_id=None):
        """
        Finaliza una atención en curso
        :param historial_id: ID del historial a finalizar. Si no se especifica, finaliza el último en proceso
        """
        self.ensure_one()
        if historial_id:
            historial = self.env['x.mascota.atencion.historial'].browse(historial_id)
        else:
            historial = self.historial_atencion_ids.filtered(lambda h: h.estado == 'en_proceso')[:1]
        
        if historial:
            historial.action_marcar_completado()
            self.message_post(
                body=f"Atención completada por {historial.responsable_id.name} - Duración: {historial.duracion_horas:.2f} horas"
            )
            return historial
        else:
            raise UserError(_("No hay atención en proceso para finalizar."))

    def action_agregar_foto_atencion(self, historial_id, foto, tipo_foto='durante', descripcion=''):
        """
        Agrega una foto a un historial de atención
        """
        self.ensure_one()
        return self.env['x.mascota.atencion.foto'].create({
            'historial_id': historial_id,
            'foto': foto,
            'tipo_foto': tipo_foto,
            'descripcion': descripcion,
            'fecha_tomada': fields.Datetime.now(),
            'tomada_por': self.env.user.id,
        })

    def action_iniciar_peluqueria(self):
        """Inicia el proceso de peluquería asignando automáticamente al responsable"""
        self.ensure_one()
        if not self.servicio_peluqueria:
            raise UserError(_("Esta mascota no tiene servicios de peluquería asignados."))
        
        self.estado_peluqueria = 'iniciado'
        self.estado_servicio = 'en_proceso'
        if not self.fecha_inicio:
            self.fecha_inicio = fields.Datetime.now()
        
        # Registrar en historial si hay servicios específicos
        servicios_pelu = []
        if self.bano: servicios_pelu.append('bano')
        if self.corte: servicios_pelu.append('corte')
        if self.mantenimiento: servicios_pelu.append('mantenimiento')
        if self.acicalado: servicios_pelu.append('acicalado')
        if self.rapado: servicios_pelu.append('rapado')
        if self.deslanado: servicios_pelu.append('deslanado')
        if self.profilaxis: servicios_pelu.append('profilaxis')
        if self.tinte: servicios_pelu.append('tinte')
        if self.corte_unas: servicios_pelu.append('corte_unas')
        if self.limpieza_oidos: servicios_pelu.append('limpieza_oidos')
        
        for servicio in servicios_pelu:
            # Many2many: registrar para cada responsable
            for responsable in self.responsable_peluqueria:
                if responsable.user_id:
                    self.action_iniciar_atencion(
                        responsable.user_id.id,
                        'peluqueria',
                        servicio
                    )
        
        responsable_nombres = ', '.join(self.responsable_peluqueria.mapped('name')) if self.responsable_peluqueria else "Sin asignar"
        self.message_post(body=f"Servicios de peluquería iniciados por {responsable_nombres}")

    def action_iniciar_veterinaria(self):
        """Inicia el proceso veterinario asignando automáticamente al responsable"""
        self.ensure_one()
        if not self.responsable_veterinaria:
            raise UserError(_("Debe asignar un veterinario responsable antes de iniciar."))
        if not self.servicio_veterinaria:
            raise UserError(_("Esta mascota no tiene servicios veterinarios asignados."))
        
        self.estado_veterinaria = 'iniciado'
        self.estado_servicio = 'en_proceso'
        if not self.fecha_inicio:
            self.fecha_inicio = fields.Datetime.now()
        
        # Registrar en historial si hay servicios específicos
        servicios_vete = []
        if self.vacunacion: servicios_vete.append('vacunacion')
        if self.desparasitacion: servicios_vete.append('desparasitacion')
        if self.consulta_general: servicios_vete.append('consulta_general')
        if self.consulta_derma: servicios_vete.append('consulta_derma')
        if self.cirugia_menor: servicios_vete.append('cirugia_menor')
        if self.analisis_sangre: servicios_vete.append('analisis_sangre')
        if self.analisis_quimica: servicios_vete.append('analisis_quimica')
        
        for servicio in servicios_vete:
            responsable_user_id = self.responsable_veterinaria.user_id.id if self.responsable_veterinaria and self.responsable_veterinaria.user_id else False
            if responsable_user_id:
                self.action_iniciar_atencion(
                    responsable_user_id,
                    'veterinaria',
                    servicio
                )
        
        self.message_post(body=f"Servicios veterinarios iniciados por {self.responsable_veterinaria.name}")

    def action_completar_peluqueria(self):
        """Marca la peluquería como completada"""
        self.ensure_one()
        self.estado_peluqueria = 'completado'
        historiales = self.historial_atencion_ids.filtered(
            lambda h: h.tipo_servicio == 'peluqueria' and h.estado == 'en_proceso'
        )
        for historial in historiales:
            historial.action_marcar_completado()
        self.message_post(body="Servicios de peluquería completados")

    def action_completar_veterinaria(self):
        """Marca la veterinaria como completada"""
        self.ensure_one()
        self.estado_veterinaria = 'completado'
        historiales = self.historial_atencion_ids.filtered(
            lambda h: h.tipo_servicio == 'veterinaria' and h.estado == 'en_proceso'
        )
        for historial in historiales:
            historial.action_marcar_completado()
        self.message_post(body="Servicios veterinarios completados")

    def get_resumen_responsables(self):
        """
        Retorna un resumen de quién trabajó con esta mascota
        """
        self.ensure_one()
        resumen = {}
        for historial in self.historial_atencion_ids.filtered(lambda h: h.estado == 'completado'):
            responsable = historial.responsable_id.name
            if responsable not in resumen:
                resumen[responsable] = {
                    'horas': 0.0,
                    'servicios': [],
                    'veces': 0
                }
            resumen[responsable]['horas'] += historial.duracion_horas
            resumen[responsable]['servicios'].append(
                dict(historial._fields['servicio_especifico'].selection).get(historial.servicio_especifico)
            )
            resumen[responsable]['veces'] += 1
        return resumen

    @api.model
    def recalculate_cortes_historicos(self):
        """
        Método para recalcular todos los cortes históricos.
        Útil cuando se necesita actualizar todos los contadores después de cambios masivos.
        """
        # Usar una consulta SQL directa para obtener todos los conteos de una vez
        self.env.cr.execute("""
            SELECT mascota_id, COUNT(*) as count
            FROM x_mascota_line
            WHERE mascota_id IS NOT NULL
              AND corte = true
            GROUP BY mascota_id
        """)
        
        counts_by_mascota = {row[0]: row[1] for row in self.env.cr.fetchall()}
        
        # Actualizar todas las líneas en una sola operación usando SQL
        # Primero, establecer todos los valores en 0
        self.env.cr.execute("""
            UPDATE x_mascota_line
            SET count_cortes_historicos = 0
            WHERE mascota_id IS NOT NULL
        """)
        
        # Luego, actualizar solo las mascotas que tienen cortes
        for mascota_id, count in counts_by_mascota.items():
            self.env.cr.execute("""
                UPDATE x_mascota_line
                SET count_cortes_historicos = %s
                WHERE mascota_id = %s
            """, (count, mascota_id))
        
        # Invalidar la caché para que los cambios se reflejen
        self.env.invalidate_all()
        
        return True
