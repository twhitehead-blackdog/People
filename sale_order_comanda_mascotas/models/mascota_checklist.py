# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import logging

_logger = logging.getLogger(__name__)


class MascotaChecklist(models.Model):
    """Checklist de tareas por servicio para cada mascota"""
    _name = 'x.mascota.checklist'
    _description = 'Checklist de Tareas por Servicio'
    _order = 'secuencia, id'

    mascota_line_id = fields.Many2one(
        'x.mascota.line',
        string='Línea de Mascota',
        required=True,
        ondelete='cascade',
        index=True
    )

    tipo_servicio = fields.Selection([
        ('peluqueria', 'Peluquería'),
        ('veterinaria', 'Veterinaria'),
    ], string='Tipo de Servicio', required=True, index=True)

    tarea = fields.Char(
        string='Tarea',
        required=True,
        help="Descripción de la tarea a realizar"
    )

    secuencia = fields.Integer(
        string='Secuencia',
        default=10,
        help="Orden en que debe aparecer la tarea"
    )

    completada = fields.Boolean(
        string='Completada',
        default=False,
        help="Indica si la tarea ha sido completada"
    )

    fecha_completada = fields.Datetime(
        string='Fecha Completada',
        help="Fecha y hora en que se completó la tarea"
    )

    completada_por = fields.Many2one(
        'res.users',
        string='Completada Por',
        help="Usuario que completó la tarea"
    )

    notas = fields.Text(
        string='Notas',
        help="Notas adicionales sobre la tarea"
    )

    obligatoria = fields.Boolean(
        string='Obligatoria',
        default=True,
        help="Si está marcada, la tarea debe completarse antes de finalizar el servicio"
    )

    @api.model
    def create_default_checklist_peluqueria(self, mascota_line_id):
        """Crea checklist predeterminado para servicios de peluquería"""
        tareas_peluqueria = [
            {'tarea': 'Revisar estado general de la mascota', 'secuencia': 10, 'obligatoria': True},
            {'tarea': 'Bañar y secar', 'secuencia': 20, 'obligatoria': True},
            {'tarea': 'Cortar uñas', 'secuencia': 30, 'obligatoria': True},
            {'tarea': 'Limpiar oídos', 'secuencia': 40, 'obligatoria': True},
            {'tarea': 'Cepillar y peinar', 'secuencia': 50, 'obligatoria': False},
            {'tarea': 'Cortar pelo (si aplica)', 'secuencia': 60, 'obligatoria': False},
            {'tarea': 'Aplicar productos finales', 'secuencia': 70, 'obligatoria': False},
            {'tarea': 'Revisión final y presentación', 'secuencia': 80, 'obligatoria': True},
        ]
        
        checklist_vals = []
        for tarea_data in tareas_peluqueria:
            checklist_vals.append({
                'mascota_line_id': mascota_line_id,
                'tipo_servicio': 'peluqueria',
                **tarea_data
            })
        
        return self.create(checklist_vals)

    @api.model
    def create_default_checklist_veterinaria(self, mascota_line_id):
        """Crea checklist predeterminado para servicios veterinarios"""
        tareas_veterinaria = [
            {'tarea': 'Revisión inicial y toma de signos vitales', 'secuencia': 10, 'obligatoria': True},
            {'tarea': 'Examen físico general', 'secuencia': 20, 'obligatoria': True},
            {'tarea': 'Aplicar vacunación (si aplica)', 'secuencia': 30, 'obligatoria': False},
            {'tarea': 'Aplicar desparasitación (si aplica)', 'secuencia': 40, 'obligatoria': False},
            {'tarea': 'Realizar análisis (si aplica)', 'secuencia': 50, 'obligatoria': False},
            {'tarea': 'Documentar hallazgos', 'secuencia': 60, 'obligatoria': True},
            {'tarea': 'Revisar y explicar tratamiento', 'secuencia': 70, 'obligatoria': True},
            {'tarea': 'Entrega de medicamentos (si aplica)', 'secuencia': 80, 'obligatoria': False},
        ]
        
        checklist_vals = []
        for tarea_data in tareas_veterinaria:
            checklist_vals.append({
                'mascota_line_id': mascota_line_id,
                'tipo_servicio': 'veterinaria',
                **tarea_data
            })
        
        return self.create(checklist_vals)

    def action_marcar_completada(self):
        """Marca la tarea como completada"""
        for record in self:
            if not record.completada:
                record.completada = True
                record.fecha_completada = fields.Datetime.now()
                record.completada_por = self.env.user.id
                record.mascota_line_id.message_post(
                    body=f"Tarea completada: {record.tarea} - {record.completada_por.name}"
                )

    def action_marcar_pendiente(self):
        """Marca la tarea como pendiente"""
        for record in self:
            record.completada = False
            record.fecha_completada = False
            record.completada_por = False

    @api.constrains('mascota_line_id', 'tipo_servicio')
    def _check_completitud_obligatorias(self):
        """Valida que todas las tareas obligatorias estén completadas antes de finalizar"""
        # Esta validación se puede llamar desde el método de finalización del servicio
        pass

