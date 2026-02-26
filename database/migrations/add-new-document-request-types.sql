-- ============================================
-- Migration: Add Metadata Column for New Document Request Types
-- ============================================
-- Adds support for:
-- - Marcación Errónea (timelog_correction)
-- - Solicitud de Uniforme (uniform_request)
--
-- Both types use the existing document_requests table with a new
-- metadata JSONB column for type-specific data.
-- ============================================

-- Add metadata column for type-specific data
ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add GIN index for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_document_requests_metadata ON document_requests USING GIN (metadata);

-- Add index on document_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_document_requests_document_type ON document_requests(document_type);

-- ============================================
-- Metadata Structure by Type:
-- ============================================
--
-- timelog_correction:
-- {
--   "timelog_date": "2025-01-15",
--   "timelog_type": "entry" | "lunch_start" | "lunch_end" | "exit",
--   "branch_id": "uuid",
--   "attachment_url": "https://..." (optional)
-- }
--
-- uniform_request:
-- {
--   "item_type": "Camisa manga corta",
--   "size": "M",
--   "quantity": 2,
--   "branch_id": "uuid"
-- }
--
-- ============================================

COMMENT ON COLUMN document_requests.metadata IS 'Type-specific data in JSON format. Structure varies by document_type (timelog_correction, uniform_request, etc.)';
