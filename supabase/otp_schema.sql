-- OTP codes for email login (run in Supabase SQL editor if not using migrations)
CREATE TABLE IF NOT EXISTS auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_email ON auth_otps(email);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires_at ON auth_otps(expires_at);

-- Optional: delete expired OTPs periodically (or do it in app before verify)
-- DELETE FROM auth_otps WHERE expires_at < NOW();
