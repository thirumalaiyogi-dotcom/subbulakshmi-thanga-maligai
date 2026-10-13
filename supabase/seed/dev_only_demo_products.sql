-- =====================================================================
-- DEVELOPMENT / STAGING ONLY — fictional DEMO products.
-- NEVER run this on the production project. Every SKU starts with "DEMO-".
-- To remove later:  delete from public.products where sku like 'DEMO-%';
-- Requires 01_categories.sql first.
-- =====================================================================
insert into public.products
  (sku, category_id, name_en, name_ta, description_en, description_ta, purity, gross_weight_g, net_weight_g, stone_weight_g,
   price_mode, fixed_price, stock_status, stock_qty, max_order_qty, tags, is_published)
values
  ('DEMO-R001', 'rings', 'Lotus Motif Ring', 'தாமரை வடிவ மோதிரம்', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '22K', 4.200, 4.200, null, 'enquiry', null, 'in_stock', 1, 1, '{new,featured}', true),
  ('DEMO-R002', 'rings', 'Classic Stone Ring', 'கல் பதித்த மோதிரம்', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '22K', 5.100, 4.600, 0.500, 'enquiry', null, 'in_stock', 1, 1, '{popular}', true),
  ('DEMO-C001', 'chains', 'Rope Chain', 'கயிறு வடிவ சங்கிலி', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '22K', 12.000, 12.000, null, 'enquiry', null, 'in_stock', 1, 1, '{popular}', true),
  ('DEMO-N001', 'necklaces', 'Temple Necklace', 'கோயில் வடிவ நெக்லஸ்', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '22K', 32.500, 30.100, 2.400, 'enquiry', null, 'in_stock', 1, 1, '{bridal,featured}', true),
  ('DEMO-E001', 'earrings', 'Jhumka Earrings', 'ஜிமிக்கி கம்மல்', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '22K', 8.200, 7.600, 0.600, 'enquiry', null, 'in_stock', 1, 1, '{popular,featured}', true),
  ('DEMO-BR01', 'bridal', 'Bridal Necklace Set', 'மணப்பெண் நெக்லஸ் செட்', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '22K', 68.000, 62.500, 5.500, 'enquiry', null, 'made_to_order', 0, 1, '{bridal}', true),
  ('DEMO-BR02', 'bridal', 'Bridal Haram', 'மணப்பெண் ஆரம்', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '22K', 54.000, 50.000, 4.000, 'enquiry', null, 'out_of_stock', 0, 1, '{bridal}', true),
  ('DEMO-G001', 'coins', 'Gold Coin 1 g', 'தங்க நாணயம் 1 கிராம்', 'DEMO product for testing.', 'சோதனைக்கான டெமோ பொருள்.', '24K', 1.000, 1.000, null, 'enquiry', null, 'in_stock', 10, 5, '{popular}', true),
  ('DEMO-S001', 'silver', 'Silver Anklets', 'வெள்ளிக் கொலுசு', 'DEMO product with a test price.', 'சோதனை விலையுடன் டெமோ பொருள்.', '925', 42.000, 42.000, null, 'fixed', 4800.00, 'in_stock', 5, 3, '{popular}', true),
  ('DEMO-S003', 'silver', 'Silver Toe Rings', 'வெள்ளி மெட்டி', 'DEMO product with a test price.', 'சோதனை விலையுடன் டெமோ பொருள்.', '925', 6.000, 6.000, null, 'fixed', 650.00, 'in_stock', 12, 5, '{new,popular}', true),
  ('DEMO-X001', 'rings', 'Unpublished Draft Ring', 'வெளியிடப்படாத மோதிரம்', 'DEMO draft — not visible to customers.', 'டெமோ வரைவு — வாடிக்கையாளர்களுக்குத் தெரியாது.', '18K', 3.000, 3.000, null, 'enquiry', null, 'in_stock', 1, 1, '{}', false)
on conflict (sku) do nothing;
