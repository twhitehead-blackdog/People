-- ============================================
-- SISTEMA DE BUZÓN BIDIRECCIONAL
-- Tabla para mensajes de conversación del buzón de quejas
-- ============================================

-- Asegurar que la función update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Modificar la tabla complaints para agregar campos de control de anonimato
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS reveal_identity BOOLEAN DEFAULT false, -- El empleado puede revelar su identidad
ADD COLUMN IF NOT EXISTS thread_id UUID DEFAULT uuid_generate_v4(), -- ID único del hilo de conversación
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); -- Última actividad

-- Tabla: complaint_messages (Mensajes del buzón)
CREATE TABLE IF NOT EXISTS complaint_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sender_id UUID, -- NULL si es anónimo del empleado, UUID del empleado o RRHH
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('employee', 'hr')), -- Tipo de remitente
    is_anonymous BOOLEAN DEFAULT false, -- Si el empleado envía anónimo
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false, -- Si el mensaje ha sido leído
    read_at TIMESTAMP WITH TIME ZONE, -- Cuándo fue leído
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Validación: Si es empleado anónimo, sender_id debe ser NULL
    CHECK (
        (sender_type = 'employee' AND is_anonymous = true AND sender_id IS NULL) OR
        (sender_type = 'employee' AND is_anonymous = false AND sender_id IS NOT NULL) OR
        (sender_type = 'hr' AND sender_id IS NOT NULL)
    )
);

-- Actualizar complaint_id para mantener consistencia (si ya existe la columna thread_id, usar ese)
-- Si no existe, cada complaint tendrá su propio thread_id
ALTER TABLE complaint_messages
ADD COLUMN IF NOT EXISTS thread_id UUID;

-- Actualizar complaint_messages para que use thread_id de complaints
-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint_id ON complaint_messages(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_thread_id ON complaint_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_sender_id ON complaint_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_created_at ON complaint_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_is_read ON complaint_messages(is_read);

-- Índices adicionales para la tabla complaints
CREATE INDEX IF NOT EXISTS idx_complaints_thread_id ON complaints(thread_id);
CREATE INDEX IF NOT EXISTS idx_complaints_last_message_at ON complaints(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_reveal_identity ON complaints(reveal_identity);

-- Función para actualizar last_message_at en complaints cuando se inserta un mensaje
CREATE OR REPLACE FUNCTION update_complaint_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE complaints 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.complaint_id;
    
    -- También actualizar thread_id si no está seteado
    UPDATE complaint_messages
    SET thread_id = (SELECT thread_id FROM complaints WHERE id = NEW.complaint_id)
    WHERE id = NEW.id AND thread_id IS NULL;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar last_message_at automáticamente
CREATE TRIGGER update_complaint_last_message_trigger
    AFTER INSERT ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_complaint_last_message_at();

-- Trigger para actualizar updated_at
CREATE TRIGGER update_complaint_messages_updated_at
    BEFORE UPDATE ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar thread_id en complaint_messages basado en complaint_id
CREATE OR REPLACE FUNCTION sync_thread_id_to_messages()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar todos los mensajes relacionados con el nuevo thread_id
    UPDATE complaint_messages
    SET thread_id = NEW.thread_id
    WHERE complaint_id = NEW.id AND (thread_id IS NULL OR thread_id != NEW.thread_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para sincronizar thread_id cuando se actualiza complaints
CREATE TRIGGER sync_complaint_thread_id
    AFTER INSERT OR UPDATE OF thread_id ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION sync_thread_id_to_messages();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE complaint_messages ENABLE ROW LEVEL SECURITY;

-- Política: Los empleados pueden ver sus propios mensajes y los de RRHH en sus quejas
CREATE POLICY "Employees can view their own complaint messages" ON complaint_messages
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            -- Si es empleado, puede ver mensajes de sus quejas
            (sender_type = 'employee' AND sender_id = auth.uid()) OR
            -- O puede ver mensajes de RRHH en sus quejas si no son anónimos
            (sender_type = 'hr' AND EXISTS (
                SELECT 1 FROM complaints c 
                WHERE c.id = complaint_messages.complaint_id 
                AND (c.employee_id = auth.uid() OR c.reveal_identity = true)
            ))
        ) OR
        -- RRHH puede ver todos los mensajes
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM positions p
                WHERE p.id = e.position_id
                AND p.admin = true
            )
        )
    );

-- Política: Los empleados pueden insertar mensajes en sus propias quejas
CREATE POLICY "Employees can insert messages in their complaints" ON complaint_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            sender_type = 'employee' AND (
                -- Puede enviar anónimo o identificado en sus quejas
                EXISTS (
                    SELECT 1 FROM complaints c
                    WHERE c.id = complaint_id
                    AND (c.employee_id = auth.uid() OR (c.employee_id IS NULL AND is_anonymous = true))
                )
            ) OR
            -- RRHH puede insertar en cualquier queja
            EXISTS (
                SELECT 1 FROM employees e
                WHERE e.id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM positions p
                    WHERE p.id = e.position_id
                    AND p.admin = true
                )
            )
        )
    );

-- Política: RRHH puede actualizar (marcar como leído) cualquier mensaje
CREATE POLICY "HR can update messages" ON complaint_messages
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM positions p
                WHERE p.id = e.position_id
                AND p.admin = true
            )
        )
    );

-- Política: Los empleados pueden actualizar sus propios mensajes (marcar como leído)
CREATE POLICY "Employees can update their own messages" ON complaint_messages
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        sender_type = 'employee' AND
        EXISTS (
            SELECT 1 FROM complaints c
            WHERE c.id = complaint_id
            AND c.employee_id = auth.uid()
        )
    );

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE complaint_messages IS 'Mensajes bidireccionales del buzón de quejas';
COMMENT ON COLUMN complaint_messages.complaint_id IS 'ID de la queja original';
COMMENT ON COLUMN complaint_messages.sender_id IS 'ID del empleado o RRHH que envía (NULL si es anónimo)';
COMMENT ON COLUMN complaint_messages.sender_type IS 'Tipo de remitente: employee o hr';
COMMENT ON COLUMN complaint_messages.is_anonymous IS 'Si el empleado envía el mensaje de forma anónima';
COMMENT ON COLUMN complaint_messages.is_read IS 'Si el mensaje ha sido leído por el destinatario';
COMMENT ON COLUMN complaints.reveal_identity IS 'Si el empleado ha decidido revelar su identidad';
COMMENT ON COLUMN complaints.thread_id IS 'ID único del hilo de conversación';
COMMENT ON COLUMN complaints.last_message_at IS 'Fecha y hora del último mensaje en el hilo';

