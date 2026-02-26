# -*- coding: utf-8 -*-
from odoo import models, fields, api, _
from odoo.exceptions import UserError
from datetime import datetime, timedelta
from collections import defaultdict

class MascotaDashboard(models.TransientModel):
    """Dashboard de estadísticas por comercial"""
    _name = 'x.mascota.dashboard'
    _description = 'Dashboard de Estadísticas por Comercial'

    fecha_inicio = fields.Date(
        string='Fecha Inicio',
        required=True,
        default=lambda self: fields.Date.today() - timedelta(days=30)
    )
    fecha_fin = fields.Date(
        string='Fecha Fin',
        required=True,
        default=fields.Date.today
    )
    user_id = fields.Many2one(
        'res.users',
        string='Comercial',
        help="Dejar vacío para ver todos los comerciales"
    )
    
    # Métricas generales
    total_presupuestos = fields.Integer(
        string='Total Presupuestos',
        compute='_compute_metrics',
        help="Total de presupuestos en el período"
    )
    total_presupuestos_confirmados = fields.Integer(
        string='Presupuestos Confirmados',
        compute='_compute_metrics'
    )
    total_presupuestos_facturados = fields.Integer(
        string='Presupuestos Facturados',
        compute='_compute_metrics'
    )
    monto_total = fields.Monetary(
        string='Monto Total',
        compute='_compute_metrics',
        currency_field='currency_id'
    )
    monto_promedio = fields.Monetary(
        string='Monto Promedio',
        compute='_compute_metrics',
        currency_field='currency_id'
    )
    tasa_conversion = fields.Float(
        string='Tasa de Conversión (%)',
        compute='_compute_metrics',
        help="Porcentaje de presupuestos confirmados"
    )
    
    # Métricas de mascotas
    total_mascotas = fields.Integer(
        string='Total Mascotas',
        compute='_compute_metrics'
    )
    total_servicios = fields.Integer(
        string='Total Servicios',
        compute='_compute_metrics'
    )
    total_peluqueria = fields.Integer(
        string='Servicios Peluquería',
        compute='_compute_metrics'
    )
    total_veterinaria = fields.Integer(
        string='Servicios Veterinaria',
        compute='_compute_metrics'
    )
    total_cortes = fields.Integer(
        string='Total Cortes',
        compute='_compute_metrics'
    )
    total_solo_bano = fields.Integer(
        string='Solo Baño',
        compute='_compute_metrics'
    )
    total_bano_y_corte = fields.Integer(
        string='Baño y Corte',
        compute='_compute_metrics'
    )
    
    # Estadísticas por comercial
    estadisticas_comerciales = fields.Text(
        string='Estadísticas por Comercial',
        compute='_compute_metrics'
    )
    
    # Servicios más solicitados
    servicios_mas_solicitados = fields.Text(
        string='Servicios Más Solicitados',
        compute='_compute_metrics'
    )
    
    currency_id = fields.Many2one(
        'res.currency',
        string='Moneda',
        default=lambda self: self.env.company.currency_id
    )

    @api.depends('fecha_inicio', 'fecha_fin', 'user_id')
    def _compute_metrics(self):
        for record in self:
            # Construir dominio base
            domain = [
                ('date_order', '>=', record.fecha_inicio),
                ('date_order', '<=', record.fecha_fin),
                ('mascota_line_ids', '!=', False),  # Solo presupuestos con mascotas
            ]
            
            if record.user_id:
                domain.append(('user_id', '=', record.user_id.id))
            
            # Obtener presupuestos
            orders = self.env['sale.order'].search(domain)
            
            # Métricas generales
            record.total_presupuestos = len(orders)
            record.total_presupuestos_confirmados = len(orders.filtered(lambda o: o.state == 'sale'))
            record.total_presupuestos_facturados = len(orders.filtered(lambda o: o.state in ['sale', 'done']))
            
            # Montos
            record.monto_total = sum(orders.mapped('amount_total'))
            record.monto_promedio = record.monto_total / record.total_presupuestos if record.total_presupuestos > 0 else 0
            
            # Tasa de conversión
            record.tasa_conversion = (
                (record.total_presupuestos_confirmados / record.total_presupuestos * 100)
                if record.total_presupuestos > 0 else 0
            )
            
            # Métricas de mascotas
            mascota_lines = orders.mapped('mascota_line_ids')
            record.total_mascotas = len(set(mascota_lines.mapped('mascota_id.id')))
            record.total_servicios = sum(orders.mapped('count_total_servicios'))
            record.total_peluqueria = sum(orders.mapped('count_peluqueria'))
            record.total_veterinaria = sum(orders.mapped('count_veterinaria'))
            record.total_cortes = sum(orders.mapped('count_cortes'))
            record.total_solo_bano = sum(orders.mapped('count_solo_bano'))
            record.total_bano_y_corte = sum(orders.mapped('count_bano_y_corte'))
            
            # Estadísticas por comercial
            record.estadisticas_comerciales = record._get_estadisticas_comerciales(domain)
            
            # Servicios más solicitados
            record.servicios_mas_solicitados = record._get_servicios_mas_solicitados(mascota_lines)

    def _get_estadisticas_comerciales(self, domain):
        """Obtiene estadísticas agrupadas por comercial"""
        # Remover filtro de user_id si existe
        domain_comercial = [d for d in domain if not (isinstance(d, tuple) and len(d) == 3 and d[0] == 'user_id')]
        
        orders = self.env['sale.order'].search(domain_comercial)
        
        # Agrupar por comercial
        stats_by_user = defaultdict(lambda: {
            'presupuestos': 0,
            'confirmados': 0,
            'facturados': 0,
            'monto_total': 0,
            'mascotas': 0,
            'servicios': 0,
        })
        
        for order in orders:
            user = order.user_id
            if not user:
                continue
                
            stats_by_user[user.id]['presupuestos'] += 1
            if order.state == 'sale':
                stats_by_user[user.id]['confirmados'] += 1
            if order.state in ['sale', 'done']:
                stats_by_user[user.id]['facturados'] += 1
            stats_by_user[user.id]['monto_total'] += order.amount_total
            stats_by_user[user.id]['mascotas'] += order.count_total_mascotas
            stats_by_user[user.id]['servicios'] += order.count_total_servicios
        
        # Formatear resultado
        lines = []
        lines.append(f"{'Comercial':<30} {'Presup.':<12} {'Confirm.':<12} {'Fact.':<12} {'Monto':<15} {'Mascotas':<12} {'Servicios':<12}")
        lines.append("-" * 100)
        
        for user_id, stats in sorted(stats_by_user.items(), key=lambda x: x[1]['monto_total'], reverse=True):
            user = self.env['res.users'].browse(user_id)
            lines.append(
                f"{user.name[:28]:<30} "
                f"{stats['presupuestos']:<12} "
                f"{stats['confirmados']:<12} "
                f"{stats['facturados']:<12} "
                f"{stats['monto_total']:>13,.2f} "
                f"{stats['mascotas']:<12} "
                f"{stats['servicios']:<12}"
            )
        
        return '\n'.join(lines)

    def _get_servicios_mas_solicitados(self, mascota_lines):
        """Obtiene los servicios más solicitados"""
        servicios_count = {
            'bano': 0,
            'corte': 0,
            'mantenimiento': 0,
            'acicalado': 0,
            'rapado': 0,
            'deslanado': 0,
            'profilaxis': 0,
            'tinte': 0,
            'corte_unas': 0,
            'limpieza_oidos': 0,
            'vacunacion': 0,
            'desparasitacion': 0,
            'consulta_general': 0,
            'consulta_Derma': 0,
            'cirugia_menor': 0,
            'analisis_sangre': 0,
            'analisis_quimica': 0,
        }
        
        nombres_servicios = {
            'bano': 'Baño',
            'corte': 'Corte',
            'mantenimiento': 'Mantenimiento',
            'acicalado': 'Acicalado',
            'rapado': 'Rapado',
            'deslanado': 'Deslanado',
            'profilaxis': 'Profilaxis',
            'tinte': 'Tinte',
            'corte_unas': 'Corte de Uñas',
            'limpieza_oidos': 'Limpieza de Oídos',
            'vacunacion': 'Vacunación',
            'desparasitacion': 'Desparasitación',
            'consulta_general': 'Consulta General',
            'consulta_Derma': 'Consulta Dermatológica',
            'cirugia_menor': 'Cirugía Menor',
            'analisis_sangre': 'Hemograma',
            'analisis_quimica': 'Química',
        }
        
        for line in mascota_lines:
            for servicio in servicios_count.keys():
                if getattr(line, servicio, False):
                    servicios_count[servicio] += 1
        
        # Ordenar por cantidad
        servicios_ordenados = sorted(
            servicios_count.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Formatear resultado
        lines = []
        lines.append(f"{'Servicio':<30} {'Cantidad':<12}")
        lines.append("-" * 45)
        
        for servicio, cantidad in servicios_ordenados[:10]:  # Top 10
            if cantidad > 0:
                lines.append(f"{nombres_servicios.get(servicio, servicio):<30} {cantidad:<12}")
        
        return '\n'.join(lines)

    def action_actualizar(self):
        """Forzar actualización de métricas"""
        self._compute_metrics()
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Dashboard Actualizado'),
                'message': _('Las métricas han sido actualizadas correctamente.'),
                'type': 'success',
                'sticky': False,
            }
        }
