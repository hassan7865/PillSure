-- Deduplicate drug categories: keep canonical (full) names, merge truncated "..." rows from export drug_categories_202604030418.csv
--
-- Affected tables (per pair: bad_id -> good_id):
--   1) medicines.drug_category_id  -> UPDATE to good_id where pointing at bad_id
--   2) drug_category_specialization_mapping -> copy (good_id, specialization_id) from bad rows, then
--   3) drug_categories -> DELETE bad_id (ON DELETE CASCADE removes remaining mapping rows for bad_id)
--
-- Verified pairs (truncated name -> canonical name in same export):
--   15 -> 174  | Kidney Disease/Stone...              -> Kidney Disease/Stones
--   18 -> 128  | Atopic Dermatitis(Ec...              -> Atopic Dermatitis(Eczema)
--   21 -> 135  | Cholelithiasis/Gall ...              -> Cholelithiasis/Gall Stones
--   25 -> 95   | Intermittent Claudic...              -> Intermittent Claudication
--   33 -> 193  | Gastro Intestinal Mo...              -> Gastro Intestinal Motility
--   34 -> 103  | Bladder And Prostate...              -> Bladder And Prostate Conditions
--   47 -> 166  | Iron Supplement/Anae...              -> Iron Supplement/Anaemia
--   51 -> 196  | Impotence/Erectile D...              -> Impotence/Erectile Dysfunction
--   63 -> 167  | Neck/Shoulder Suppor...              -> Neck/Shoulder Support
--   71 -> 134  | Triturations (Homeo ...              -> Triturations (Homeopathic)
--   78 -> 158  | Idiopathic Pulmonary...              -> Idiopathic Pulmonary Fibrosis
--   82 -> 98   | Muscle Cramps/Spasti...              -> Muscle Cramps/Spasticity
--
-- (Executed inside Drizzle migrator transaction.)

-- 15 -> 174
UPDATE "medicines" SET "drug_category_id" = 174 WHERE "drug_category_id" = 15;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 174, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 15
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 15;

-- 18 -> 128
UPDATE "medicines" SET "drug_category_id" = 128 WHERE "drug_category_id" = 18;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 128, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 18
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 18;

-- 21 -> 135
UPDATE "medicines" SET "drug_category_id" = 135 WHERE "drug_category_id" = 21;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 135, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 21
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 21;

-- 25 -> 95
UPDATE "medicines" SET "drug_category_id" = 95 WHERE "drug_category_id" = 25;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 95, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 25
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 25;

-- 33 -> 193
UPDATE "medicines" SET "drug_category_id" = 193 WHERE "drug_category_id" = 33;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 193, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 33
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 33;

-- 34 -> 103
UPDATE "medicines" SET "drug_category_id" = 103 WHERE "drug_category_id" = 34;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 103, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 34
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 34;

-- 47 -> 166
UPDATE "medicines" SET "drug_category_id" = 166 WHERE "drug_category_id" = 47;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 166, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 47
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 47;

-- 51 -> 196
UPDATE "medicines" SET "drug_category_id" = 196 WHERE "drug_category_id" = 51;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 196, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 51
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 51;

-- 63 -> 167
UPDATE "medicines" SET "drug_category_id" = 167 WHERE "drug_category_id" = 63;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 167, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 63
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 63;

-- 71 -> 134
UPDATE "medicines" SET "drug_category_id" = 134 WHERE "drug_category_id" = 71;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 134, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 71
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 71;

-- 78 -> 158
UPDATE "medicines" SET "drug_category_id" = 158 WHERE "drug_category_id" = 78;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 158, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 78
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 78;

-- 82 -> 98
UPDATE "medicines" SET "drug_category_id" = 98 WHERE "drug_category_id" = 82;
INSERT INTO "drug_category_specialization_mapping" ("drug_category_id", "specialization_id")
SELECT 98, "specialization_id" FROM "drug_category_specialization_mapping" WHERE "drug_category_id" = 82
ON CONFLICT ("drug_category_id", "specialization_id") DO NOTHING;
DELETE FROM "drug_categories" WHERE "id" = 82;
