-- ============================================
-- Migración: Notificaciones automáticas a RR.HH
-- ============================================
-- Este script crea funciones y triggers para notificar automáticamente
-- a los empleados de RR.HH cuando se crean solicitudes de documentos
-- o nuevas quejas/mensajes en el buzón de quejas

-- ============================================
-- Función para identificar empleados de RR.HH
-- ============================================
-- Busca empleados cuya posición contenga "RRHH", "Recursos Humanos", "HR", etc.
CREATE OR REPLACE FUNCTION get_hr_employee_ids()
RETURNS UUID[] AS $$
DECLARE
    v_hr_employee_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT e.id)
    INTO v_hr_employee_ids
    FROM employees e
    JOIN positions p ON e.position_id = p.id
    WHERE e.is_active = true
    AND (
        UPPER(p.name) LIKE '%RRHH%' OR
        UPPER(p.name) LIKE '%RECURSOS HUMANOS%' OR
        UPPER(p.name) LIKE '%HR%' OR
        UPPER(p.name) LIKE '%HUMAN RESOURCES%' OR
        UPPER(p.name) LIKE '%R.H.%' OR
        UPPER(p.name) LIKE '%R. H.%'
    );
    
    -- Si no se encuentra ningún empleado de RR.HH, retornar array vacío
    RETURN COALESCE(v_hr_employee_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Función helper para crear notificaciones a RR.HH
-- ============================================
CREATE OR REPLACE FUNCTION notify_hr_employees(
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_related_entity_type VARCHAR(50),
    p_related_entity_id UUID,
    p_branch_id UUID DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'medium'
)
RETURNS void AS $$
DECLARE
    v_hr_employee_id UUID;
    v_hr_employee_ids UUID[];
BEGIN
    -- Obtener IDs de empleados de RR.HH
    v_hr_employee_ids := get_hr_employee_ids();
    
    -- Si no hay empleados de RR.HH, salir
    IF array_length(v_hr_employee_ids, 1) IS NULL THEN
        RETURN;
    END IF;
    
    -- Crear notificación para cada empleado de RR.HH
    FOREACH v_hr_employee_id IN ARRAY v_hr_employee_ids
    LOOP
        INSERT INTO notifications (
            recipient_id,
            branch_id,
            type,
            title,
            message,
            related_entity_type,
            related_entity_id,
            priority
        ) VALUES (
            v_hr_employee_id,
            p_branch_id,
            p_type,
            p_title,
            p_message,
            p_related_entity_type,
            p_related_entity_id,
            p_priority
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger para notificar a RR.HH cuando se crea una solicitud de documento
-- ============================================
CREATE OR REPLACE FUNCTION create_document_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_employee_email TEXT;
    v_document_type TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Obtener información del empleado
    SELECT 
        e.first_name || ' ' || e.father_name,
        e.work_email,
        COALESCE(NEW.custom_document_type, NEW.document_type)
    INTO 
        v_employee_name,
        v_employee_email,
        v_document_type
    FROM employees e
    WHERE e.id = NEW.employee_id;
    
    -- Si no se encuentra información, salir
    IF v_employee_name IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Crear título y mensaje
    v_title := 'Nueva Solicitud de Documento';
    v_message := v_employee_name || ' (' || v_employee_email || ') ha solicitado un documento: ' || v_document_type;
    
    IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
        v_message := v_message || '. Motivo: ' || NEW.reason;
    END IF;
    
    -- Notificar a todos los empleados de RR.HH
    PERFORM notify_hr_employees(
        'document_request',
        v_title,
        v_message,
        'document_request',
        NEW.id,
        (SELECT branch_id FROM employees WHERE id = NEW.employee_id),
        'high'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_create_document_request_notification ON document_requests;
CREATE TRIGGER trigger_create_document_request_notification
    AFTER INSERT ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_document_request_notification();

-- ============================================
-- Trigger para notificar a RR.HH cuando se crea una nueva queja
-- ============================================
CREATE OR REPLACE FUNCTION create_complaint_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_employee_email TEXT;
    v_title TEXT;
    v_message TEXT;
    v_category_label TEXT;
BEGIN
    -- Obtener información del empleado si existe
    IF NEW.employee_id IS NOT NULL THEN
        SELECT 
            e.first_name || ' ' || e.father_name,
            e.work_email
        INTO 
            v_employee_name,
            v_employee_email
        FROM employees e
        WHERE e.id = NEW.employee_id;
    END IF;
    
    -- Determinar etiqueta de categoría
    CASE NEW.category
        WHEN 'work_environment' THEN v_category_label := 'Ambiente Laboral';
        WHEN 'harassment' THEN v_category_label := 'Acoso';
        WHEN 'safety' THEN v_category_label := 'Seguridad';
        WHEN 'management' THEN v_category_label := 'Gestión';
        WHEN 'benefits' THEN v_category_label := 'Beneficios';
        ELSE v_category_label := 'Otro';
    END CASE;
    
    -- Crear título y mensaje
    v_title := 'Nueva Queja en Buzón';
    IF v_employee_name IS NOT NULL THEN
        v_message := 'Nueva queja de ' || v_employee_name || ' (' || v_employee_email || ')';
    ELSE
        v_message := 'Nueva queja anónima';
    END IF;
    v_message := v_message || '. Categoría: ' || v_category_label;
    
    -- Notificar a todos los empleados de RR.HH
    PERFORM notify_hr_employees(
        'complaint',
        v_title,
        v_message,
        'complaint',
        NEW.id,
        (SELECT branch_id FROM employees WHERE id = NEW.employee_id),
        CASE 
            WHEN NEW.priority = 'urgent' THEN 'urgent'
            WHEN NEW.priority = 'high' THEN 'high'
            ELSE 'medium'
        END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_create_complaint_notification ON complaints;
CREATE TRIGGER trigger_create_complaint_notification
    AFTER INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION create_complaint_notification();

-- ============================================
-- Trigger para notificar a RR.HH cuando un empleado envía un mensaje en una queja
-- ============================================
CREATE OR REPLACE FUNCTION create_complaint_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_employee_email TEXT;
    v_title TEXT;
    v_message TEXT;
    v_complaint_category TEXT;
BEGIN
    -- Solo notificar si el mensaje es de un empleado (no de RR.HH)
    IF NEW.sender_type != 'employee' THEN
        RETURN NEW;
    END IF;
    
    -- Obtener información del empleado
    IF NEW.sender_id IS NOT NULL THEN
        SELECT 
            e.first_name || ' ' || e.father_name,
            e.work_email
        INTO 
            v_employee_name,
            v_employee_email
        FROM employees e
        WHERE e.id = NEW.sender_id;
    END IF;
    
    -- Obtener categoría de la queja
    SELECT category INTO v_complaint_category
    FROM complaints
    WHERE id = NEW.complaint_id;
    
    -- Crear título y mensaje
    v_title := 'Nuevo Mensaje en Buzón de Quejas';
    IF v_employee_name IS NOT NULL THEN
        v_message := v_employee_name || ' (' || v_employee_email || ') ha enviado un nuevo mensaje en una queja';
    ELSE
        v_message := 'Nuevo mensaje en una queja';
    END IF;
    
    -- Notificar a todos los empleados de RR.HH
    PERFORM notify_hr_employees(
        'complaint_message',
        v_title,
        v_message,
        'complaint_message',
        NEW.id,
        (SELECT branch_id FROM employees WHERE id = NEW.sender_id),
        'medium'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_create_complaint_message_notification ON complaint_messages;
CREATE TRIGGER trigger_create_complaint_message_notification
    AFTER INSERT ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION create_complaint_message_notification();

-- ============================================
-- Actualizar tipo de notificación en la tabla notifications
-- ============================================
-- Agregar nuevos tipos de notificación al CHECK constraint
-- Nota: PostgreSQL no permite modificar CHECK constraints directamente,
-- así que necesitamos eliminar y recrear

-- Eliminar constraint existente si existe
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recrear constraint con los nuevos tipos
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'timelog_entry', 
    'timelog_exit', 
    'timelog_lunch_start', 
    'timelog_lunch_end', 
    'delay', 
    'early_exit', 
    'lunch_exceeded', 
    'complaint', 
    'complaint_message', 
    'document_request', 
    'other'
));

