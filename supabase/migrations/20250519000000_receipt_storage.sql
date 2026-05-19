-- Create private receipts bucket
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload receipts"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own receipts
create policy "Users can view own receipts"
on storage.objects for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own receipts
create policy "Users can delete own receipts"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
