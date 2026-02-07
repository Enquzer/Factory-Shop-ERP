-- Create tables for dispatch management
CREATE TABLE IF NOT EXISTS order_dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    tracking_number TEXT UNIQUE NOT NULL,
    estimated_delivery_time TEXT,
    actual_delivery_time TEXT,
    transport_cost REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'assigned', -- assigned, picked_up, in_transit, delivered, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (order_id) REFERENCES ecommerce_orders (id),
    FOREIGN KEY (driver_id) REFERENCES drivers (id)
);

CREATE TABLE IF NOT EXISTS driver_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, cancelled
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    assigned_by TEXT,
    FOREIGN KEY (driver_id) REFERENCES drivers (id),
    FOREIGN KEY (order_id) REFERENCES ecommerce_orders (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_dispatches_order_id ON order_dispatches (order_id);
CREATE INDEX IF NOT EXISTS idx_order_dispatches_driver_id ON order_dispatches (driver_id);
CREATE INDEX IF NOT EXISTS idx_order_dispatches_tracking ON order_dispatches (tracking_number);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver_id ON driver_assignments (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_order_id ON driver_assignments (order_id);

-- Insert sample data for testing (optional)
-- INSERT INTO order_dispatches (order_id, driver_id, tracking_number, transport_cost, status, created_by)
-- VALUES (1, 1, 'TRK-123456-789', 150.00, 'assigned', 'admin');