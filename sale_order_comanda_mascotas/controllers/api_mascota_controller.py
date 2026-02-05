# -*- coding: utf-8 -*-
from odoo import http, fields
from odoo.http import request
from odoo.exceptions import UserError, ValidationError, AccessError
import logging
import json
from datetime import datetime, timedelta
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT

_logger = logging.getLogger(__name__)


class MascotaAPIController(http.Controller):
    """API REST para acceso desde tablets/dispositivos móviles"""

    def _authenticate(self):
        """Autentica el usuario mediante token o sesión"""
        # Opción 1: Usar sesión de Odoo (si ya está logueado)
        if request.session.uid:
            return request.env['res.users'].browse(request.session.uid)
        
        # Opción 2: Autenticación por token en header
        token = request.httprequest.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token.replace('Bearer ', '')
            api_key = request.env['res.users.apikeys'].sudo()._check_credentials(
                scope='rpc',
                key=token
            )
            if api_key:
                return request.env['res.users'].sudo().browse(api_key.user_id.id)
        
        # Opción 3: Autenticación básica por usuario/contraseña (para desarrollo)
        # En producción, usar API keys es más seguro
        return None

    def _error_response(self, error_message, status_code=400):
        """Retorna respuesta de error estandarizada"""
        return request.make_response(
            json.dumps({
                'success': False,
                'error': error_message
            }),
            headers=[('Content-Type', 'application/json')],
            status=status_code
        )

    def _success_response(self, data, status_code=200):
        """Retorna respuesta de éxito estandarizada"""
        return request.make_response(
            json.dumps({
                'success': True,
                'data': data
            }),
            headers=[('Content-Type', 'application/json')],
            status=status_code
        )

    @http.route('/api/mascota/v1/me', type='http', auth='user', methods=['GET'], csrf=False, cors='*')
    def get_current_user(self):
        """Obtiene información del usuario actual"""
        try:
            user = request.env.user
            return self._success_response({
                'id': user.id,
                'name': user.name,
                'login': user.login,
                'email': user.email,
                'is_peluquero': user.has_group('base.group_user'),  # Ajustar según grupos
                'is_veterinario': user.has_group('base.group_user'),  # Ajustar según grupos
            })
        except Exception as e:
            _logger.error(f"Error en get_current_user: {e}")
            return self._error_response(str(e), 500)

    @http.route('/api/mascota/v1/servicios/pendientes', type='http', auth='user', methods=['GET'], csrf=False, cors='*')
    def get_servicios_pendientes(self):
        """Obtiene lista de servicios pendientes asignados al usuario"""
        try:
            user = request.env.user
            # Buscar empleado asociado al usuario
            employee = request.env['hr.employee'].search([('user_id', '=', user.id)], limit=1)
            if not employee:
                return self._error_response('No se encontró un empleado asociado a tu usuario', 403)
            
            fecha_hoy = datetime.now().date()
            fecha_inicio = datetime.combine(fecha_hoy, datetime.min.time())
            fecha_fin = datetime.combine(fecha_hoy, datetime.max.time())

            domain = [
                '|',
                ('responsable_peluqueria', '=', employee.id),
                ('responsable_veterinaria', '=', employee.id),
                ('estado_servicio', 'in', ['pendiente', 'confirmado', 'en_proceso']),
                ('fecha_programada', '>=', fecha_inicio.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
                ('fecha_programada', '<=', fecha_fin.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
            ]

            servicios = request.env['x.mascota.line'].search(domain, order='prioridad desc, fecha_programada asc')

            resultado = []
            for servicio in servicios:
                resultado.append({
                    'id': servicio.id,
                    'mascota': servicio.mascota_id.display_name if servicio.mascota_id else 'Sin nombre',
                    'mascota_id': servicio.mascota_id.id if servicio.mascota_id else None,
                    'cliente': servicio.cliente_id.name if servicio.cliente_id else 'Sin cliente',
                    'presupuesto': servicio.presupuesto_numero or 'Sin presupuesto',
                    'prioridad': servicio.prioridad,
                    'estado_servicio': servicio.estado_servicio,
                    'estado_peluqueria': servicio.estado_peluqueria,
                    'estado_veterinaria': servicio.estado_veterinaria,
                    'fecha_programada': servicio.fecha_programada.strftime('%Y-%m-%d %H:%M:%S') if servicio.fecha_programada else None,
                    'fecha_inicio': servicio.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S') if servicio.fecha_inicio else None,
                    'tiempo_estimado': servicio.duracion_estimada,
                    'total_servicios': servicio.total_servicios,
                    'servicios_peluqueria': {
                        'activo': servicio.servicio_peluqueria,
                        'bano': servicio.bano,
                        'corte': servicio.corte,
                        'mantenimiento': servicio.mantenimiento,
                        'acicalado': servicio.acicalado,
                        'rapado': servicio.rapado,
                        'deslanado': servicio.deslanado,
                        'profilaxis': servicio.profilaxis,
                        'tinte': servicio.tinte,
                        'corte_unas': servicio.corte_unas,
                        'limpieza_oidos': servicio.limpieza_oidos,
                    },
                    'servicios_veterinaria': {
                        'activo': servicio.servicio_veterinaria,
                        'vacunacion': servicio.vacunacion,
                        'desparasitacion': servicio.desparasitacion,
                        'consulta_general': servicio.consulta_general,
                        'consulta_derma': servicio.consulta_derma,
                        'cirugia_menor': servicio.cirugia_menor,
                        'analisis_sangre': servicio.analisis_sangre,
                        'analisis_quimica': servicio.analisis_quimica,
                    },
                'es_mi_peluqueria': user.id in servicio.responsable_peluqueria.mapped('user_id.id') if servicio.responsable_peluqueria else False,
                'es_mi_veterinaria': servicio.responsable_veterinaria.user_id.id == user.id if servicio.responsable_veterinaria and servicio.responsable_veterinaria.user_id else False,
                })

            return self._success_response({
                'servicios': resultado,
                'total': len(resultado)
            })

            return self._success_response({
                'servicios': resultado,
                'total': len(resultado)
            })
        except Exception as e:
            _logger.error(f"Error en get_servicios_pendientes: {e}")
            return self._error_response(str(e), 500)

    @http.route('/api/mascota/v1/servicios/orden-llegada', type='http', auth='user', methods=['GET'], csrf=False, cors='*')
    def get_orden_llegada(self):
        """Obtiene servicios ordenados por llegada (fecha programada)"""
        try:
            user = request.env.user
            # Buscar empleado asociado al usuario
            employee = request.env['hr.employee'].search([('user_id', '=', user.id)], limit=1)
            if not employee:
                return self._error_response('No se encontró un empleado asociado a tu usuario', 403)
            
            fecha_hoy = datetime.now().date()
            fecha_inicio = datetime.combine(fecha_hoy, datetime.min.time())
            fecha_fin = datetime.combine(fecha_hoy, datetime.max.time())

            # Servicios donde el usuario es responsable
            domain = [
                '|',
                ('responsable_peluqueria', '=', employee.id),
                ('responsable_veterinaria', '=', employee.id),
                ('estado_servicio', 'in', ['pendiente', 'confirmado', 'en_proceso']),
                ('fecha_programada', '>=', fecha_inicio.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
                ('fecha_programada', '<=', fecha_fin.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
            ]

            servicios = request.env['x.mascota.line'].search(domain, order='fecha_programada asc, prioridad desc')

            resultado = []
            posicion = 1
            for servicio in servicios:
                resultado.append({
                    'posicion': posicion,
                    'id': servicio.id,
                    'mascota': servicio.mascota_id.display_name if servicio.mascota_id else 'Sin nombre',
                    'cliente': servicio.cliente_id.name if servicio.cliente_id else 'Sin cliente',
                    'presupuesto': servicio.presupuesto_numero or 'Sin presupuesto',
                    'prioridad': servicio.prioridad,
                    'estado': servicio.estado_servicio,
                    'fecha_programada': servicio.fecha_programada.strftime('%Y-%m-%d %H:%M:%S') if servicio.fecha_programada else None,
                    'tiempo_estimado': servicio.duracion_estimada,
                'tipo_servicio': 'peluqueria' if (user.id in servicio.responsable_peluqueria.mapped('user_id.id') if servicio.responsable_peluqueria else False) else 'veterinaria' if (servicio.responsable_veterinaria.user_id.id == user.id if servicio.responsable_veterinaria and servicio.responsable_veterinaria.user_id else False) else 'ambos',
            })
                posicion += 1

            return self._success_response({
                'cola': resultado,
                'total': len(resultado),
                'servicio_actual': resultado[0] if resultado else None,
                'siguiente': resultado[1] if len(resultado) > 1 else None,
            })
        except Exception as e:
            _logger.error(f"Error en get_orden_llegada: {e}")
            return self._error_response(str(e), 500)

    @http.route('/api/mascota/v1/servicios/<int:servicio_id>', type='http', auth='user', methods=['GET'], csrf=False, cors='*')
    def get_servicio_detalle(self, servicio_id):
        """Obtiene detalles completos de un servicio específico"""
        try:
            servicio = request.env['x.mascota.line'].browse(servicio_id)
            
            if not servicio.exists():
                return self._error_response('Servicio no encontrado', 404)

            user = request.env.user
            # Verificar que el usuario sea responsable (Many2many para peluquería)
            es_responsable = False
            if servicio.responsable_peluqueria:
                es_responsable = user.id in servicio.responsable_peluqueria.mapped('user_id.id')
            if not es_responsable and servicio.responsable_veterinaria and servicio.responsable_veterinaria.user_id:
                es_responsable = servicio.responsable_veterinaria.user_id.id == user.id
            if not es_responsable:
                return self._error_response('No tienes permiso para ver este servicio', 403)

            # Obtener checklist
            checklist_peluqueria = []
            checklist_veterinaria = []
            for tarea in servicio.checklist_peluqueria:
                checklist_peluqueria.append({
                    'id': tarea.id,
                    'tarea': tarea.tarea,
                    'secuencia': tarea.secuencia,
                    'completada': tarea.completada,
                    'fecha_completada': tarea.fecha_completada.strftime('%Y-%m-%d %H:%M:%S') if tarea.fecha_completada else None,
                    'completada_por': tarea.completada_por.name if tarea.completada_por else None,
                    'obligatoria': tarea.obligatoria,
                    'notas': tarea.notas or '',
                })
            
            for tarea in servicio.checklist_veterinaria:
                checklist_veterinaria.append({
                    'id': tarea.id,
                    'tarea': tarea.tarea,
                    'secuencia': tarea.secuencia,
                    'completada': tarea.completada,
                    'fecha_completada': tarea.fecha_completada.strftime('%Y-%m-%d %H:%M:%S') if tarea.fecha_completada else None,
                    'completada_por': tarea.completada_por.name if tarea.completada_por else None,
                    'obligatoria': tarea.obligatoria,
                    'notas': tarea.notas or '',
                })

            # Obtener historial de atención
            historial = []
            for h in servicio.historial_atencion_ids:
                historial.append({
                    'id': h.id,
                    'responsable': h.responsable_id.name,
                    'tipo_servicio': h.tipo_servicio,
                    'servicio_especifico': dict(h._fields['servicio_especifico'].selection).get(h.servicio_especifico),
                    'fecha_inicio': h.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S') if h.fecha_inicio else None,
                    'fecha_fin': h.fecha_fin.strftime('%Y-%m-%d %H:%M:%S') if h.fecha_fin else None,
                    'duracion_horas': h.duracion_horas,
                    'estado': h.estado,
                    'notas': h.notas or '',
                })

            resultado = {
                'id': servicio.id,
                'mascota': {
                    'id': servicio.mascota_id.id if servicio.mascota_id else None,
                    'nombre': servicio.mascota_id.display_name if servicio.mascota_id else 'Sin nombre',
                    'raza': servicio.raza or 'Sin raza',
                    'especie': servicio.especie or 'Sin especie',
                },
                'cliente': {
                    'id': servicio.cliente_id.id if servicio.cliente_id else None,
                    'nombre': servicio.cliente_id.name if servicio.cliente_id else 'Sin cliente',
                },
                'presupuesto': servicio.presupuesto_numero or 'Sin presupuesto',
                'prioridad': servicio.prioridad,
                'estado_servicio': servicio.estado_servicio,
                'estado_peluqueria': servicio.estado_peluqueria,
                'estado_veterinaria': servicio.estado_veterinaria,
                'fecha_programada': servicio.fecha_programada.strftime('%Y-%m-%d %H:%M:%S') if servicio.fecha_programada else None,
                'fecha_inicio': servicio.fecha_inicio.strftime('%Y-%m-%d %H:%M:%S') if servicio.fecha_inicio else None,
                'fecha_fin': servicio.fecha_fin.strftime('%Y-%m-%d %H:%M:%S') if servicio.fecha_fin else None,
                'duracion_estimada': servicio.duracion_estimada,
                'duracion_real': servicio.duracion_real,
                'tiempo_total_responsables': servicio.tiempo_total_responsables,
                'motivo_visita': servicio.motivo_visita or '',
                'observaciones': servicio.observaciones or '',
                'observaciones_cliente': servicio.observaciones_cliente or '',
                'servicios_peluqueria': {
                    'activo': servicio.servicio_peluqueria,
                    'bano': servicio.bano,
                    'corte': servicio.corte,
                    'mantenimiento': servicio.mantenimiento,
                    'acicalado': servicio.acicalado,
                    'rapado': servicio.rapado,
                    'deslanado': servicio.deslanado,
                    'profilaxis': servicio.profilaxis,
                    'tinte': servicio.tinte,
                    'corte_unas': servicio.corte_unas,
                    'limpieza_oidos': servicio.limpieza_oidos,
                },
                'servicios_veterinaria': {
                    'activo': servicio.servicio_veterinaria,
                    'vacunacion': servicio.vacunacion,
                    'desparasitacion': servicio.desparasitacion,
                    'consulta_general': servicio.consulta_general,
                    'consulta_derma': servicio.consulta_derma,
                    'cirugia_menor': servicio.cirugia_menor,
                    'analisis_sangre': servicio.analisis_sangre,
                    'analisis_quimica': servicio.analisis_quimica,
                },
                'checklist_peluqueria': checklist_peluqueria,
                'checklist_veterinaria': checklist_veterinaria,
                'historial_atencion': historial,
                'responsables': {
                    'peluqueria': ', '.join(servicio.responsable_peluqueria.mapped('name')) if servicio.responsable_peluqueria else None,
                    'veterinaria': servicio.responsable_veterinaria.name if servicio.responsable_veterinaria else None,
                },
            }

            return self._success_response(resultado)
        except Exception as e:
            _logger.error(f"Error en get_servicio_detalle: {e}")
            return self._error_response(str(e), 500)

    @http.route('/api/mascota/v1/servicios/<int:servicio_id>/iniciar', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def iniciar_servicio(self, servicio_id, tipo_servicio='peluqueria'):
        """Inicia un servicio (peluquería o veterinaria)"""
        try:
            servicio = request.env['x.mascota.line'].browse(servicio_id)
            
            if not servicio.exists():
                return {'success': False, 'error': 'Servicio no encontrado'}

            user = request.env.user
            
            if tipo_servicio == 'peluqueria':
                # Many2many: verificar si el usuario está en la lista de responsables
                if not servicio.responsable_peluqueria or user.id not in servicio.responsable_peluqueria.mapped('user_id.id'):
                    return {'success': False, 'error': 'No eres el responsable de peluquería'}
                servicio.action_iniciar_peluqueria()
            elif tipo_servicio == 'veterinaria':
                if not servicio.responsable_veterinaria or not servicio.responsable_veterinaria.user_id or servicio.responsable_veterinaria.user_id.id != user.id:
                    return {'success': False, 'error': 'No eres el responsable de veterinaria'}
                servicio.action_iniciar_veterinaria()
            else:
                return {'success': False, 'error': 'Tipo de servicio inválido'}

            return {
                'success': True,
                'message': f'Servicio de {tipo_servicio} iniciado correctamente',
                'estado': servicio.estado_servicio,
                'estado_servicio': servicio.estado_peluqueria if tipo_servicio == 'peluqueria' else servicio.estado_veterinaria,
            }
        except Exception as e:
            _logger.error(f"Error en iniciar_servicio: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/mascota/v1/servicios/<int:servicio_id>/completar', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def completar_servicio(self, servicio_id, tipo_servicio='peluqueria'):
        """Completa un servicio (peluquería o veterinaria)"""
        try:
            servicio = request.env['x.mascota.line'].browse(servicio_id)
            
            if not servicio.exists():
                return {'success': False, 'error': 'Servicio no encontrado'}

            user = request.env.user
            
            if tipo_servicio == 'peluqueria':
                # Many2many: verificar si el usuario está en la lista de responsables
                if not servicio.responsable_peluqueria or user.id not in servicio.responsable_peluqueria.mapped('user_id.id'):
                    return {'success': False, 'error': 'No eres el responsable de peluquería'}
                servicio.action_completar_peluqueria()
            elif tipo_servicio == 'veterinaria':
                if not servicio.responsable_veterinaria or not servicio.responsable_veterinaria.user_id or servicio.responsable_veterinaria.user_id.id != user.id:
                    return {'success': False, 'error': 'No eres el responsable de veterinaria'}
                servicio.action_completar_veterinaria()
            else:
                return {'success': False, 'error': 'Tipo de servicio inválido'}

            return {
                'success': True,
                'message': f'Servicio de {tipo_servicio} completado correctamente',
                'estado': servicio.estado_servicio,
                'tiempo_total': servicio.tiempo_total_responsables,
            }
        except Exception as e:
            _logger.error(f"Error en completar_servicio: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/mascota/v1/checklist/<int:tarea_id>/marcar', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def marcar_tarea_checklist(self, tarea_id, completada=True, notas=None):
        """Marca una tarea del checklist como completada o pendiente"""
        try:
            tarea = request.env['x.mascota.checklist'].browse(tarea_id)
            
            if not tarea.exists():
                return {'success': False, 'error': 'Tarea no encontrada'}

            user = request.env.user
            
            if completada:
                tarea.action_marcar_completada()
                if notas:
                    tarea.notas = notas
            else:
                tarea.action_marcar_pendiente()

            return {
                'success': True,
                'message': f'Tarea marcada como {"completada" if completada else "pendiente"}',
                'tarea': {
                    'id': tarea.id,
                    'tarea': tarea.tarea,
                    'completada': tarea.completada,
                    'fecha_completada': tarea.fecha_completada.strftime('%Y-%m-%d %H:%M:%S') if tarea.fecha_completada else None,
                    'completada_por': tarea.completada_por.name if tarea.completada_por else None,
                }
            }
        except Exception as e:
            _logger.error(f"Error en marcar_tarea_checklist: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/mascota/v1/servicios/<int:servicio_id>/observaciones', type='json', auth='user', methods=['POST'], csrf=False, cors='*')
    def actualizar_observaciones(self, servicio_id, observaciones=None):
        """Actualiza las observaciones de un servicio"""
        try:
            servicio = request.env['x.mascota.line'].browse(servicio_id)
            
            if not servicio.exists():
                return {'success': False, 'error': 'Servicio no encontrado'}

            user = request.env.user
            es_responsable = False
            # Many2many para peluquería
            if servicio.responsable_peluqueria:
                es_responsable = user.id in servicio.responsable_peluqueria.mapped('user_id.id')
            if not es_responsable and servicio.responsable_veterinaria and servicio.responsable_veterinaria.user_id:
                es_responsable = servicio.responsable_veterinaria.user_id.id == user.id
            if not es_responsable:
                return {'success': False, 'error': 'No tienes permiso para actualizar este servicio'}

            if observaciones is not None:
                servicio.observaciones = observaciones
                servicio.message_post(body=f"Observaciones actualizadas por {user.name}")

            return {
                'success': True,
                'message': 'Observaciones actualizadas correctamente',
                'observaciones': servicio.observaciones or '',
            }
        except Exception as e:
            _logger.error(f"Error en actualizar_observaciones: {e}")
            return {'success': False, 'error': str(e)}

    @http.route('/api/mascota/v1/historial/<int:historial_id>/foto', type='http', auth='user', methods=['POST'], csrf=False, cors='*')
    def agregar_foto_atencion(self, historial_id):
        """Agrega una foto a un historial de atención"""
        try:
            historial = request.env['x.mascota.atencion.historial'].browse(historial_id)
            
            if not historial.exists():
                return self._error_response('Historial no encontrado', 404)

            user = request.env.user
            if historial.responsable_id.id != user.id:
                return self._error_response('No tienes permiso para agregar fotos a este historial', 403)

            # Obtener foto del request (multipart/form-data)
            foto_file = request.httprequest.files.get('foto')
            if not foto_file:
                return self._error_response('No se proporcionó ninguna foto', 400)

            tipo_foto = request.params.get('tipo_foto', 'durante')
            descripcion = request.params.get('descripcion', '')

            # Leer archivo de imagen
            foto_data = foto_file.read()
            
            # Crear registro de foto
            foto_record = request.env['x.mascota.atencion.foto'].create({
                'historial_id': historial_id,
                'foto': foto_data.encode('base64'),
                'tipo_foto': tipo_foto,
                'descripcion': descripcion,
                'fecha_tomada': datetime.now().strftime(DEFAULT_SERVER_DATETIME_FORMAT),
                'tomada_por': user.id,
            })

            return self._success_response({
                'id': foto_record.id,
                'message': 'Foto agregada correctamente',
                'tipo_foto': tipo_foto,
                'fecha_tomada': foto_record.fecha_tomada.strftime('%Y-%m-%d %H:%M:%S'),
            })
        except Exception as e:
            _logger.error(f"Error en agregar_foto_atencion: {e}")
            return self._error_response(str(e), 500)

    @http.route('/api/mascota/v1/servicios/estadisticas', type='http', auth='user', methods=['GET'], csrf=False, cors='*')
    def get_estadisticas(self, fecha_inicio=None, fecha_fin=None):
        """Obtiene estadísticas del usuario para un rango de fechas"""
        try:
            user = request.env.user
            
            # Fechas por defecto: hoy
            if not fecha_inicio:
                fecha_inicio = datetime.now().date()
            else:
                fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
            
            if not fecha_fin:
                fecha_fin = datetime.now().date()
            else:
                fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()

            fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
            fecha_fin_dt = datetime.combine(fecha_fin, datetime.max.time())

            # Historial de atención del usuario
            historial = request.env['x.mascota.atencion.historial'].search([
                ('responsable_id', '=', user.id),
                ('fecha_inicio', '>=', fecha_inicio_dt.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
                ('fecha_inicio', '<=', fecha_fin_dt.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
                ('estado', '=', 'completado'),
            ])

            horas_trabajadas = sum(h.duracion_horas for h in historial)
            servicios_completados = len(historial)

            return self._success_response({
                'responsable': user.name,
                'fecha_inicio': fecha_inicio.strftime('%Y-%m-%d'),
                'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
                'horas_trabajadas': horas_trabajadas,
                'servicios_completados': servicios_completados,
                'promedio_horas_por_servicio': horas_trabajadas / servicios_completados if servicios_completados > 0 else 0,
            })
        except Exception as e:
            _logger.error(f"Error en get_estadisticas: {e}")
            return self._error_response(str(e), 500)

