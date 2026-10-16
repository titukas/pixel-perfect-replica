create policy "household members read chore photos" on storage.objects for select to authenticated
using (bucket_id = 'chore-photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy "members upload own chore photos" on storage.objects for insert to authenticated
with check (bucket_id = 'chore-photos' and owner = auth.uid() and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy "owner deletes chore photos" on storage.objects for delete to authenticated
using (bucket_id = 'chore-photos' and owner = auth.uid());