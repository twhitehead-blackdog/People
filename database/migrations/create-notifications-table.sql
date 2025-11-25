-- ============================================
-- Migración: Crear tabla de notificaciones
-- ============================================
-- Este script crea la tabla de notificaciones para alertar a los supervisores
-- cuando un empleado marca entrada/salida

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID, -- ID del empleado supervisor (o NULL para notificaciones generales)
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- Sucursal relacionada
    type VARCHAR(50) NOT NULL CHECK (type IN ('timelog_entry', 'timelog_exit', 'timelog_lunch_start', 'timelog_lunch_end', 'delay', 'early_exit', 'lunch_exceeded', 'complaint', 'other')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'timelog', 'complaint', etc.
    related_entity_id UUID, -- ID de la entidad relacionada (timelog, complaint, etc.)
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden ver sus propias notificaciones
-- y los administradores pueden ver todas
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (
    auth.role() = 'authenticated' AND (
        recipient_id IS NULL OR -- Notificaciones generales
        recipient_id IN (
            SELECT id FROM employees WHERE work_email = auth.jwt() ->> 'email'
        )
    )
);

-- Política: Permitir insertar notificaciones (solo desde triggers/funciones del sistema)
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Política: Los usuarios pueden marcar sus notificaciones como leídas
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (
    auth.role() = 'authenticated' AND (
        recipient_id IS NULL OR
        recipient_id IN (
            SELECT id FROM employees WHERE work_email = auth.jwt() ->> 'email'
        )
    )
);

-- ============================================
-- Función para crear notificaciones de marcaciones
-- ============================================
CREATE OR REPLACE FUNCTION create_timelog_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_branch_name TEXT;
    v_type_label TEXT;
    v_title TEXT;
    v_message TEXT;
    v_priority VARCHAR(20);
    v_supervisor_employee_id UUID;
    v_branch_work_email TEXT;
BEGIN
    -- Obtener información del empleado y sucursal
    SELECT 
        e.first_name || ' ' || e.father_name,
        b.name,
        b.work_email
    INTO 
        v_employee_name,
        v_branch_name,
        v_branch_work_email
    FROM employees e
    JOIN branches b ON e.branch_id = b.id
    WHERE e.id = NEW.employee_id AND b.id = NEW.branch_id;

    -- Si no se encuentra información, salir
    IF v_employee_name IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determinar el tipo de notificación y mensaje
    CASE NEW.type
        WHEN 'entry' THEN
            v_type_label := 'Entrada';
            v_title := 'Nueva Marcación de Entrada';
            v_message := v_employee_name || ' marcó entrada en ' || v_branch_name;
            v_priority := 'medium';
        WHEN 'exit' THEN
            v_type_label := 'Salida';
            v_title := 'Nueva Marcación de Salida';
            v_message := v_employee_name || ' marcó salida en ' || v_branch_name;
            v_priority := 'medium';
        WHEN 'lunch_start' THEN
            v_type_label := 'Inicio de Almuerzo';
            v_title := 'Inicio de Almuerzo';
            v_message := v_employee_name || ' inició su almuerzo en ' || v_branch_name;
            v_priority := 'low';
        WHEN 'lunch_end' THEN
            v_type_label := 'Fin de Almuerzo';
            v_title := 'Fin de Almuerzo';
            v_message := v_employee_name || ' regresó del almuerzo en ' || v_branch_name;
            v_priority := 'low';
        ELSE
            RETURN NEW;
    END CASE;

    -- Buscar supervisor de la sucursal (empleado con work_email igual al work_email de la sucursal)
    IF v_branch_work_email IS NOT NULL THEN
        SELECT id INTO v_supervisor_employee_id
        FROM employees
        WHERE work_email = v_branch_work_email
        AND is_active = true
        LIMIT 1;
    END IF;

    -- Crear notificación para el supervisor de la sucursal
    -- Si no hay supervisor específico, crear notificación general (recipient_id = NULL)
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
        v_supervisor_employee_id, -- NULL si no hay supervisor específico
        NEW.branch_id,
        'timelog_' || NEW.type,
        v_title,
        v_message,
        'timelog',
        NEW.id,
        v_priority
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta después de insertar un timelog
DROP TRIGGER IF EXISTS trigger_create_timelog_notification ON timelogs;
CREATE TRIGGER trigger_create_timelog_notification
    AFTER INSERT ON timelogs
    FOR EACH ROW
    EXECUTE FUNCTION create_timelog_notification();

