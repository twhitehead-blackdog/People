# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
from datetime import datetime
import logging

_logger = logging.getLogger(__name__)


class MascotaAtencionHistorial(models.Model):
    """Historial detallado de atención a cada mascota por responsable"""
    _name = 'x.mascota.atencion.historial'
    _description = 'Historial de Atención por Responsable'
    _order = 'fecha_inicio desc, id desc'
    _rec_name = 'display_name'

    mascota_line_id = fields.Many2one(
        'x.mascota.line',
        string='Línea de Mascota',
        required=True,
        ondelete='cascade',
        index=True,
        help="Línea de mascota asociada"
    )

    responsable_id = fields.Many2one(
        'res.users',
        string='Responsable',
        required=True,
        index=True,
        help="Usuario que atiende a la mascota"
    )

    tipo_servicio = fields.Selection([
        ('peluqueria', 'Peluquería'),
        ('veterinaria', 'Veterinaria'),
        ('ambos', 'Ambos'),
    ], string='Tipo de Servicio', required=True, index=True)

    servicio_especifico = fields.Selection([
        # Peluquería
        ('bano', 'Baño'),
        ('corte', 'Corte'),
        ('mantenimiento', 'Recorte de Mantenimiento'),
        ('acicalado', 'Acicalado'),
        ('rapado', 'Rapado'),
        ('deslanado', 'Deslanado'),
        ('profilaxis', 'Profilaxis sin anestesia'),
        ('tinte', 'Tinte'),
        ('corte_unas', 'Corte de Uñas'),
        ('limpieza_oidos', 'Limpieza de Oídos'),
        # Veterinaria
        ('vacunacion', 'Vacunación'),
        ('desparasitacion', 'Desparasitación'),
        ('consulta_general', 'Consulta General'),
        ('consulta_derma', 'Consulta Dermatológica'),
        ('cirugia_menor', 'Cirugía Menor'),
        ('analisis_sangre', 'Hemograma'),
        ('analisis_quimica', 'Química'),
        ('otros', 'Otros'),
    ], string='Servicio Específico', required=True, index=True)

    fecha_inicio = fields.Datetime(
        string='Fecha de Inicio',
        required=True,
        index=True,
        default=fields.Datetime.now,
        help="Momento en que inició el servicio"
    )

    fecha_fin = fields.Datetime(
        string='Fecha de Finalización',
        index=True,
        help="Momento en que finalizó el servicio"
    )

    duracion_minutos = fields.Float(
        string='Duración (minutos)',
        compute='_compute_duracion',
        store=True,
        help="Tiempo trabajado en minutos"
    )

    duracion_horas = fields.Float(
        string='Duración (horas)',
        compute='_compute_duracion',
        store=True,
        help="Tiempo trabajado en horas"
    )

    notas = fields.Text(
        string='Notas del Responsable',
        help="Observaciones específicas de este responsable sobre el servicio"
    )

    fotos_ids = fields.One2many(
        'x.mascota.atencion.foto',
        'historial_id',
        string='Fotos',
        help="Fotos tomadas durante esta atención"
    )

    estado = fields.Selection([
        ('en_proceso', 'En Proceso'),
        ('completado', 'Completado'),
        ('pausado', 'Pausado'),
        ('cancelado', 'Cancelado'),
    ], string='Estado', default='en_proceso', index=True)

    calificacion = fields.Selection([
        ('excelente', 'Excelente'),
        ('bueno', 'Bueno'),
        ('regular', 'Regular'),
        ('deficiente', 'Deficiente'),
    ], string='Calificación del Trabajo', help="Calificación del trabajo realizado")

    observaciones_supervisor = fields.Text(
        string='Observaciones del Supervisor',
        help="Comentarios del supervisor sobre el trabajo"
    )

    # Campos computados
    display_name = fields.Char(
        string='Nombre',
        compute='_compute_display_name',
        store=True
    )

    # Campos relacionados (readonly)
    mascota_id = fields.Many2one(
        'x_mascota',
        related='mascota_line_id.mascota_id',
        string='Mascota',
        store=True,
        readonly=True
    )

    presupuesto_id = fields.Many2one(
        'sale.order',
        related='mascota_line_id.order_id',
        string='Presupuesto',
        store=True,
        readonly=True
    )

    cliente_id = fields.Many2one(
        'res.partner',
        related='mascota_line_id.cliente_id',
        string='Cliente',
        store=True,
        readonly=True
    )

    @api.depends('fecha_inicio', 'fecha_fin')
    def _compute_duracion(self):
        for record in self:
            if record.fecha_inicio and record.fecha_fin:
                delta = record.fecha_fin - record.fecha_inicio
                minutos = delta.total_seconds() / 60.0
                record.duracion_minutos = minutos
                record.duracion_horas = minutos / 60.0
            else:
                record.duracion_minutos = 0.0
                record.duracion_horas = 0.0

    @api.depends('responsable_id', 'servicio_especifico', 'fecha_inicio')
    def _compute_display_name(self):
        for record in self:
            servicio_dict = dict(record._fields['servicio_especifico'].selection)
            servicio_nombre = servicio_dict.get(record.servicio_especifico, 'Servicio')
            responsable = record.responsable_id.name or 'Sin Responsable'
            fecha = record.fecha_inicio.strftime('%d/%m/%Y %H:%M') if record.fecha_inicio else ''
            record.display_name = f"{responsable} - {servicio_nombre} - {fecha}"

    @api.constrains('fecha_inicio', 'fecha_fin')
    def _check_fechas(self):
        for record in self:
            if record.fecha_fin and record.fecha_inicio:
                if record.fecha_fin < record.fecha_inicio:
                    raise ValidationError(_("La fecha de finalización no puede ser anterior a la fecha de inicio."))

    def action_marcar_completado(self):
        """Marca el historial como completado y registra la fecha de fin"""
        for record in self:
            if not record.fecha_fin:
                record.fecha_fin = fields.Datetime.now()
            record.estado = 'completado'

    def action_pausar(self):
        """Pausa el servicio actual"""
        for record in self:
            record.estado = 'pausado'

    def action_reanudar(self):
        """Reanuda el servicio pausado"""
        for record in self:
            record.estado = 'en_proceso'

    def action_cancelar(self):
        """Cancela el servicio"""
        for record in self:
            record.estado = 'cancelado'
            if not record.fecha_fin:
                record.fecha_fin = fields.Datetime.now()


class MascotaAtencionFoto(models.Model):
    """Fotos asociadas a una atención específica"""
    _name = 'x.mascota.atencion.foto'
    _description = 'Foto de Atención'
    _order = 'fecha_tomada desc'

    historial_id = fields.Many2one(
        'x.mascota.atencion.historial',
        string='Historial de Atención',
        required=True,
        ondelete='cascade',
        index=True
    )

    foto = fields.Image(
        string='Foto',
        required=True,
        max_width=2048,
        max_height=2048,
        help="Foto tomada durante la atención"
    )

    tipo_foto = fields.Selection([
        ('antes', 'Antes'),
        ('durante', 'Durante'),
        ('despues', 'Después'),
        ('proceso', 'Proceso'),
        ('detalle', 'Detalle'),
    ], string='Tipo de Foto', required=True, default='durante')

    descripcion = fields.Char(
        string='Descripción',
        help="Descripción breve de la foto"
    )

    fecha_tomada = fields.Datetime(
        string='Fecha Tomada',
        default=fields.Datetime.now,
        required=True,
        index=True
    )

    tomada_por = fields.Many2one(
        'res.users',
        string='Tomada Por',
        default=lambda self: self.env.user,
        required=True
    )

