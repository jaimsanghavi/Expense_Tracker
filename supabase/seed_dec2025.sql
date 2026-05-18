-- Dummy data for December 2025 dashboard demo
-- Run with: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < supabase/seed_dec2025.sql
-- Or via: npx supabase db reset (which runs seed.sql)

-- We need the user's UUID. In local dev the test user is the first user.
-- This script gets it dynamically.

do $$
declare
  uid uuid;
  cat_food uuid;
  cat_groceries uuid;
  cat_transport uuid;
  cat_fuel uuid;
  cat_bills uuid;
  cat_rent uuid;
  cat_shopping uuid;
  cat_entertainment uuid;
  cat_health uuid;
  cat_education uuid;
  cat_travel uuid;
  cat_personal uuid;
  cat_gifts uuid;
  cat_investments uuid;
  cat_misc uuid;
  pm_cash uuid;
  pm_upi uuid;
  pm_cc uuid;
  pm_dc uuid;
begin
  -- Get the first user
  select id into uid from auth.users limit 1;
  if uid is null then
    raise exception 'No user found. Please sign up first.';
  end if;

  -- Get category IDs
  select id into cat_food from public.categories where user_id = uid and name = 'Food & Dining';
  select id into cat_groceries from public.categories where user_id = uid and name = 'Groceries';
  select id into cat_transport from public.categories where user_id = uid and name = 'Transport';
  select id into cat_fuel from public.categories where user_id = uid and name = 'Fuel';
  select id into cat_bills from public.categories where user_id = uid and name = 'Bills & Utilities';
  select id into cat_rent from public.categories where user_id = uid and name = 'Rent';
  select id into cat_shopping from public.categories where user_id = uid and name = 'Shopping';
  select id into cat_entertainment from public.categories where user_id = uid and name = 'Entertainment';
  select id into cat_health from public.categories where user_id = uid and name = 'Health';
  select id into cat_education from public.categories where user_id = uid and name = 'Education';
  select id into cat_travel from public.categories where user_id = uid and name = 'Travel';
  select id into cat_personal from public.categories where user_id = uid and name = 'Personal Care';
  select id into cat_gifts from public.categories where user_id = uid and name = 'Gifts';
  select id into cat_investments from public.categories where user_id = uid and name = 'Investments';
  select id into cat_misc from public.categories where user_id = uid and name = 'Misc';

  -- Get payment method IDs
  select id into pm_cash from public.payment_methods where user_id = uid and name = 'Cash';
  select id into pm_upi from public.payment_methods where user_id = uid and name = 'UPI';
  select id into pm_cc from public.payment_methods where user_id = uid and name = 'Credit Card';
  select id into pm_dc from public.payment_methods where user_id = uid and name = 'Debit Card';

  -- Insert December 2025 expenses (amounts in paise)
  insert into public.expenses (user_id, amount_paise, spent_at, category_id, payment_method_id, merchant, note) values
    -- Dec 1
    (uid, 25000, '2025-12-01 08:30:00+05:30', cat_food, pm_upi, 'Starbucks', 'Morning coffee & sandwich'),
    (uid, 150000, '2025-12-01 13:00:00+05:30', cat_groceries, pm_dc, 'BigBasket', 'Weekly groceries'),
    -- Dec 2
    (uid, 12000, '2025-12-02 09:15:00+05:30', cat_transport, pm_upi, 'Uber', 'Office commute'),
    (uid, 35000, '2025-12-02 20:00:00+05:30', cat_food, pm_cc, 'Zomato', 'Dinner order'),
    -- Dec 3
    (uid, 2500000, '2025-12-03 10:00:00+05:30', cat_rent, pm_dc, NULL, 'December rent'),
    (uid, 85000, '2025-12-03 11:30:00+05:30', cat_bills, pm_upi, 'Jio', 'Mobile recharge'),
    -- Dec 4
    (uid, 45000, '2025-12-04 12:30:00+05:30', cat_food, pm_cash, 'Paradise Biryani', 'Lunch with team'),
    (uid, 200000, '2025-12-04 16:00:00+05:30', cat_fuel, pm_dc, 'HP Petrol Pump', 'Full tank diesel'),
    -- Dec 5
    (uid, 30000, '2025-12-05 07:00:00+05:30', cat_food, pm_upi, 'Chai Point', 'Breakfast'),
    (uid, 150000, '2025-12-05 19:00:00+05:30', cat_entertainment, pm_cc, 'PVR INOX', 'Movie tickets - Pushpa 2'),
    -- Dec 6
    (uid, 350000, '2025-12-06 11:00:00+05:30', cat_shopping, pm_cc, 'Myntra', 'Winter jacket'),
    (uid, 18000, '2025-12-06 13:00:00+05:30', cat_food, pm_upi, 'Subway', 'Quick lunch'),
    -- Dec 7
    (uid, 75000, '2025-12-07 09:00:00+05:30', cat_groceries, pm_upi, 'Zepto', 'Fruits & veggies'),
    (uid, 50000, '2025-12-07 18:00:00+05:30', cat_personal, pm_cash, 'Urban Company', 'Haircut'),
    -- Dec 8
    (uid, 120000, '2025-12-08 10:00:00+05:30', cat_health, pm_cc, 'Apollo Pharmacy', 'Monthly medicines'),
    (uid, 20000, '2025-12-08 20:30:00+05:30', cat_food, pm_upi, 'Swiggy', 'Late night snack'),
    -- Dec 9
    (uid, 15000, '2025-12-09 08:00:00+05:30', cat_transport, pm_upi, 'Metro', 'Office commute'),
    (uid, 250000, '2025-12-09 14:00:00+05:30', cat_education, pm_cc, 'Udemy', 'React course'),
    -- Dec 10
    (uid, 500000, '2025-12-10 10:00:00+05:30', cat_investments, pm_dc, 'Groww', 'SIP - December'),
    (uid, 40000, '2025-12-10 19:30:00+05:30', cat_food, pm_upi, 'Dominos', 'Pizza night'),
    -- Dec 11
    (uid, 175000, '2025-12-11 12:00:00+05:30', cat_bills, pm_upi, 'Tata Power', 'Electricity bill'),
    (uid, 80000, '2025-12-11 15:00:00+05:30', cat_shopping, pm_cc, 'Amazon', 'USB-C hub'),
    -- Dec 12
    (uid, 22000, '2025-12-12 08:30:00+05:30', cat_food, pm_cash, 'Local dhaba', 'Breakfast'),
    (uid, 60000, '2025-12-12 16:00:00+05:30', cat_entertainment, pm_upi, 'Spotify', 'Annual subscription'),
    -- Dec 13
    (uid, 90000, '2025-12-13 10:00:00+05:30', cat_groceries, pm_dc, 'DMart', 'Monthly stock-up'),
    (uid, 35000, '2025-12-13 20:00:00+05:30', cat_food, pm_upi, 'Box8', 'Dinner'),
    -- Dec 14
    (uid, 450000, '2025-12-14 11:00:00+05:30', cat_shopping, pm_cc, 'Flipkart', 'Wireless earbuds'),
    (uid, 25000, '2025-12-14 14:00:00+05:30', cat_transport, pm_upi, 'Rapido', 'Quick ride'),
    -- Dec 15
    (uid, 55000, '2025-12-15 09:00:00+05:30', cat_food, pm_upi, 'Breakfast Club', 'Sunday brunch'),
    (uid, 300000, '2025-12-15 15:00:00+05:30', cat_gifts, pm_cc, 'Amazon', 'Birthday gift for friend'),
    -- Dec 16
    (uid, 10000, '2025-12-16 08:00:00+05:30', cat_transport, pm_cash, 'Auto', 'Station to office'),
    (uid, 130000, '2025-12-16 13:00:00+05:30', cat_food, pm_cc, 'Barbeque Nation', 'Team lunch'),
    -- Dec 17
    (uid, 200000, '2025-12-17 10:00:00+05:30', cat_health, pm_dc, 'Max Hospital', 'Dental checkup'),
    (uid, 28000, '2025-12-17 19:00:00+05:30', cat_food, pm_upi, 'McDonalds', 'Evening snack'),
    -- Dec 18
    (uid, 95000, '2025-12-18 11:00:00+05:30', cat_bills, pm_upi, 'Airtel', 'Broadband bill'),
    (uid, 65000, '2025-12-18 17:00:00+05:30', cat_personal, pm_upi, 'Looks Salon', 'Grooming'),
    -- Dec 19
    (uid, 180000, '2025-12-19 09:00:00+05:30', cat_fuel, pm_dc, 'Indian Oil', 'Fuel refill'),
    (uid, 42000, '2025-12-19 20:00:00+05:30', cat_food, pm_upi, 'KFC', 'Friday dinner'),
    -- Dec 20
    (uid, 700000, '2025-12-20 10:00:00+05:30', cat_travel, pm_cc, 'MakeMyTrip', 'Train tickets - Christmas trip'),
    (uid, 55000, '2025-12-20 13:00:00+05:30', cat_groceries, pm_upi, 'Blinkit', 'Quick essentials'),
    -- Dec 21
    (uid, 48000, '2025-12-21 08:30:00+05:30', cat_food, pm_upi, 'Haldirams', 'Breakfast snacks'),
    (uid, 220000, '2025-12-21 16:00:00+05:30', cat_shopping, pm_cc, 'Lifestyle', 'Party wear'),
    -- Dec 22
    (uid, 35000, '2025-12-22 12:00:00+05:30', cat_food, pm_cash, 'Street food', 'Chaat & pani puri'),
    (uid, 150000, '2025-12-22 18:00:00+05:30', cat_entertainment, pm_cc, 'BookMyShow', 'Comedy show tickets'),
    -- Dec 23
    (uid, 100000, '2025-12-23 10:00:00+05:30', cat_groceries, pm_dc, 'BigBasket', 'Christmas baking supplies'),
    (uid, 75000, '2025-12-23 15:00:00+05:30', cat_gifts, pm_upi, 'Archies', 'Christmas gifts'),
    -- Dec 24
    (uid, 250000, '2025-12-24 19:00:00+05:30', cat_food, pm_cc, 'Olive Bar & Kitchen', 'Christmas Eve dinner'),
    (uid, 45000, '2025-12-24 21:00:00+05:30', cat_food, pm_upi, 'Baskin Robbins', 'Dessert'),
    -- Dec 25
    (uid, 500000, '2025-12-25 12:00:00+05:30', cat_gifts, pm_cc, 'Tanishq', 'Christmas gift - mom'),
    (uid, 85000, '2025-12-25 19:00:00+05:30', cat_food, pm_upi, 'ITC Masterchef', 'Christmas dinner'),
    -- Dec 26
    (uid, 350000, '2025-12-26 11:00:00+05:30', cat_shopping, pm_cc, 'Ajio', 'End of year sale'),
    (uid, 15000, '2025-12-26 14:00:00+05:30', cat_transport, pm_upi, 'Ola', 'Mall commute'),
    -- Dec 27
    (uid, 60000, '2025-12-27 09:00:00+05:30', cat_food, pm_upi, 'Third Wave Coffee', 'Coffee meetup'),
    (uid, 120000, '2025-12-27 16:00:00+05:30', cat_personal, pm_cc, 'Nykaa', 'Skincare products'),
    -- Dec 28
    (uid, 180000, '2025-12-28 10:00:00+05:30', cat_fuel, pm_dc, 'Shell', 'Full tank'),
    (uid, 38000, '2025-12-28 20:00:00+05:30', cat_food, pm_upi, 'EatFit', 'Healthy dinner'),
    -- Dec 29
    (uid, 500000, '2025-12-29 10:00:00+05:30', cat_investments, pm_dc, 'Zerodha', 'Extra SIP'),
    (uid, 70000, '2025-12-29 14:00:00+05:30', cat_entertainment, pm_upi, 'Netflix', 'Annual renewal'),
    -- Dec 30
    (uid, 95000, '2025-12-30 11:00:00+05:30', cat_groceries, pm_dc, 'Nature''s Basket', 'New Year party supplies'),
    (uid, 45000, '2025-12-30 19:00:00+05:30', cat_food, pm_upi, 'Behrouz Biryani', 'Dinner'),
    -- Dec 31
    (uid, 500000, '2025-12-31 18:00:00+05:30', cat_entertainment, pm_cc, 'The Park Hotel', 'NYE party tickets'),
    (uid, 200000, '2025-12-31 21:00:00+05:30', cat_food, pm_cc, 'The Park Hotel', 'NYE dinner & drinks'),
    (uid, 30000, '2025-12-31 23:30:00+05:30', cat_transport, pm_upi, 'Uber', 'Late night ride home');

  raise notice 'Successfully inserted 67 expenses for December 2025!';
end $$;
