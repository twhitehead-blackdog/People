-- =====================================================
-- Migración: Sistema de Auditoría de Tareas para Gerentes
-- Fecha: 2026-01-16
-- Descripción: Crea las tablas para el sistema de auditoría
-- que permite a administradores crear tareas programadas
-- que se asignan automáticamente a gerentes de sucursal.
-- =====================================================

-- =====================================================
-- TABLA 1: audit_tasks (Plantillas de tareas de auditoría)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información de la tarea
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'inventario', 'limpieza', 'seguridad', 'administrativo', 'capacitacion', 'otro'
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Configuración de recurrencia
    -- 'daily' = todos los días
    -- 'weekly' = días específicos de la semana
    -- 'monthly' = día específico del mes o semana/día del mes
    -- 'custom' = fechas específicas personalizadas
    recurrence_type VARCHAR(50) NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
    
    -- Configuración específica según tipo de recurrencia (JSONB)
    -- Ejemplos:
    -- monthly: {"day_of_month": 15} o {"week_of_month": 2, "day_of_week": 1}
    -- weekly: {"days": [1, 3, 5]} -- 0=domingo, 1=lunes, ..., 6=sábado
    -- daily: {} o null
    -- custom: {"dates": ["2026-01-15", "2026-02-20"]}
    recurrence_config JSONB DEFAULT '{}',
    
    -- Asignación
    -- 'all' = todos los gerentes de la empresa
    -- 'specific' = gerentes específicos por ID
    -- 'by_branch' = gerentes de sucursales específicas
    assignment_type VARCHAR(50) DEFAULT 'all' CHECK (assignment_type IN ('all', 'specific', 'by_branch')),
    assigned_branch_ids UUID[] DEFAULT '{}', -- Si es por sucursal
    assigned_manager_ids UUID[] DEFAULT '{}', -- Si es específico
    
    -- Configuración de tiempo
    due_days INT DEFAULT 1, -- Días para completar después de generarse
    reminder_days_before INT DEFAULT 1, -- Días antes para enviar recordatorio
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios descriptivos
COMMENT ON TABLE audit_tasks IS 'Plantillas de tareas de auditoría configurables por administradores';
COMMENT ON COLUMN audit_tasks.recurrence_type IS 'Tipo de recurrencia: daily, weekly, monthly, custom';
COMMENT ON COLUMN audit_tasks.recurrence_config IS 'Configuración JSON específica según el tipo de recurrencia';
COMMENT ON COLUMN audit_tasks.assignment_type IS 'Tipo de asignación: all (todos los gerentes), specific (IDs específicos), by_branch (por sucursal)';

-- =====================================================
-- TABLA 2: audit_task_instances (Instancias generadas)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_task_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_task_id UUID NOT NULL REFERENCES audit_tasks(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Asignación específica de esta instancia
    assigned_to UUID NOT NULL REFERENCES employees(id),
    branch_id UUID REFERENCES branches(id),
    
    -- Estado de la tarea
    -- 'pending' = pendiente de iniciar
    -- 'in_progress' = en progreso
    -- 'completed' = completada exitosamente
    -- 'not_applicable' = no aplica (con justificación)
    -- 'overdue' = vencida sin completar
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'not_applicable', 'overdue')),
    
    -- Fechas
    scheduled_date DATE NOT NULL, -- Fecha programada
    due_date DATE NOT NULL, -- Fecha límite
    
    -- Completado
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES employees(id),
    completion_notes TEXT, -- Notas o justificación de "no aplica"
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_task_instances IS 'Instancias generadas de tareas de auditoría asignadas a gerentes específicos';
COMMENT ON COLUMN audit_task_instances.status IS 'Estado: pending, in_progress, completed, not_applicable, overdue';

-- =====================================================
-- EXPANSIÓN DE TABLA reminders (si existe)
-- =====================================================
DO $$
BEGIN
    -- Agregar columna para vincular con instancias de auditoría
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'audit_task_instance_id') THEN
        ALTER TABLE reminders ADD COLUMN audit_task_instance_id UUID REFERENCES audit_task_instances(id) ON DELETE CASCADE;
    END IF;
    
    -- Agregar prioridad
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'priority') THEN
        ALTER TABLE reminders ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
    END IF;
    
    -- Agregar categoría
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'category') THEN
        ALTER TABLE reminders ADD COLUMN category VARCHAR(100);
    END IF;
    
    -- Agregar estado expandido
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reminders' AND column_name = 'status') THEN
        ALTER TABLE reminders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
