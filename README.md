# Subbulakshmi Thanga Maligai — Jewellery & Gold Savings App

**Phase 5: gold savings on the real backend (schemes, enrollments, installments, UPI verification, in-store payments, gold rates, redemptions, audit), v0.4**
(Phase 4: Supabase backend for catalogue, accounts, wishlist, order requests and admin.)

> **Phase 5 at a glance:**
> - **Audit of the old demo:** [docs/PHASE5_AUDIT.md](docs/PHASE5_AUDIT.md)
> - **Final report** (files, SQL, policies, tests, what is live, what still needs the owner's approval): [docs/PHASE5_REPORT.md](docs/PHASE5_REPORT.md)
> - **Database update for an existing Phase 4 project:** run `supabase/PHASE5_UPDATE.sql` once in the SQL Editor.
> - **Scheme terms are NOT approved yet.** Both schemes show "DEMO / NOT APPROVED", and customers cannot enroll until an admin enters the owner-approved terms and records the approval.
> - **Tests run on 14 Oct 2026:**
>   - database: 71 + 103 pass;
>   - savings browser test: 52 / 52;
>   - Phase 4 browser test: 59 / 59;
>   - DEMO regression: 57 / 57;
>   - layout: 792 pages, 0 problems.
> - **Not yet tested against the live Supabase project.**

The app has two modes. They are chosen automatically by `js/config.js`.

| Mode | When | What is real |
|---|---|---|
| **DEMO** | `supabase.url` and `supabase.anonKey` are empty | Nothing. Fictional products and savings, exactly as Phase 2/3. |
| **Supabase** | Both values are filled in (**current setting:** project `fpbjclsdflbqisboiefa`) | Categories, products, photos, customer accounts, wishlists, order requests, admin catalogue and order management. |

In both modes, the **gold savings** screens still show fictional DEMO data, clearly labelled. **No payments** are taken: an order request is not a payment.

**Setup:** see **[SETUP.md](SETUP.md)** for Supabase configuration, migrations, auth, the admin role, storage, security tests, the production checklist, deployment and known limitations.

---

## 1. What Phase 4 added

**Customers (Supabase mode)**
- **Account:** register / log in / log out / forgot password with email and password through Supabase Auth.
  - Clear Tamil and English error messages.
  - Profile: name, phone, town, language.
- **Catalogue from the database:**
  - loading skeletons, empty states, and an error message with **Retry**;
  - search (debounced), category and collection filters, sort, "Load more".
  - **If the database fails, the app shows an error. It never shows demo products instead.**
- **Wishlist** saved to the account. A wishlist from before login is merged in.
- **Cart** stays on the device and is **re-checked against the database** before ordering (removed, out-of-stock or over-limit items are flagged and block the request).
- **Order request:**
  - the contact details are prefilled from the profile;
  - the database computes the prices and total;
  - the result is a unique order number `STM-YYYY-NNNNNN`, status *Requested*, payment *Not paid — payment at the store*;
  - a double tap or resubmission returns the same order (idempotency key).
- **My orders:** list, detail with item snapshot and status history, and cancel while still *Requested*.

**Admin (`admin.html`, Supabase mode)**
- **Access:**
  - Login is required.
  - The **database** decides admin/staff access. A customer account sees "access denied" and can read nothing extra.
- **Overview** with live counts.
- **Products:**
  - list including drafts, plus create and edit;
  - validated SKU, purity, weights (3 decimals), charges, price mode, stock, max per order and tags;
  - Publish / Unpublish;
  - photo upload (JPG/PNG/WebP, ≤ 5 MB, checked before upload and enforced by storage policies).
- **Categories:** create, edit, show/hide, order.
- **Orders:**
  - every customer's orders, with filters;
  - status changes limited to the allowed next steps;
  - a note for the history, and an internal note.
  - Every change is recorded in `order_events` and `audit_logs`.
- Savings, customers, gold rate and reports screens remain, marked **DEMO**.

**Backend (`supabase/`)**
- **4 non-destructive migrations:**
  - schema with constraints and indexes;
  - row-level security on every table;
  - order functions;
  - storage bucket and policies.
- **Seeds:** real category names; a separate **dev-only** demo product file.
- **Admin grant:** a SQL script for the dashboard. There is no API path to admin.
- **Security test suite:** 71 tests.

## 2. File structure

```
index.html, admin.html        The two apps (static, no build step)
css/                          tokens, base, layout, components, customer, admin
js/
  config.js                   Store details + Supabase PUBLIC url/key (never the secret key)
  vendor/supabase.js          Supabase JS client v2.117.3 (UMD build, MIT licence alongside)
  api.js                      Backend connection, key safety check, Catalog, Auth, Wishlist,
                              Orders, AdminApi, error mapping, loading/error helpers
  orders-views.js             Order status chips + order detail (shared by both apps)
  demo-data.js                DEMO products/categories, price display, cart storage
  utils.js, i18n.js, ui.js, router.js, savings-core.js, savings-views.js
  customer/                   shell, home, shop, product-detail, wishlist, cart, orders,
                              account, savings, whatsapp, app (start-up)
  admin/                      navigation, catalogue-live (Supabase screens), catalogue-admin,
                              savings-admin, admin (start-up)
supabase/
  migrations/                 Apply in filename order
  seed/01_categories.sql      Production-safe
  seed/dev_only_demo_products.sql   DEVELOPMENT ONLY
  admin/grant_admin_role.sql  Run in the SQL Editor to make the owner an admin
  tests/security_tests.sql    RLS / roles / orders / storage tests (rolls back)
tests/                        NOT for deployment
  db/                         PGlite runner + Supabase shim
  frontend/                   Playwright tests + test-only Supabase mock
```

## 3. Security model, in short

**Keys**
- The browser holds only the **public** anon/publishable key.
- `api.js` refuses to start if a `service_role` or `sb_secret_` key is configured.

**Row-level security**
- RLS is **enabled on every table**.
- All default grants are revoked, then only the minimum is granted back.
- No policy uses `using (true)` for writes.

**Admin role**
- Roles live in `user_roles`, which has **no write permission for app users at all**.
- An admin is created only by running `grant_admin_role.sql` in the dashboard.

**Orders**
- Orders can only be created through `create_order_request()`.
  - It reads product IDs and quantities only.
  - Prices come from the `products` table.
  - The items and prices are snapshotted into `order_items`.
- **Customers** cannot update orders directly. They can only cancel their own *Requested* order through a function.
- **Staff/admin** change status through a function that enforces the allowed transitions.

**Payment**
- `payment_status` has a CHECK constraint that allows only `'unpaid'`.

**Text from the database**
- All database text is HTML-escaped before display.

## 4. Test results (executed on 13 Oct 2026)

| Suite | How it ran | Result |
|---|---|---|
| **Database security** (`supabase/tests/security_tests.sql`) | Real PostgreSQL (PGlite 0.5.9) + Supabase auth/storage shim, all migrations + seeds, then every migration re-run | **71 / 71 pass** |
| Mutation check of that suite | Deliberately opened holes: public product write, self-grant admin, writable order status, trusting the client price | The suite **failed** each time, as it should |
| **Supabase-mode browser test** (`tests/frontend/live_mode_test.py`) | Headless Chromium + test-only mock client | **59 / 59 pass** |
| **DEMO-mode regression** (`tests/frontend/demo_mode_test.py`) | Headless Chromium | **57 / 57 pass** |
| **Layout** (`tests/frontend/layout_test.py`) | 6 widths (320–1280) × Tamil + English × DEMO + Supabase mode; checks overflow and stuck loading | **576 page loads, 0 problems** |
| Every `data-action` / `data-form` / `data-change` / `data-filter` has a handler | Both apps | Pass |
| Translation keys used exist in English **and** Tamil | 414 customer, 301 admin | Pass |
| JavaScript syntax | All 26 app files | Pass |

**What the Supabase-mode browser test covers**
- **Configuration:**
  - a secret key is refused;
  - an incomplete configuration shows an error.
- **Catalogue:**
  - only published products are shown;
  - search and the empty state work;
  - a database failure shows an error and Retry — **never demo products**.
- **Product pages:** direct links, and the unpublished or invalid-ID cases.
- **Account and profile:**
  - auth errors and validation;
  - the session persists across reloads;
  - logout ends the session, and private pages need login again;
  - login with email and password;
  - profile update.
- **Wishlist:** saved to the account, writing only the customer's own rows.
- **Cart and orders:**
  - the cart blocks unavailable items;
  - the order total comes from the database (2 × ₹4,500);
  - a duplicate submission returns the same order;
  - an out-of-stock product is refused;
  - order lists are isolated between customers;
  - a customer can cancel their own order.
- **Tamil** works in Supabase mode.
- **Admin:**
  - a customer is denied, and so is a logged-out visitor;
  - staff cannot edit the catalogue;
  - product validation, draft creation and publish;
  - image type and size limits, and the storage path;
  - categories;
  - order search by order number;
  - order status updates with history, and invalid transitions refused by the backend.
- No JavaScript errors.

**Fixed during this phase's testing**
- A load-order bug: categories were read before the catalogue existed.
- Missing shared translation strings in the admin app.
- Price sort stayed selected in categories with no prices.
- The visually hidden file input caused horizontal overflow.
- Product tag checkboxes took the text-input size.
- Order detail panels had no spacing.

**Not executed — please do these before launch**
- Against a **real Supabase project:**
  - run `security_tests.sql` with psql on a dev project (SETUP.md §8);
  - register, confirm email and reset the password with real emails;
  - upload a real photo.
- On **real Android phones:** Tamil rendering, the back button, login.
- **The mock client only approximates Supabase.** The database suite is the real security proof.

## 5. What is stored, and where

| Data | DEMO mode | Supabase mode |
|---|---|---|
| Language | localStorage | localStorage (+ profile) |
| Login session | — | localStorage (Supabase JS) |
| Wishlist | localStorage | Database (own rows only) |
| Cart | localStorage | localStorage, re-checked before an order |
| Profile, orders | — | Database |
| Savings (fictional) | sessionStorage | sessionStorage (still DEMO) |

No secret keys, passwords or real financial data are in the code.

## 6. Known limitations

See SETUP.md §11. In short:
- **Not run against a live Supabase project.** No credentials were provided.
- **Gold savings is still DEMO.** Phase 5 connects it.
- **No payment gateway.**
- **No phone OTP.**
- **No live gold rate.**
- **Order requests do not reserve stock.**
- **Store details are not configured yet:** WhatsApp, phone, address and hours are empty.

## 7. Store information still needed

Add these to `js/config.js` once the store confirms them. **Never guess them.**
- [ ] WhatsApp number (international format, e.g. `9198XXXXXXXX`)
- [ ] Store phone number
- [ ] Full address (Tamil and English) and opening hours
- [ ] Google Maps link (optional)

Also needed:
- [ ] A Supabase project URL and anon key.
- [ ] Real product photos and details.
- [ ] Making-charge and GST rules.
- [ ] The official savings scheme terms.

## 8. Run locally

- **DEMO mode:** open `index.html` directly (works from `file://`).
- **Supabase mode:** auth redirects need http(s). Serve the folder and add `http://localhost:8080/index.html` to the Supabase Redirect URLs.
  ```bash
  python3 -m http.server 8080
  ```
