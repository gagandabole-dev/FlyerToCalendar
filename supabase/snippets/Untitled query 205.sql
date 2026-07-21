-- 1. Create table with primary key and timestamp
CREATE TABLE IF NOT EXISTS intent_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    intent_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS) immediately
ALTER TABLE intent_signups ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow public anonymous web visitors to write (INSERT) their waitlist emails
CREATE POLICY "Allow public waitlist insertions" 
ON intent_signups 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- 4. Policy: Explicitly restrict public reading (SELECT) so emails remain private to service_role/dashboard
CREATE POLICY "Restrict public reading of emails" 
ON intent_signups 
FOR SELECT 
TO service_role 
USING (true);