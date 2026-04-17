-- Rename legacy seed branch names (Bwera Central / Kyabugimbi) to current Masaka-area names.
-- Safe to run once on DBs that still have the old names; no-ops if already renamed.

UPDATE "Branch"
SET name = 'Bwera Nyendo', location = 'Nyendo, Masaka'
WHERE name = 'Bwera Central';

UPDATE "Branch"
SET name = 'Bwera Mukungwe', location = 'Mukungwe, Masaka'
WHERE name = 'Bwera Kyabugimbi';

-- Primary seeded supplier phone: ensure Fred Katalekwa (single milk supplier).
UPDATE "Supplier"
SET name = 'Fred Katalekwa', location = 'Masaka'
WHERE phone = '0701000001';

-- In-app notifications often embed branch names in message text.
UPDATE "Notification"
SET message = REPLACE(message, 'Bwera Central', 'Bwera Nyendo')
WHERE message LIKE '%Bwera Central%';

UPDATE "Notification"
SET message = REPLACE(message, 'Bwera Kyabugimbi', 'Bwera Mukungwe')
WHERE message LIKE '%Bwera Kyabugimbi%';