END $$;

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_tasks_company ON audit_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_active ON audit_tasks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_audit_tasks_recurrence ON audit_tasks(recurrence_type);

CREATE INDEX IF NOT EXISTS idx_audit_task_instances_assigned ON audit_task_instances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_status ON audit_task_instances(status);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_scheduled ON audit_task_instances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_due ON audit_task_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_task ON audit_task_instances(audit_task_id);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_company ON audit_task_instances(company_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE audit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_task_instances ENABLE ROW LEVEL SECURITY;

-- Política para audit_tasks: usuarios autenticados pueden ver/editar tareas de su empresa
DROP POLICY IF EXISTS "audit_tasks_company_policy" ON audit_tasks;
CREATE POLICY "audit_tasks_company_policy" ON audit_tasks
    FOR ALL 
    TO authenticated
    USING (
        company_id IN (
            SELECT e.company_id 
            FROM employees e 
            INNER JOIN auth.users u ON e.user_id = u.id 
            WHERE u.id = auth.uid()
        )
    );

-- Política para audit_task_instances
DROP POLICY IF EXISTS "audit_task_instances_company_policy" ON audit_task_instances;
CREATE POLICY "audit_task_instances_company_policy" ON audit_task_instances
    FOR ALL 
    TO authenticated
    USING (
        company_id IN (
            SELECT e.company_id 
            FROM employees e 
            INNER JOIN auth.users u ON e.user_id = u.id 
            WHERE u.id = auth.uid()
        )
    );

-- =====================================================
-- FUNCIÓN: Calcular próxima ocurrencia de una tarea
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
    p_recurrence_type VARCHAR,
    p_recurrence_config JSONB,
    p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE AS $$
DECLARE
    v_next_date DATE;
    v_day_of_month INT;
    v_week_of_month INT;
    v_day_of_week INT;
    v_days INT[];
    v_dates DATE[];
    v_date DATE;
    v_current_day_of_week INT;
BEGIN
    CASE p_recurrence_type
        WHEN 'daily' THEN
            -- Próximo día es mañana
            v_next_date := p_from_date + INTERVAL '1 day';
            
        WHEN 'weekly' THEN
            -- Obtener días de la semana configurados
            SELECT ARRAY(SELECT jsonb_array_elements_text(p_recurrence_config->'days')::INT)
            INTO v_days;
            
            -- Si no hay días configurados, usar el día actual
            IF v_days IS NULL OR array_length(v_days, 1) IS NULL THEN
                v_next_date := p_from_date + INTERVAL '7 days';
            ELSE
                -- Encontrar el próximo día en la lista
                v_current_day_of_week := EXTRACT(DOW FROM p_from_date)::INT;
                v_next_date := NULL;
                
                -- Buscar en esta semana
                FOREACH v_day_of_week IN ARRAY v_days LOOP
                    IF v_day_of_week > v_current_day_of_week THEN
                        v_next_date := p_from_date + (v_day_of_week - v_current_day_of_week) * INTERVAL '1 day';
                        EXIT;
                    END IF;
                END LOOP;
                
                -- Si no encontramos en esta semana, ir a la próxima
                IF v_next_date IS NULL THEN
                    v_next_date := p_from_date + (7 - v_current_day_of_week + v_days[1]) * INTERVAL '1 day';
                END IF;
            END IF;
            
        WHEN 'monthly' THEN
            -- Día específico del mes
            v_day_of_month := (p_recurrence_config->>'day_of_month')::INT;
            
            IF v_day_of_month IS NOT NULL THEN
                -- Calcular próxima fecha con ese día del mes
                IF EXTRACT(DAY FROM p_from_date) < v_day_of_month THEN
                    v_next_date := DATE_TRUNC('month', p_from_date) + (v_day_of_month - 1) * INTERVAL '1 day';
                ELSE
                    v_next_date := DATE_TRUNC('month', p_from_date + INTERVAL '1 month') + (v_day_of_month - 1) * INTERVAL '1 day';
                END IF;
            ELSE
                -- Semana y día del mes (ej: segundo lunes)
                v_week_of_month := (p_recurrence_config->>'week_of_month')::INT;
                v_day_of_week := (p_recurrence_config->>'day_of_week')::INT;
                
                IF v_week_of_month IS NOT NULL AND v_day_of_week IS NOT NULL THEN
                    -- Calcular el n-ésimo día de la semana del próximo mes
                    v_next_date := DATE_TRUNC('month', p_from_date + INTERVAL '1 month');
                    -- Ajustar al día de la semana correcto
                    v_next_date := v_next_date + 
                        ((v_day_of_week - EXTRACT(DOW FROM v_next_date)::INT + 7) % 7) * INTERVAL '1 day' +
                        (v_week_of_month - 1) * INTERVAL '7 days';
                ELSE
                    -- Por defecto, primer día del próximo mes
                    v_next_date := DATE_TRUNC('month', p_from_date + INTERVAL '1 month');
                END IF;
            END IF;
            
        WHEN 'custom' THEN
            -- Fechas específicas personalizadas
            SELECT ARRAY(SELECT (jsonb_array_elements_text(p_recurrence_config->'dates'))::DATE)
            INTO v_dates;
            
            v_next_date := NULL;
            IF v_dates IS NOT NULL THEN
                FOREACH v_date IN ARRAY v_dates LOOP
                    IF v_date > p_from_date THEN
                        v_next_date := v_date;
                        EXIT;
                    END IF;
                END LOOP;
            END IF;
            
        ELSE
            v_next_date := NULL;
    END CASE;
    
    RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_next_occurrence IS 'Calcula la próxima fecha de ocurrencia para una tarea de auditoría según su configuración de recurrencia';

-- =====================================================
-- FUNCIÓN: Generar instancias de tareas de auditoría
-- =====================================================
CREATE OR REPLACE FUNCTION generate_audit_task_instances()
RETURNS TABLE(
    generated_count INT,
    task_ids UUID[]
) AS $$
DECLARE
    v_task RECORD;
    v_manager RECORD;
    v_scheduled_date DATE;
    v_due_date DATE;
    v_count INT := 0;
    v_task_ids UUID[] := '{}';
BEGIN
    -- Iterar sobre todas las tareas activas
    FOR v_task IN 
        SELECT * FROM audit_tasks 
        WHERE is_active = true
    LOOP
        -- Calcular la próxima fecha de ocurrencia
        v_scheduled_date := calculate_next_occurrence(
            v_task.recurrence_type, 
            v_task.recurrence_config,
            CURRENT_DATE
        );
        
        -- Si no hay próxima fecha (ej: custom sin fechas futuras), saltar
        IF v_scheduled_date IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Solo generar si la fecha está dentro de los próximos 7 días
        IF v_scheduled_date > CURRENT_DATE + INTERVAL '7 days' THEN
            CONTINUE;
        END IF;
        
        v_due_date := v_scheduled_date + v_task.due_days * INTERVAL '1 day';
        
        -- Generar instancias según el tipo de asignación
        IF v_task.assignment_type = 'all' THEN
            -- Todos los gerentes activos de la empresa con acceso al dashboard
            FOR v_manager IN 
                SELECT e.id as employee_id, e.branch_id
                FROM employees e
                INNER JOIN positions p ON e.position_id = p.id
                WHERE e.company_id = v_task.company_id
                  AND e.is_active = true
                  AND (p.admin = true OR p.dashboard_access = true)
            LOOP
                -- Verificar que no exista ya una instancia para este gerente y fecha
                IF NOT EXISTS (
                    SELECT 1 FROM audit_task_instances
                    WHERE audit_task_id = v_task.id 
                      AND assigned_to = v_manager.employee_id
                      AND scheduled_date = v_scheduled_date
                ) THEN
                    INSERT INTO audit_task_instances (
                        audit_task_id, company_id, assigned_to, branch_id,
                        scheduled_date, due_date, status
                    ) VALUES (
                        v_task.id, v_task.company_id, v_manager.employee_id, v_manager.branch_id,
                        v_scheduled_date, v_due_date, 'pending'
                    );
                    
                    v_count := v_count + 1;
                END IF;
            END LOOP;
            
        ELSIF v_task.assignment_type = 'specific' THEN
            -- Gerentes específicos por ID
            FOR v_manager IN 
                SELECT e.id as employee_id, e.branch_id
                FROM employees e
                WHERE e.id = ANY(v_task.assigned_manager_ids)
                  AND e.is_active = true
            LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM audit_task_instances
                    WHERE audit_task_id = v_task.id 
                      AND assigned_to = v_manager.employee_id
                      AND scheduled_date = v_scheduled_date
                ) THEN
                    INSERT INTO audit_task_instances (
                        audit_task_id, company_id, assigned_to, branch_id,
                        scheduled_date, due_date, status
                    ) VALUES (
                        v_task.id, v_task.company_id, v_manager.employee_id, v_manager.branch_id,
                        v_scheduled_date, v_due_date, 'pending'
                    );
                    
                    v_count := v_count + 1;
                END IF;
            END LOOP;
            
        ELSIF v_task.assignment_type = 'by_branch' THEN
            -- Gerentes de sucursales específicas
            FOR v_manager IN 
                SELECT e.id as employee_id, e.branch_id
                FROM employees e
                INNER JOIN positions p ON e.position_id = p.id
                WHERE e.branch_id = ANY(v_task.assigned_branch_ids)
                  AND e.is_active = true
                  AND (p.admin = true OR p.dashboard_access = true)
            LOOP
                IF NOT EXISTS (
                    SELECT 1 FROM audit_task_instances
                    WHERE audit_task_id = v_task.id 
                      AND assigned_to = v_manager.employee_id
                      AND scheduled_date = v_scheduled_date
                ) THEN
                    INSERT INTO audit_task_instances (
                        audit_task_id, company_id, assigned_to, branch_id,
                        scheduled_date, due_date, status
                    ) VALUES (
                        v_task.id, v_task.company_id, v_manager.employee_id, v_manager.branch_id,
                        v_scheduled_date, v_due_date, 'pending'
                    );
                    
                    v_count := v_count + 1;
                END IF;
            END LOOP;
        END IF;
        
        -- Agregar el id de la tarea procesada
        v_task_ids := array_append(v_task_ids, v_task.id);
    END LOOP;
    
    RETURN QUERY SELECT v_count, v_task_ids;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_audit_task_instances IS 'Genera instancias de tareas de auditoría para los próximos 7 días basándose en las tareas activas y sus configuraciones de recurrencia';

