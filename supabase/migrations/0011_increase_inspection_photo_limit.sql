-- Allow up to 30 photos per inspection.
create or replace function enforce_photo_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from inspection_photos where inspection_id = new.inspection_id) >= 30 then
    raise exception 'maximum 30 photos per inspection';
  end if;
  return new;
end $$;
