-- Fix the handle_new_user trigger function to include required fields and handle errors
-- This ensures the trigger doesn't fail when creating profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with all required fields
  INSERT INTO public.profiles (id, email, full_name, avatar_url, base_role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user', -- Default base_role
    NOW(),  -- created_at
    NOW()   -- updated_at
  )
  ON CONFLICT (id) DO NOTHING; -- If profile already exists, do nothing
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


