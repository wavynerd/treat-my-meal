-- Add profile customization fields
ALTER TABLE profiles 
ADD COLUMN bio TEXT,
ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN wallet_balance NUMERIC DEFAULT 0 NOT NULL;

-- Add index for username lookups
CREATE INDEX idx_profiles_username ON profiles(username);

-- Add check constraint for username format (lowercase alphanumeric and hyphens only)
ALTER TABLE profiles 
ADD CONSTRAINT username_format CHECK (username ~ '^[a-z0-9-]+$');

-- Function to generate unique username from email
CREATE OR REPLACE FUNCTION generate_username_from_email(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Extract username part from email and make it lowercase
  base_username := lower(split_part(email_address, '@', 1));
  -- Replace non-alphanumeric with hyphens
  base_username := regexp_replace(base_username, '[^a-z0-9]', '-', 'g');
  -- Remove consecutive hyphens
  base_username := regexp_replace(base_username, '-+', '-', 'g');
  -- Remove leading/trailing hyphens
  base_username := trim(both '-' from base_username);
  
  final_username := base_username;
  
  -- Check if username exists and add number if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '-' || counter;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- Update existing profiles with generated usernames
UPDATE profiles 
SET username = generate_username_from_email(email)
WHERE username IS NULL;

-- Make username NOT NULL after populating existing records
ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;