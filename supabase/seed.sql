-- Seed default categories and a test user profile
-- The test user is created by Supabase local auth; we just need to seed their data.
-- Default user ID from local Supabase: we'll use a trigger or insert after manual auth creation.

-- This function seeds defaults for any new user (triggered on profile creation).
create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Default categories
  insert into public.categories (user_id, name, icon, color) values
    (new.id, 'Food & Dining', 'utensils', '#ef4444'),
    (new.id, 'Groceries', 'shopping-cart', '#f97316'),
    (new.id, 'Transport', 'car', '#eab308'),
    (new.id, 'Fuel', 'fuel', '#84cc16'),
    (new.id, 'Bills & Utilities', 'zap', '#22c55e'),
    (new.id, 'Rent', 'home', '#14b8a6'),
    (new.id, 'Shopping', 'shopping-bag', '#06b6d4'),
    (new.id, 'Entertainment', 'film', '#3b82f6'),
    (new.id, 'Health', 'heart-pulse', '#8b5cf6'),
    (new.id, 'Education', 'graduation-cap', '#a855f7'),
    (new.id, 'Travel', 'plane', '#ec4899'),
    (new.id, 'Personal Care', 'sparkles', '#f43f5e'),
    (new.id, 'Gifts', 'gift', '#fb923c'),
    (new.id, 'Investments', 'trending-up', '#10b981'),
    (new.id, 'Misc', 'box', '#6b7280');

  -- Default payment methods
  insert into public.payment_methods (user_id, name, type) values
    (new.id, 'Cash', 'cash'),
    (new.id, 'UPI', 'upi'),
    (new.id, 'Credit Card - ICICI', 'credit_card'),
    (new.id, 'Credit Card - HDFC', 'credit_card'),
    (new.id, 'Credit Card - TATA NEU', 'credit_card'),
    (new.id, 'Credit Card - Kotak', 'credit_card'),
    (new.id, 'UPI - Rupay', 'upi'),
    (new.id, 'Debit Card - Kotak', 'debit_card'),
    (new.id, 'Debit Card - HDFC', 'debit_card'),
    (new.id, 'Debit Card - ICICI', 'debit_card');

  return new;
end;
$$;

-- Trigger: seed defaults when a profile is created
create trigger trg_seed_user_defaults
  after insert on public.profiles
  for each row execute function public.seed_user_defaults();

-- Also create a profile automatically when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
