UPDATE drivers SET status = 'available' WHERE name LIKE '%Motor%';
SELECT id, name, status FROM drivers WHERE name LIKE '%Motor%';