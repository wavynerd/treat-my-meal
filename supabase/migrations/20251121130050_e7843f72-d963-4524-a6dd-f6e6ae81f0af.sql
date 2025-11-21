-- Fix function search path security issue
CREATE OR REPLACE FUNCTION generate_username_from_email(email_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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