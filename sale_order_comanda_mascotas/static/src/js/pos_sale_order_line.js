/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { _t } from "@web/core/l10n/translation";

// Categorías que requieren presupuesto (no se pueden agregar directamente en POS)
const CATEGORIAS_REQUIEREN_PRESUPUESTO = ['Peluquería', 'Clínica'];

/**
 * Extender PosOrderline para agregar campos de estilistas y mascota
 * CRÍTICO: Usar nombres de campos con prefijo "_pos_" para evitar que el framework
 * los interprete como relaciones Many2many del backend
 * Similar a pw_pos_salesperson_emp que usa "user_id" (string simple)
 */
patch(PosOrderline.prototype, {
    /**
     * Inicializar campos desde datos serializados
     * CRÍTICO: Usar SOLO campos con prefijo "_pos_" para evitar conflictos con el framework reactivo
     * NO usar this.estilista_ids ni this.mascota_id directamente - causa error al borrar líneas
     */
    setup(vals) {
        super.setup(...arguments);
        // SOLO campos con prefijo _pos_ - evita "recordToDisconnect is undefined"
        this._pos_estilista_ids = this._pos_estilista_ids || [];
        this._pos_estilista_nombres = this._pos_estilista_nombres || '';
        this._pos_mascota_id = this._pos_mascota_id || null;
        this._pos_mascota_nombre = this._pos_mascota_nombre || '';
    },

    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        // Cargar desde JSON a campos _pos_
        this._pos_estilista_ids = json.estilista_ids || [];
        this._pos_mascota_id = json.mascota_id || null;
        this._pos_estilista_nombres = json.estilista_nombres || '';
        this._pos_mascota_nombre = json.mascota_nombre || '';
    },

    /**
     * ODOO 18: serialize() es el método correcto para exportar datos al backend.
     * Leer desde _pos_ y exportar como estilista_ids/mascota_id para el backend.
     */
    serialize(options) {
        const json = super.serialize(...arguments);
        console.log('[Mascotas] ========== PosOrderline.serialize ==========');
        console.log('[Mascotas] _pos_estilista_ids:', this._pos_estilista_ids);
        console.log('[Mascotas] _pos_mascota_id:', this._pos_mascota_id);
        
        // Exportar estilista_ids (array de IDs) desde _pos_estilista_ids
        if (this._pos_estilista_ids && this._pos_estilista_ids.length > 0) {
            json.estilista_ids = [...this._pos_estilista_ids];
            console.log('[Mascotas] ✓ serialize - estilista_ids:', json.estilista_ids);
        }
        
        // Exportar mascota_id (ID simple) desde _pos_mascota_id
        if (this._pos_mascota_id) {
            json.mascota_id = this._pos_mascota_id;
            console.log('[Mascotas] ✓ serialize - mascota_id:', json.mascota_id);
        }
        
        console.log('[Mascotas] serialize result keys:', Object.keys(json));
        return json;
    },

    /**
     * export_as_JSON - mantener por compatibilidad con flujos que aún lo usen.
     */
    export_as_JSON() {
        const result = super.export_as_JSON(...arguments);
        if (this._pos_estilista_ids && this._pos_estilista_ids.length > 0) {
            result.estilista_ids = [...this._pos_estilista_ids];
        }
        if (this._pos_mascota_id) {
            result.mascota_id = this._pos_mascota_id;
        }
        return result;
    },
    
    /**
     * Métodos helper para gestionar estilistas
     * Almacena en _pos_estilista_ids (array de números)
     */
    setEstilistas(estilistaIds, estilista_nombres) {
        // Convertir array de IDs a array de números
        const ids = [];
        if (estilistaIds && Array.isArray(estilistaIds)) {
            for (const item of estilistaIds) {
                if (item && typeof item === 'object' && 'id' in item) {
                    ids.push(item.id);
                } else if (typeof item === 'number') {
                    ids.push(item);
                }
            }
        }
        this._pos_estilista_ids = ids;
        this._pos_estilista_nombres = estilista_nombres || '';
        console.log('[Mascotas] setEstilistas - _pos_estilista_ids:', this._pos_estilista_ids);
    },
    
    getEstilistas() {
        return {
            ids: this._pos_estilista_ids || [],
            nombres: this._pos_estilista_nombres || ''
        };
    },
    
    removeEstilistas() {
        this._pos_estilista_ids = [];
        this._pos_estilista_nombres = '';
    },
    
    /**
     * Verificar si tiene estilistas asignados
     */
    hasEstilistas() {
        return !!(this._pos_estilista_ids && this._pos_estilista_ids.length > 0);
    },
    
    setMascota(mascotaId, mascotaNombre) {
        // Almacenar ID y nombre
        let id = null;
        let nombre = '';
        
        if (mascotaId && typeof mascotaId === 'object' && 'id' in mascotaId) {
            id = mascotaId.id;
            nombre = mascotaId.name || mascotaNombre || '';
        } else if (typeof mascotaId === 'number') {
            id = mascotaId;
            nombre = mascotaNombre || '';
        } else {
            id = null;
            nombre = mascotaNombre || mascotaId || '';
        }
        
        this._pos_mascota_id = id;
        this._pos_mascota_nombre = nombre;
        console.log('[Mascotas] setMascota - _pos_mascota_id:', this._pos_mascota_id);
    },
    
    getMascota() {
        return {
            id: this._pos_mascota_id || null,
            nombre: this._pos_mascota_nombre || ''
        };
    },
    
    removeMascota() {
        this._pos_mascota_id = null;
        this._pos_mascota_nombre = '';
    },
    
    /**
     * Verificar si tiene mascota asignada
     */
    hasMascota() {
        return !!(this._pos_mascota_id || (this._pos_mascota_nombre && this._pos_mascota_nombre.length > 0));
    },
});

