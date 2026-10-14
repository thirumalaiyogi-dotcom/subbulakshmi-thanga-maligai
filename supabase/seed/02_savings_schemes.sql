-- =====================================================================
-- The store's two scheme NAMES, created as DRAFT / NOT APPROVED.
-- No financial term is filled in: duration, amounts, payment window,
-- gold conversion and redemption timing stay EMPTY until an admin enters
-- the shop owner's officially approved terms in Admin → Savings schemes
-- and records the approval. Customers cannot enroll until then.
-- Safe to run more than once (existing rows are left untouched).
-- =====================================================================
insert into public.savings_schemes (id, name_en, name_ta, description_en, description_ta, sort_order) values
  ('dhanalakshmi', 'Dhanalakshmi Gold Savings Scheme', 'தனலட்சுமி தங்கச் சேமிப்புத் திட்டம்',
   'Scheme terms are awaiting the shop owner''s official approval.', 'திட்ட விதிமுறைகள் கடை உரிமையாளரின் அதிகாரப்பூர்வ ஒப்புதலுக்காகக் காத்திருக்கின்றன.', 10),
  ('kuber', 'Kuber Lakshmi Gold Savings Scheme', 'குபேர லட்சுமி தங்கச் சேமிப்புத் திட்டம்',
   'Scheme terms are awaiting the shop owner''s official approval.', 'திட்ட விதிமுறைகள் கடை உரிமையாளரின் அதிகாரப்பூர்வ ஒப்புதலுக்காகக் காத்திருக்கின்றன.', 20)
on conflict (id) do nothing;
