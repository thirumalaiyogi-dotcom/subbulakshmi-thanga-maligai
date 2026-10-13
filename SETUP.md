# Phase 4 setup — Supabase backend

This guide connects the app to a real Supabase project. With an empty configuration the app runs in **DEMO mode** with fictional data, exactly as in Phase 2/3.

> **Current status (13 Oct 2026):** `js/config.js` holds the project URL `https://fpbjclsdflbqisboiefa.supabase.co` and its **anon** key (verified: the key's role is `anon`, not `service_role`). The app therefore starts in Supabase mode. **The migrations must still be applied in that project (step 3)**; until they are, the app shows "Could not reach the server / Something went wrong" with a Retry button. It never falls back to demo products.

> **No credentials are included.** No Supabase project was available while this phase was built. Everything below must be done by the store owner or developer. The code has **not yet been run against a real Supabase project**; see *Known limitations*.

---

## Quick summary in Tamil (சுருக்கம்)

1. supabase.com-ல் இரண்டு project உருவாக்குங்கள்: ஒன்று சோதனைக்கு (development), ஒன்று உண்மையான கடைக்கு (production).
2. `supabase/migrations/` கோப்புகளை வரிசைப்படி SQL Editor-ல் இயக்குங்கள் (படி 3).
3. `supabase/seed/01_categories.sql`-ஐ இயக்குங்கள். `dev_only_demo_products.sql` சோதனை project-ல் **மட்டும்**.
4. Project URL மற்றும் **anon / publishable key**-ஐ `js/config.js`-ல் வையுங்கள். **service_role / secret key-ஐ ஒருபோதும் வைக்காதீர்கள்.** வைத்தால் செயலி தானே நின்றுவிடும்.
5. Authentication அமைப்புகள் (படி 5): email + password, Site URL, Redirect URLs.
6. கடை உரிமையாளர் customer app-ல் கணக்கு உருவாக்கிய பின், `supabase/admin/grant_admin_role.sql`-ல் அவரது email-ஐ மாற்றி SQL Editor-ல் இயக்குங்கள். Admin உரிமை கொடுக்க வேறு வழி இல்லை. செயலியிலிருந்து யாரும் தன்னை admin ஆக்கிக்கொள்ள முடியாது.
7. சோதனை project-ல் `security_tests.sql`-ஐ இயக்கி எல்லாச் சோதனைகளும் `passed = true` என உறுதிசெய்யுங்கள் (படி 8).

---

## 1. Create the projects

Create **two** Supabase projects:

| Project | Purpose | Demo products? |
|---|---|---|
| `stm-dev` | Testing, security tests, trying changes | Yes (optional) |
| `stm-prod` | The real store | **Never** |

Choose a region near Tamil Nadu, e.g. Mumbai (`ap-south-1`). Store the database password in a password manager.

## 2. Configuration: what goes where

| Value | Where it lives | Public? |
|---|---|---|
| Project URL (`https://<ref>.supabase.co`) | `js/config.js` → `supabase.url` | Yes. Every visitor downloads it. |
| **anon** key (JWT) or **publishable** key (`sb_publishable_…`) | `js/config.js` → `supabase.anonKey` | Yes. It is designed to be public; RLS protects the data. |
| **service_role** key / **secret** key (`sb_secret_…`) | **Nowhere in this app.** Supabase dashboard only. | **No. Never.** |
| Database password | Your password manager, plus the CLI if you use it | No |
| SMTP password | Supabase dashboard → Auth → SMTP | No |

Where to find the keys: Supabase dashboard → **Project Settings → API Keys** (the menu name can vary slightly between dashboard versions).

**Safety check built into the app:** at start-up, `js/api.js` inspects the key. If it is a `service_role` JWT or an `sb_secret_…` key, the app **stops** and shows an error. It does not connect.

If the secret key was ever put in `config.js` and published, **rotate it** in the dashboard straight away.

Edit `js/config.js`:

```js
supabase: {
  url: 'https://abcdxyz.supabase.co',
  anonKey: 'eyJhbGciOi…'          // or 'sb_publishable_…'
}
```

- **Both empty:** the app stays in DEMO mode. (To show the fictional demo again, empty both values.)
- **Network:** each request gives up after 20 seconds (photo uploads 90 s), then shows an error with Retry. Silent automatic retries are switched off, so a weak connection doesn't leave customers on an endless spinner.
- **Only one filled, or an invalid URL:** the app shows a configuration error page. It does not fall back to demo data silently.

## 3. Apply the database migrations

Run them **in this order**. Every migration is non-destructive (`create … if not exists`, `create or replace`, `drop policy if exists` + `create policy`), and the test runner checks that each one can be run twice without errors.

```
supabase/migrations/20261013000100_core_schema.sql      tables, constraints, indexes, triggers, audit log
supabase/migrations/20261013000200_rls_policies.sql     grants + row-level security policies
supabase/migrations/20261013000300_order_functions.sql  order request / cancel / status functions
supabase/migrations/20261013000400_storage.sql          product-images bucket + storage policies
```

**Option A — SQL Editor (no tools needed).** Dashboard → SQL Editor → New query. Paste each file in order and click **Run**.

**Option B — Supabase CLI.**

```bash
npm i -g supabase            # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push             # applies supabase/migrations/* in filename order
```

**Then seed the categories in both projects:** run `supabase/seed/01_categories.sql`. It adds 9 real category names and no products.

**Development project only:** run `supabase/seed/dev_only_demo_products.sql`. It adds fictional `DEMO-…` products, mostly as drafts.

- **Never run it on production.**
- If it was run there by mistake:
  ```sql
  delete from public.products where sku like 'DEMO-%';
  ```

## 4. What the schema contains

| Table | Contents | Who can read | Who can write |
|---|---|---|---|
| `profiles` | Name, phone, town, language (1 row per user, created automatically at sign-up) | The owner; admin/staff | The owner, **only** `full_name`, `phone`, `town`, `preferred_language` |
| `user_roles` | `admin` / `staff` | The user sees their own roles; admin sees all | **Nobody through the API.** SQL Editor only (step 6). |
| `categories` | Slug id, EN/TA names, order, visible | Everyone: visible ones. Admin: all. | Admin |
| `products` | SKU, names, purity, weights `numeric(10,3)`, charges / prices `numeric(12,2)`, price mode, stock, tags, published | Everyone: published products in visible categories. Admin/staff: all. | Admin |
| `product_images` | Storage path, alt text, order | Same as the product | Admin |
| `wishlists` | (user, product) | The owner | The owner, published products only |
| `orders` | Order number `STM-YYYY-NNNNNN`, status, contact, totals, `payment_status = 'unpaid'` (a CHECK allows nothing else) | The owner; admin/staff | **Only** through the database functions below |
| `order_items` | **Snapshot** at order time: SKU, names, purity, weights, unit price, quantity, line total | The order's owner; admin/staff | Only through the functions |
| `order_events` | Status history: who, when, from → to, note | The order's owner; admin/staff | Only through the functions |
| `audit_logs` | Every insert/update/delete on products, categories, images, orders, roles (by trigger) | Admin | Triggers only |

### Order functions (`security definer`, fixed `search_path`)

**`create_order_request(items, idempotency_key, name, phone, note)`**
- **What the browser sends:** only the product IDs and quantities. Prices and totals are read from `products` inside the database.
- **Checks:**
  - The product is published and in a visible category.
  - It is in stock.
  - The quantity is within the product's limit and within stock.
  - No duplicate lines, 1–20 lines in total.
  - The phone number is valid.
  - At most 10 requests per hour per customer.
- **Idempotency:** the same idempotency key returns the same order (`unique(customer_id, idempotency_key)`), so a double tap creates only one order.
- **Result:** the order is created as `requested` / `unpaid`. Items with "enquiry" pricing are flagged, and the store sets their price.

**`cancel_my_order(order_id)`** — the customer can cancel their own order only while it is still `requested`.

**`admin_update_order_status(order_id, new_status, note)`** — admin/staff only. Allowed transitions:
- `requested` → `confirmed` / `rejected` / `cancelled`
- `confirmed` → `ready` / `cancelled`
- `ready` → `completed` / `cancelled`

Every change is written to `order_events`.

**`admin_set_order_note(order_id, note)`** — an internal note, admin/staff only.

**There is no function or policy that marks an order as paid.**

## 5. Authentication settings

**Recommended method: email + password** (implemented).

| Method | Verdict for this store |
|---|---|
| **Email + password** | **Recommended now.** Works on Supabase's free plan with no extra provider. Reset links come by email. Needs only an SMTP provider for production volume. |
| Phone OTP (SMS) | Most familiar to customers in Puliyangudi, but needs a paid SMS provider and Indian DLT registration (sender ID + template). Add later; not implemented. |
| Google sign-in | Easy for customers with Gmail, but needs a Google Cloud OAuth app. Possible later addition. |
| Magic link (email, no password) | Possible, but slower on phones (switching to the mail app). |

Dashboard → **Authentication**:

1. **Sign In / Providers → Email:** enabled. Leave the other providers off.
2. **Confirm email:**
   - **ON (recommended for production):** after registering, the app tells the customer to open the confirmation link that Supabase sends, then log in.
   - **OFF (fine for the dev project):** registration logs the customer in immediately.
3. **URL Configuration:**
   - **Site URL:** the address where the app is hosted, e.g. `https://stm-jewellery.netlify.app`.
   - **Redirect URLs:** add `https://<your-site>/index.html` and `https://<your-site>/` (and `http://localhost:8080/index.html` if you test locally).
   - Password reset and email confirmation links return to `index.html#/account`.
4. **Emails → SMTP:** Supabase's built-in email sender has a very low hourly limit and is meant for testing. For production, configure a real SMTP provider (Amazon SES, Resend, Zoho Mail, etc.) with the store's own domain.
5. **Email templates:** optionally translate the confirmation and reset emails into Tamil.
6. **Password minimum length:** the app requires 8 characters. Set the same or higher in Auth settings.

**Phone / OTP login is NOT implemented.** It needs:
- an SMS provider configured in Supabase (Twilio, MessageBird, Vonage, …);
- for Indian numbers, DLT registration of the sender ID and message template with TRAI.

The app does not pretend to send any OTP or SMS. The phone number in the profile is contact information only.

**Sessions:** Supabase JS stores the session in the browser's localStorage and refreshes it automatically. *Log out* ends it.

**On the device:** the cart stays in this browser's localStorage (it is re-checked against the database before an order request). A wishlist saved while logged out is merged into the account at login; after that the wishlist lives in the database.

## 6. Grant the admin role (only way)

1. The store owner registers in the customer app (Account → Register), or you add the user under Auth → Users → *Add user*.
2. Open `supabase/admin/grant_admin_role.sql`, replace `OWNER-EMAIL@example.com` with their email, and run it in the SQL Editor.
3. **Staff role** (can see and update orders, cannot edit the catalogue): use the commented `staff` line in the same file.
4. Open `admin.html` and log in.

**Why this is safe:**
- `user_roles` has **no** insert/update/delete permission for the `anon` or `authenticated` roles. It is not a policy that "hides" the table; the permission does not exist at all.
- Every admin check (`is_admin()`, `is_staff()`) runs inside the database.
- Editing localStorage, the HTML/JS, or a request body cannot change a role. The admin screens' hidden buttons are not the protection; RLS is.

## 7. Storage (product photos)

`20261013000400_storage.sql` creates the bucket **`product-images`**:

- **Read:** public. Product photos are shown to visitors, and the files contain no private data.
- **Upload / replace / delete:** admin only, and only under `products/<product-uuid>/…`, with file extension `.jpg`, `.jpeg`, `.png` or `.webp`.
- **Limits:** 5 MB, MIME types `image/jpeg`, `image/png`, `image/webp`, enforced by the bucket settings. The admin screen checks type and size before uploading as well.

Check it in the dashboard: Storage → `product-images` should show "Public" and a 5 MB limit.

## 8. Run the security tests

### On the development project (recommended before every release)

Run `supabase/tests/security_tests.sql` with **psql**:

```bash
psql "postgresql://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres" -f supabase/tests/security_tests.sql
```

(Connection string: dashboard → Connect.)

- **How it works:** the suite runs inside one transaction and ends with `ROLLBACK`. It temporarily creates test users, products and orders, then removes every trace.
- **What it prints:**
  - one row per test (`passed` t/f);
  - a summary line with the passed/failed counts. **Every test must pass.**
- **Use the development project, not production.**

> The SQL Editor may show only the result of the last statement (the rollback). Use psql to see all results.

### Offline, without any Supabase project

```bash
npm install          # installs @electric-sql/pglite (dev only)
npm run test:db      # = node tests/db/run-db-tests.mjs
```

This runs the real migrations and the same security suite on PostgreSQL compiled to WebAssembly (PGlite), with a small shim for Supabase's `auth` / `storage` schemas and default grants (`tests/db/supabase_shim.sql`). It also re-runs every migration to prove they are re-runnable.

### Browser tests (Playwright)

```bash
pip install playwright && python -m playwright install chromium
python tests/frontend/demo_mode_test.py     # DEMO mode regression
python tests/frontend/live_mode_test.py     # Supabase mode, using a test-only mock
python tests/frontend/layout_test.py        # no horizontal overflow, 6 widths × 2 languages × both modes
```

`tests/frontend/supabase-mock.js` is a **test-only** in-memory imitation of the Supabase client. The live-mode test injects it in place of `js/vendor/supabase.js` and injects a fake config.

- It is **never** loaded by the real app. Do not deploy the `tests/` folder.
- It only approximates RLS. The database suite is the real security proof.

## 9. Clean production checklist

- [ ] Production project created separately from the development project.
- [ ] The 4 migrations applied in order.
- [ ] `01_categories.sql` applied. Categories reviewed in admin → Categories.
- [ ] `dev_only_demo_products.sql` **not** applied. Check that it returns 0:
  ```sql
  select count(*) from products where sku like 'DEMO-%';
  ```
- [ ] Security tests passed on the dev project with the same migrations.
- [ ] `js/config.js` has the production URL and the **anon/publishable** key only.
- [ ] `js/config.js` store details (WhatsApp number, phone, address, hours) filled with **real, verified** values, or left empty. Never invented.
- [ ] Auth: email confirmation ON, Site URL and Redirect URLs set, custom SMTP configured.
- [ ] Admin role granted to the owner via `grant_admin_role.sql`. No other admins.
- [ ] Real products entered through admin → Products (draft → check → Publish), with real photos, weights, purity and charges.
- [ ] **Not imported:** fictional customers, payments or savings transactions. The Phase 1–3 savings data is fictional and stays in DEMO mode.
- [ ] Dashboard → Advisors → Security Advisor shows no critical warnings.
- [ ] `tests/`, `supabase/tests/`, `package.json` and `node_modules/` excluded from the deployed site (see step 10).

## 10. Deployment

The app is static files and has no build step.

**What to deploy:**
- `index.html`, `admin.html`, `css/`, `js/`.

**Do not deploy:**
- `tests/`, `supabase/` (SQL for the dashboard), `package.json`, `node_modules/`, `README.md`, `SETUP.md`.

**Hosting options:**

| Host | Steps |
|---|---|
| Netlify (recommended) | Add new site → Import from GitHub → `subbulakshmi-thanga-maligai`. No settings needed: `netlify.toml` copies only `index.html`, `admin.html`, `css/`, `js/` into `dist/` and publishes that, and adds security headers (CSP: scripts only from the site, data only to `*.supabase.co`; no framing; `noindex` on admin). Every push to `main` redeploys. |
| Cloudflare Pages / GitHub Pages / Vercel | Same: a static site, no build command. |

**After deploying:** put the final site address into Supabase Auth → URL Configuration (step 5).

**HTTPS is required:** Supabase auth will not work reliably from `http://` pages other than localhost.

`admin.html` can now be published, because it requires a login and a database role. A `noindex` meta tag keeps it out of search engines.

## 11. Known limitations (honest)

- **Not tested against a real Supabase project.** No credentials were provided.
  - **Executed and passing:**
    - the SQL on real PostgreSQL (PGlite), with a shim for Supabase's `auth` / `storage`;
    - the frontend against a hand-written mock client.
  - **Not executed:** Supabase's real Auth emails, Storage uploads, and the PostgREST/RPC behaviour against hosted Supabase. Run section 8 on a dev project first.
- **Gold savings is still DEMO.**
  - Schemes, enrollments, instalments, passbooks, redemptions, customers, gold rates and reports show fictional data, labelled DEMO.
  - No real savings records or payments are stored or migrated (Phase 5).
- **No payment gateway.** An order request is not a payment. Every order is `unpaid`, and payment happens at the store.
- **No phone OTP / SMS** (step 5).
- **No live gold rate.** In Supabase mode the app shows no gold-rate estimate. Products show the store's fixed price, or "contact the store for price".
- **Stock is not reserved by an order request.** Stock is checked when the request is created. The store adjusts stock manually when it confirms or completes an order.
- **Store details** (WhatsApp, phone, address, hours) are still empty in `config.js` until the store provides them.
- **Rate limit:** 10 order requests per customer per hour (simple database check). There is no CAPTCHA on registration; Supabase has its own auth rate limits.
- **Image files:**
  - Deleting a photo in admin removes its record, then tries to remove the file. If that second step fails (e.g. network drop), the file can remain in storage unused.
  - If a product is deleted directly in the database, its files remain in storage. Products are normally unpublished, not deleted.