/**
 * Extiende el POS para asignar el estilista cuando se carga un presupuesto
 * Usa campo separado estilista_id (no user_id del módulo salesperson)
 */

// Extender PosStore para asignar estilista al cargar presupuesto
patch(PosStore.prototype, {
    /**
     * Verifica si un producto pertenece a una categoría que requiere presupuesto
     */
    _esProductoRequierePresupuesto(product) {
        if (!product || !product.categ_id) {
            return false;
        }
        
        // Obtener la categoría del producto
        let categ = product.categ_id;
        
        // Si categ_id es un array [id, name], extraer el nombre
        if (Array.isArray(categ)) {
            const categName = categ[1] || '';
            return CATEGORIAS_REQUIEREN_PRESUPUESTO.some(c => categName.includes(c));
        }
        
        // Si es un objeto Proxy, intentar obtener el nombre
        if (categ && typeof categ === 'object') {
            const categName = categ.name || categ.display_name || '';
            if (CATEGORIAS_REQUIEREN_PRESUPUESTO.some(c => categName.includes(c))) {
                return true;
            }
            // Verificar categoría padre
            if (categ.parent_id) {
                let parent = categ.parent_id;
                while (parent) {
                    const parentName = parent.name || parent.display_name || '';
                    if (CATEGORIAS_REQUIEREN_PRESUPUESTO.some(c => parentName.includes(c))) {
                        return true;
                    }
                    parent = parent.parent_id;
                }
            }
        }
        
        return false;
    },

    /**
     * Override para asignar estilistas desde el presupuesto cuando se añaden líneas
     * Y bloquear productos de Peluquería si no vienen de presupuesto
     * NOTA: estilista_ids es ahora un array (Many2many) para división de comisiones
     */
    async addLineToCurrentOrder(vals, opts = {}, configure = true) {
        console.log('[Mascotas] ========== addLineToCurrentOrder ==========');
        console.log('[Mascotas] vals completo:', vals);
        
        // sale_order_line_id es un Proxy con los datos de la línea
        const saleOrderLine = vals.sale_order_line_id;
        console.log('[Mascotas] sale_order_line_id (Proxy):', saleOrderLine);
        
        // Verificar si el producto requiere presupuesto y no viene de uno
        const product = vals.product_id;
        if (product && !saleOrderLine) {
            // Verificar si el producto es de categoría que requiere presupuesto
            if (this._esProductoRequierePresupuesto(product)) {
                const productName = product.display_name || product.name || 'Este producto';
                console.log('[Mascotas] ⚠️ BLOQUEADO: Producto de Peluquería sin presupuesto:', productName);
                
                // Mostrar notificación de error usando el método del POS
                this.notification.add(
                    _t('Los servicios de Peluquería y Clínica solo pueden agregarse desde un presupuesto. Por favor, cargue el presupuesto del cliente.'),
                    { type: 'danger' }
                );
                
                // No agregar el producto - retornar sin llamar a super
                return false;
            }
        }
        
        // Intentar obtener datos del Proxy directamente
        if (saleOrderLine) {
            console.log('[Mascotas] Propiedades del sale_order_line_id:');
            console.log('[Mascotas]   - id:', saleOrderLine.id);
            console.log('[Mascotas]   - estilista_ids:', saleOrderLine.estilista_ids);
            console.log('[Mascotas]   - estilista_nombres:', saleOrderLine.estilista_nombres);
            console.log('[Mascotas]   - mascota_id:', saleOrderLine.mascota_id);
            console.log('[Mascotas]   - mascota_id_valor:', saleOrderLine.mascota_id_valor);
            console.log('[Mascotas]   - mascota_nombre:', saleOrderLine.mascota_nombre);
            console.log('[Mascotas]   - product_id:', saleOrderLine.product_id);
            
            // Listar todas las propiedades disponibles
            try {
                const keys = Object.keys(saleOrderLine);
                console.log('[Mascotas] Todas las keys del Proxy:', keys);
            } catch (e) {
                console.log('[Mascotas] No se pudieron obtener keys:', e);
            }
        }
        
        const result = await super.addLineToCurrentOrder(vals, opts, configure);
        
        // Si viene de un presupuesto, buscar datos adicionales
        if (saleOrderLine) {
            const line = this.get_order().get_last_orderline();
            console.log('[Mascotas] Línea POS obtenida:', line);
            
            if (line) {
                // Intentar obtener estilistas desde el Proxy de sale_order_line (ahora es array)
                let estilistaIds = [];
                let estilistaNombres = '';
                let mascotaId = null;
                let mascotaNombre = '';
                
                // Método 1: Desde vals directamente
                if (vals.estilista_ids && vals.estilista_ids.length > 0) {
                    // Convertir a array de IDs si es necesario
                    estilistaIds = [];
                    for (const item of vals.estilista_ids) {
                        if (item && typeof item === 'object' && 'id' in item) {
                            estilistaIds.push(item.id);
                        } else if (typeof item === 'number') {
                            estilistaIds.push(item);
                        }
                    }
                    estilistaNombres = vals.estilista_nombres || '';
                    console.log('[Mascotas] ✓ Estilistas desde vals (convertidos a IDs):', estilistaIds, estilistaNombres);
                }
                // Método 2: Desde el Proxy de sale_order_line_id
                else if (saleOrderLine.estilista_ids) {
                    const estArr = saleOrderLine.estilista_ids;
                    console.log('[Mascotas] DEBUG estArr:', estArr, 'tipo:', typeof estArr);
                    console.log('[Mascotas] DEBUG estArr.length:', estArr.length);
                    
                    // Convertir Proxy(Array) a array simple de IDs
                    // En Odoo 18, Many2many es un Proxy que puede tener .ids o ser iterable
                    if (estArr.ids && Array.isArray(estArr.ids)) {
                        // Caso 1: Proxy con propiedad .ids (Odoo 18 Many2many relacional)
                        estilistaIds = [...estArr.ids];
                        console.log('[Mascotas] DEBUG - usando estArr.ids:', estilistaIds);
                    } else if (typeof estArr.map === 'function') {
                        // Caso 2: Proxy iterable con .map()
                        estilistaIds = estArr.map(est => {
                            if (est && typeof est === 'object' && 'id' in est) {
                                return est.id;
                            } else if (typeof est === 'number') {
                                return est;
                            }
                            return null;
                        }).filter(id => id !== null);
                        console.log('[Mascotas] DEBUG - usando estArr.map():', estilistaIds);
                    } else if (Array.isArray(estArr)) {
                        // Caso 3: Array simple
                        estilistaIds = [];
                        for (const est of estArr) {
                            if (est && typeof est === 'object' && 'id' in est) {
                                estilistaIds.push(est.id);
                            } else if (typeof est === 'number') {
                                estilistaIds.push(est);
                            }
                        }
                        console.log('[Mascotas] DEBUG - usando Array.isArray:', estilistaIds);
                    } else {
                        // Caso 4: Intentar iterar con for...of
                        try {
                            estilistaIds = [];
                            for (const est of estArr) {
                                if (est && typeof est === 'object' && 'id' in est) {
                                    estilistaIds.push(est.id);
                                } else if (typeof est === 'number') {
                                    estilistaIds.push(est);
                                }
                            }
                            console.log('[Mascotas] DEBUG - usando for...of:', estilistaIds);
                        } catch (e) {
                            console.log('[Mascotas] DEBUG - error iterando:', e);
                        }
                    }
                    
                    // Obtener nombres desde el campo computed
                    if (!estilistaNombres && saleOrderLine.estilista_nombres) {
                        estilistaNombres = saleOrderLine.estilista_nombres;
                    }
                    console.log('[Mascotas] ✓ Estilistas desde Proxy (convertidos a IDs):', estilistaIds, estilistaNombres);
                }
                
                // Asignar estilistas si se encontraron (usar método setEstilistas)
                if (estilistaIds.length > 0) {
                    line.setEstilistas(estilistaIds, estilistaNombres);
                    console.log('[Mascotas] ✓ Estilistas asignados:', estilistaIds.length, 'estilistas');
                } else {
                    console.log('[Mascotas] ✗ No se encontraron estilistas');
                }
                
                // Procesar veterinario -> asignar a user_id (Salesperson del módulo pw_pos_salesperson_emp)
                // El módulo salesperson espera el objeto empleado completo, no solo el ID
                let veterinarioId = null;
                if (vals.veterinario_id) {
                    veterinarioId = Array.isArray(vals.veterinario_id) ? vals.veterinario_id[0] : vals.veterinario_id;
                    console.log('[Mascotas] ✓ Veterinario ID desde vals:', veterinarioId);
                } else if (saleOrderLine.veterinario_id) {
                    const vet = saleOrderLine.veterinario_id;
                    veterinarioId = vet.id || (Array.isArray(vet) ? vet[0] : vet);
                    console.log('[Mascotas] ✓ Veterinario ID desde Proxy:', veterinarioId);
                }
                
                if (veterinarioId) {
                    // Buscar el empleado completo (requerido por pw_pos_salesperson_emp)
                    // En Odoo 18, intentamos múltiples fuentes
                    let employee = null;
                    
                    // Método 1: pos.employees (array directo)
                    if (this.pos?.employees) {
                        employee = this.pos.employees.find(emp => emp.id === veterinarioId);
                    }
                    
                    // Método 2: models['hr.employee'] (Odoo 18)
                    if (!employee && this.models && this.models['hr.employee']) {
                        const employees = this.models['hr.employee'].getAll();
                        employee = employees.find(emp => emp.id === veterinarioId);
                    }
                    
                    // Método 3: data.models (otra variante Odoo 18)
                    if (!employee && this.data?.models?.['hr.employee']) {
                        employee = this.data.models['hr.employee'].find(emp => emp.id === veterinarioId);
                    }
                    
                    if (employee) {
                        line.user_id = employee;
                        console.log('[Mascotas] ✓ Veterinario asignado como empleado:', employee.name);
                    } else {
                        // No usar objeto plano: puede causar error "modelName" al borrar la línea.
                        // Dejar user_id sin asignar; el veterinario se guarda por estilista/backend.
                        console.log('[Mascotas] ⚠️ Empleado hr.employee no encontrado para ID:', veterinarioId);
                    }
                }
                
                // Obtener mascota - usar mascota_id_valor (Integer) como fuente principal del ID
                // mascota_id_valor evita problemas con Many2one a modelo de Studio (x_mascota)
                if (saleOrderLine.mascota_id_valor && saleOrderLine.mascota_id_valor > 0) {
                    mascotaId = saleOrderLine.mascota_id_valor;
                    mascotaNombre = saleOrderLine.mascota_nombre || '';
                    console.log('[Mascotas] ✓ Mascota desde mascota_id_valor:', mascotaId, mascotaNombre);
                } else if (vals.mascota_nombre) {
                    mascotaNombre = vals.mascota_nombre;
                    // Intentar obtener ID si está disponible
                    if (vals.mascota_id_valor) {
                        mascotaId = vals.mascota_id_valor;
                    } else if (vals.mascota_id) {
                        mascotaId = typeof vals.mascota_id === 'object' ? vals.mascota_id.id : vals.mascota_id;
                    }
                    console.log('[Mascotas] ✓ Mascota desde vals.mascota_nombre:', mascotaId, mascotaNombre);
                } else if (saleOrderLine.mascota_nombre) {
                    // Campo Char almacenado en sale.order.line
                    mascotaNombre = saleOrderLine.mascota_nombre;
                    // Intentar obtener ID desde mascota_id si está disponible
                    if (saleOrderLine.mascota_id) {
                        const masc = saleOrderLine.mascota_id;
                        mascotaId = masc.id || masc;
                    }
                    console.log('[Mascotas] ✓ Mascota desde Proxy.mascota_nombre:', mascotaId, mascotaNombre);
                } else if (vals.mascota_id) {
                    const mascId = Array.isArray(vals.mascota_id) ? vals.mascota_id[0] : vals.mascota_id;
                    mascotaNombre = Array.isArray(vals.mascota_id) ? vals.mascota_id[1] : '';
                    mascotaId = mascId;
                    console.log('[Mascotas] ✓ Mascota desde vals.mascota_id:', mascotaId, mascotaNombre);
                } else if (saleOrderLine.mascota_id) {
                    const masc = saleOrderLine.mascota_id;
                    mascotaId = masc.id || (Array.isArray(masc) ? masc[0] : null);
                    mascotaNombre = masc.name || masc.display_name || (Array.isArray(masc) ? masc[1] : '');
                    console.log('[Mascotas] ✓ Mascota desde Proxy.mascota_id:', mascotaId, mascotaNombre);
                }
                
                if (mascotaId || mascotaNombre) {
                    line.setMascota(mascotaId, mascotaNombre);
                    console.log('[Mascotas] ✓ Mascota asignada:', mascotaId, mascotaNombre);
                } else {
                    console.log('[Mascotas] ✗ No se encontró mascota');
                }
            }
        }
        
        return result;
    },

    /**
     * Override del método que carga un presupuesto
     * NOTA: estilista_ids es ahora un array (Many2many) para división de comisiones
     */
    async selectQuotation(order) {
        console.log('[Mascotas] ========== selectQuotation ==========');
        console.log('[Mascotas] order completo:', order);
        console.log('[Mascotas] order.order_line:', order?.order_line);
        
        if (order?.order_line) {
            console.log('[Mascotas] Cantidad de líneas en order_line:', order.order_line.length);
            order.order_line.forEach((line, idx) => {
                console.log(`[Mascotas] Línea ${idx}:`, {
                    id: line.id,
                    product_id: line.product_id,
                    estilista_ids: line.estilista_ids,
                    estilista_nombres: line.estilista_nombres,
                    veterinario_id: line.veterinario_id,
                    veterinario_nombre: line.veterinario_nombre,
                    mascota_id: line.mascota_id,
                    mascota_id_valor: line.mascota_id_valor,
                    mascota_nombre: line.mascota_nombre,
                });
            });
        }
        
        const result = await super.selectQuotation(order);
        
        // Después de cargar el presupuesto, verificar las líneas y asignar estilistas
        if (order && order.order_line) {
            const currentOrder = this.get_order();
            if (currentOrder) {
                console.log('[Mascotas] Procesando líneas del pedido actual...');
                const orderlines = currentOrder.get_orderlines();
                console.log('[Mascotas] Cantidad de líneas en POS:', orderlines.length);
                
                for (const line of orderlines) {
                    const saleLineId = line.sale_order_line_id;
                    console.log('[Mascotas] Línea POS - sale_order_line_id:', saleLineId);
                    
                    if (saleLineId) {
                        const saleLine = order.order_line.find(sl => sl.id === saleLineId);
                        console.log('[Mascotas] Línea presupuesto encontrada:', saleLine);
                        
                        if (saleLine) {
                            // Procesar estilistas (ahora es array)
                            const estArr = saleLine.estilista_ids;
                            if (estArr && (estArr.length > 0 || (estArr.ids && estArr.ids.length > 0))) {
                                let estilistaIds = [];
                                let estilistaNombres = '';
                                
                                console.log('[Mascotas] selectQuotation DEBUG estArr:', estArr, 'tipo:', typeof estArr);
                                
                                // Convertir Proxy(Array) a array simple de IDs
                                if (estArr.ids && Array.isArray(estArr.ids)) {
                                    // Caso 1: Proxy con propiedad .ids
                                    estilistaIds = [...estArr.ids];
                                    console.log('[Mascotas] selectQuotation - usando estArr.ids:', estilistaIds);
                                } else if (typeof estArr.map === 'function') {
                                    // Caso 2: Proxy iterable con .map()
                                    estilistaIds = estArr.map(est => {
                                        if (est && typeof est === 'object' && 'id' in est) {
                                            return est.id;
                                        } else if (typeof est === 'number') {
                                            return est;
                                        }
                                        return null;
                                    }).filter(id => id !== null);
                                    console.log('[Mascotas] selectQuotation - usando estArr.map():', estilistaIds);
                                } else if (Array.isArray(estArr)) {
                                    // Caso 3: Array simple
                                    for (const est of estArr) {
                                        if (est && typeof est === 'object' && 'id' in est) {
                                            estilistaIds.push(est.id);
                                        } else if (typeof est === 'number') {
                                            estilistaIds.push(est);
                                        }
                                    }
                                    console.log('[Mascotas] selectQuotation - usando Array.isArray:', estilistaIds);
                                }
                                
                                // Obtener nombres desde el campo computed
                                if (saleLine.estilista_nombres) {
                                    estilistaNombres = saleLine.estilista_nombres;
                                }
                                
                                line.setEstilistas(estilistaIds, estilistaNombres);
                                console.log('[Mascotas] ✓ Estilistas asignados desde presupuesto:', estilistaIds.length, 'estilistas, IDs:', estilistaIds);
                            } else {
                                console.log('[Mascotas] ✗ No hay estilista_ids en línea de presupuesto');
                            }
                            
                            // Procesar veterinario -> asignar a user_id (Salesperson del módulo pw_pos_salesperson_emp)
                            if (saleLine.veterinario_id) {
                                const veterinarioId = Array.isArray(saleLine.veterinario_id) 
                                    ? saleLine.veterinario_id[0] 
                                    : (saleLine.veterinario_id.id || saleLine.veterinario_id);
                                
                                // Buscar el empleado completo (requerido por pw_pos_salesperson_emp)
                                let employee = null;
                                
                                // Método 1: pos.employees
                                if (this.pos?.employees) {
                                    employee = this.pos.employees.find(emp => emp.id === veterinarioId);
                                }
                                
                                // Método 2: models['hr.employee'] (Odoo 18)
                                if (!employee && this.models && this.models['hr.employee']) {
                                    const employees = this.models['hr.employee'].getAll();
                                    employee = employees.find(emp => emp.id === veterinarioId);
                                }
                                
                                if (employee) {
                                    line.user_id = employee;
                                    console.log('[Mascotas] ✓ Veterinario asignado como empleado:', employee.name);
                                } else {
                                    // No usar objeto plano: puede causar error "modelName" al borrar la línea.
                                    console.log('[Mascotas] ⚠️ Empleado hr.employee no encontrado para ID:', veterinarioId);
                                }
                            } else {
                                console.log('[Mascotas] ✗ No hay veterinario_id en línea de presupuesto');
                            }
                            
                            // Procesar mascota - usar mascota_id_valor (Integer) como fuente principal
                            // mascota_id_valor evita problemas con Many2one a modelo de Studio (x_mascota)
                            if (saleLine.mascota_id_valor && saleLine.mascota_id_valor > 0) {
                                const mascotaId = saleLine.mascota_id_valor;
                                const mascotaNombre = saleLine.mascota_nombre || '';
                                line.setMascota(mascotaId, mascotaNombre);
                                console.log('[Mascotas] ✓ Mascota desde mascota_id_valor:', mascotaId, mascotaNombre);
                            } else if (saleLine.mascota_id) {
                                let mascotaId = null;
                                let mascotaNombre = '';
                                
                                if (typeof saleLine.mascota_id === 'object' && saleLine.mascota_id.id) {
                                    mascotaId = saleLine.mascota_id.id;
                                    mascotaNombre = saleLine.mascota_id.name || saleLine.mascota_nombre || '';
                                } else if (Array.isArray(saleLine.mascota_id)) {
                                    mascotaId = saleLine.mascota_id[0];
                                    mascotaNombre = saleLine.mascota_id[1] || saleLine.mascota_nombre || '';
                                } else {
                                    mascotaId = saleLine.mascota_id;
                                    mascotaNombre = saleLine.mascota_nombre || '';
                                }
                                
                                line.setMascota(mascotaId, mascotaNombre);
                                console.log('[Mascotas] ✓ Mascota asignada desde presupuesto:', mascotaId, mascotaNombre);
                            } else if (saleLine.mascota_nombre) {
                                line.setMascota(null, saleLine.mascota_nombre);
                                console.log('[Mascotas] ✓ Mascota desde mascota_nombre:', saleLine.mascota_nombre);
                            } else {
                                console.log('[Mascotas] ✗ No hay mascota en línea de presupuesto');
                            }
                        }
                    }
                }
            }
        }
        
        console.log('[Mascotas] ========== FIN selectQuotation ==========');
        return result;
    }
});

// Nota: No parchear PosOrder.removeOrderline para evitar interferir con preparación de órdenes
