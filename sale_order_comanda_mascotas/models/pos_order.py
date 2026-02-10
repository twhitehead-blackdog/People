# -*- coding: utf-8 -*-
import logging
from odoo import api, fields, models, _

_logger = logging.getLogger(__name__)


class PosOrder(models.Model):
    _inherit = 'pos.order'

    def _get_fields_for_order_line(self):
        """Agregar campos de mascota para líneas de POS - igual que pw_pos_salesperson_emp"""
        fields = super(PosOrder, self)._get_fields_for_order_line()
        fields.extend([
            'estilista_ids',
            'mascota_id',
        ])
        return fields


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    # Campo separado para estilistas (independiente de user_id del módulo salesperson)
    # Múltiples estilistas para división de comisiones
    estilista_ids = fields.Many2many(
        'hr.employee',
        'pos_order_line_estilista_rel',
        'pos_order_line_id',
        'employee_id',
        string='Estilistas',
        help="Estilistas asignados desde el presupuesto (para división de comisiones)"
    )
    
    # Campo computed para nombres de estilistas
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
    
    # Campo Many2one para la mascota
    mascota_id = fields.Many2one(
        'x_mascota',
        string='Mascota',
        help="Mascota asignada desde el presupuesto"
    )
    
    # Campo computed para el nombre de la mascota (para compatibilidad)
    mascota_nombre = fields.Char(
        string='Nombre Mascota',
        compute='_compute_mascota_nombre',
        store=True,
        help="Nombre de la mascota"
    )
    
    @api.depends('mascota_id')
    def _compute_mascota_nombre(self):
        for line in self:
            line.mascota_nombre = line.mascota_id.display_name if line.mascota_id else ''

    @api.model_create_multi
    def create(self, vals_list):
        """Convertir estilista_ids de formato array a Many2many al crear líneas POS"""
        _logger.info("=== POS ORDER LINE CREATE - %s líneas ===", len(vals_list))
        for idx, vals in enumerate(vals_list):
            product_id = vals.get('product_id')
            _logger.info("Línea %s: product_id=%s, estilista_ids=%s, mascota_id=%s", 
                         idx, product_id, vals.get('estilista_ids'), vals.get('mascota_id'))
            
            # Convertir estilista_ids de [48, 52] a [(6, 0, [48, 52])]
            if 'estilista_ids' in vals:
                estilista_ids = vals['estilista_ids']
                if isinstance(estilista_ids, list) and estilista_ids and isinstance(estilista_ids[0], int):
                    vals['estilista_ids'] = [(6, 0, estilista_ids)]
                    _logger.info("Línea %s: estilista_ids CONVERTIDO a %s", idx, vals['estilista_ids'])
        return super().create(vals_list)

    def _export_for_ui(self, orderline):
        """Exportar campos de estilistas y mascota para el frontend del POS - igual que pw_pos_salesperson_emp"""
        result = super(PosOrderLine, self)._export_for_ui(orderline)
        # Exportar como ID simple (igual que user_id en pw_pos_salesperson_emp)
        result['estilista_ids'] = orderline.estilista_ids.ids if orderline.estilista_ids else []
        result['mascota_id'] = orderline.mascota_id.id if orderline.mascota_id else False
        return result

    @api.model
    def _load_pos_data_fields(self, config_id):
        """Cargar campos de estilistas y mascota en el POS"""
        fields = super()._load_pos_data_fields(config_id)
        fields += ['estilista_ids', 'mascota_id']
        return fields
