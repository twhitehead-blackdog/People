# -*- coding: utf-8 -*-
from odoo import models, fields


class PosOrderReport(models.Model):
    _inherit = "report.pos.order"

    # Campo para mostrar nombres de estilistas (ahora es Many2many, usamos el campo Char computed)
    estilista_nombres = fields.Char(
        string='Estilistas',
        readonly=True
    )
    
    # Campo para mostrar nombre de mascota
    mascota_nombre = fields.Char(
        string='Mascota',
        readonly=True
    )

    def _select(self):
        return super(PosOrderReport, self)._select() + """,
            l.estilista_nombres AS estilista_nombres,
            l.mascota_nombre AS mascota_nombre"""

    def _group_by(self):
        return super(PosOrderReport, self)._group_by() + """,
            l.estilista_nombres,
            l.mascota_nombre"""
