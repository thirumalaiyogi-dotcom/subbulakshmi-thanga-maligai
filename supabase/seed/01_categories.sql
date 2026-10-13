-- Jewellery categories (structure only — safe for production).
-- Re-running is safe: existing rows are left unchanged.
insert into public.categories (id, name_en, name_ta, sort_order, is_visible) values
  ('rings',     'Gold Rings',       'தங்க மோதிரங்கள்',   10, true),
  ('chains',    'Gold Chains',      'தங்கச் சங்கிலிகள்',  20, true),
  ('necklaces', 'Necklaces',        'நெக்லஸ்கள்',         30, true),
  ('bangles',   'Bangles',          'வளையல்கள்',          40, true),
  ('earrings',  'Earrings',         'கம்மல்கள்',           50, true),
  ('bridal',    'Bridal Jewellery', 'மணப்பெண் நகைகள்',    60, true),
  ('thali',     'Thali Chains',     'தாலிக் கொடிகள்',     70, true),
  ('coins',     'Gold Coins',       'தங்க நாணயங்கள்',     80, true),
  ('silver',    'Silver Jewellery', 'வெள்ளி நகைகள்',      90, true)
on conflict (id) do nothing;
