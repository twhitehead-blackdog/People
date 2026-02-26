{
    "name": "Comanda por Mascota en Presupuesto",
    "version": "2.2.0",
    "category": "Sales",
    "summary": "Gestión individual de mascotas en presupuestos de servicios veterinarios y de peluquería.",
    "description": """
Este módulo permite gestionar cada mascota asociada a un presupuesto 
de manera individual, incluyendo servicios como baño, corte, profilaxis, 
y otros tratamientos veterinarios o estéticos. Se integra con el modelo 
de venta (sale.order) y muestra una columna por cada mascota seleccionada.
    """,
    "author": "Tristan Whitehead",
    "website": "www.blackdogpanama.com",
    "depends": [
        "sale",
        "base",
        "mail",
        "hr",
        "pos_sale",
        "pw_pos_salesperson_emp"
    ],
    "data": [
        "security/groups.xml",
        "security/ir.model.access.csv",
        "data/sequence_data.xml",
        "views/mascota_line_view.xml",
        "views/sale_order_view.xml",
        "views/sale_order_line_view.xml",
        "views/mascota_dashboard_view.xml",
        "views/pos_order_view.xml",
        "report/pos_order_report_views.xml",
        "reports/report_ficha.xml"
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "sale_order_comanda_mascotas/static/src/js/pos_sale_order_line.js",
            "sale_order_comanda_mascotas/static/src/xml/pos_orderline.xml",
        ],
    },
    "external_dependencies": {
        "python": []
    },
    "license": "LGPL-3",
    "installable": True,
    "application": False,
    "auto_install": False
}
