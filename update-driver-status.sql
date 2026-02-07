UPDATE drivers SET status = 'available' WHERE username = 'Motor1';
SELECT id, username, status, vehicle_type FROM drivers WHERE username = 'Motor1';