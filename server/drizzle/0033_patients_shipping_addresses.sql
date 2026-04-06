ALTER TABLE "patients"
ADD COLUMN IF NOT EXISTS "shipping_addresses" jsonb;

UPDATE "patients"
SET "shipping_addresses" = jsonb_build_array(
  jsonb_build_object(
    'id', md5(id::text || '-default-address'),
    'label', 'Home',
    'addressLine', COALESCE(address, ''),
    'contactNo', COALESCE(mobile, ''),
    'isDefault', true
  )
)
WHERE "shipping_addresses" IS NULL
  AND COALESCE(NULLIF(trim(address), ''), NULLIF(trim(mobile), '')) IS NOT NULL;
