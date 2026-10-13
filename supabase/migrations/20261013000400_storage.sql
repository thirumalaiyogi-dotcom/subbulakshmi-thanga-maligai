-- =====================================================================
-- Phase 4 · Migration 4 — product image storage
-- Bucket "product-images": public READ by URL (catalogue photos are public),
-- 5 MB limit, JPEG/PNG/WebP only (enforced by Storage itself).
-- Upload, replace, delete and listing: admins only, under products/<product-uuid>/.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images: admin list" on storage.objects;
create policy "product images: admin list" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images: admin upload" on storage.objects;
create policy "product images: admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin()
              and (storage.foldername(name))[1] = 'products'
              and lower(name) ~ '\.(jpe?g|png|webp)$');

drop policy if exists "product images: admin update" on storage.objects;
create policy "product images: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin() and (storage.foldername(name))[1] = 'products');

drop policy if exists "product images: admin delete" on storage.objects;
create policy "product images: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
