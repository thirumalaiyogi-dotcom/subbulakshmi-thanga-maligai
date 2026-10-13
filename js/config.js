'use strict';
/* =========================================================
   STORE CONFIGURATION
   Fill these with REAL, verified details from Subbulakshmi Thanga Maligai.
   Empty values are treated as "not configured" and the app shows an honest
   placeholder instead of inventing anything. No secrets belong in this file.
   ========================================================= */
const STORE_CONFIG = {
  name: { en: 'Subbulakshmi Thanga Maligai', ta: 'சுப்புலட்சுமி தங்க மாளிகை' },
  town: { en: 'Puliyangudi, Tenkasi District, Tamil Nadu', ta: 'புளியங்குடி, தென்காசி மாவட்டம், தமிழ்நாடு' },

  /* WhatsApp number in international format, digits only, e.g. '9198XXXXXXXX'.
     Leave '' until the store provides it — enquiry buttons will then show a setup notice. */
  whatsappNumber: '',

  /* Phone number shown to customers, e.g. '+91 98XXX XXXXX'. */
  phone: '',

  /* Full street address and opening hours, in both languages. */
  address: { en: '', ta: '' },
  hours: { en: '', ta: '' },

  /* Optional Google Maps link. */
  mapUrl: '',

  /* ---------- Supabase (PUBLIC values only) ----------
     Supabase dashboard → Project Settings → API:
       url:     "Project URL", e.g. 'https://abcdxyz.supabase.co'
       anonKey: the "anon public" key (or the new "publishable" key, sb_publishable_…)
     NEVER put the service_role / secret key here — this file is downloaded by every visitor.
     The app refuses to start if a service_role or secret key is detected.
     Leave both empty to run the clearly-labelled DEMO catalogue instead. */
  supabase: {
    url: 'https://fpbjclsdflbqisboiefa.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwYmpjbHNkZmxicWlzYm9pZWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODUyNzIsImV4cCI6MjEwNzQ2MTI3Mn0.av2a-evm4GqY00LIXwoPJDW4B25gDb8QF0D-FQc43S0'
  }
};
