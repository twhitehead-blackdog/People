-- WebAuthn credentials for fingerprint-based timeclock authentication
-- One credential per employee (upsert replaces previous registration)

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  credential_id    TEXT NOT NULL UNIQUE,
  public_key       TEXT NOT NULL,
  sign_count       INTEGER NOT NULL DEFAULT 0,
  device_name      TEXT DEFAULT 'Kensington VeriMark',
  registered_by    TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_employee_id
  ON webauthn_credentials(employee_id);