-- =====================================================
-- FUNCIÓN: Marcar tareas vencidas como overdue
-- =====================================================
CREATE OR REPLACE FUNCTION mark_overdue_audit_tasks()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE audit_task_instances
    SET status = 'overdue',
        updated_at = NOW()
    WHERE status IN ('pending', 'in_progress')
      AND due_date < CURRENT_DATE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_overdue_audit_tasks IS 'Marca como vencidas las instancias de tareas que pasaron su fecha límite sin completarse';

-- =====================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_tasks_updated_at ON audit_tasks;
CREATE TRIGGER audit_tasks_updated_at
    BEFORE UPDATE ON audit_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_updated_at();

DROP TRIGGER IF EXISTS audit_task_instances_updated_at ON audit_task_instances;
CREATE TRIGGER audit_task_instances_updated_at
    BEFORE UPDATE ON audit_task_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_updated_at();

-- =====================================================
-- DATOS DE EJEMPLO (Categorías predefinidas)
-- =====================================================
-- Estas son las categorías sugeridas para las tareas de auditoría:
-- 'inventario' - Conteo de inventario, revisión de stock
-- 'limpieza' - Limpieza profunda, sanitización
-- 'seguridad' - Revisión de equipos de seguridad, extintores
-- 'administrativo' - Reportes, cierre de caja, documentación
-- 'capacitacion' - Entrenamientos, evaluaciones de personal
-- 'mantenimiento' - Revisión de equipos, mantenimiento preventivo
-- 'calidad' - Auditorías de calidad, control de procesos
-- 'otro' - Otros no categorizados

-- =====================================================
-- VERIFICACIÓN DE MIGRACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Migración completada exitosamente';
    RAISE NOTICE 'Tablas creadas: audit_tasks, audit_task_instances';
    RAISE NOTICE 'Funciones creadas: calculate_next_occurrence, generate_audit_task_instances, mark_overdue_audit_tasks';
    RAISE NOTICE 'Para generar instancias de tareas, ejecutar: SELECT * FROM generate_audit_task_instances();';
    RAISE NOTICE 'Para marcar tareas vencidas, ejecutar: SELECT mark_overdue_audit_tasks();';
END $$;
