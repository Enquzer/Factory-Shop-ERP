"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDriversTables = initializeDriversTables;
exports.createDriver = createDriver;
exports.getDriverById = getDriverById;
exports.getAllDrivers = getAllDrivers;
exports.updateDriver = updateDriver;
exports.deleteDriver = deleteDriver;
exports.assignOrderToDriver = assignOrderToDriver;
exports.getDriverAssignmentById = getDriverAssignmentById;
exports.getDriverAssignments = getDriverAssignments;
exports.updateAssignmentStatus = updateAssignmentStatus;
exports.getAvailableDrivers = getAvailableDrivers;
var db_1 = require("./db");
var notifications_driver_1 = require("./notifications-driver");
// Initialize drivers tables
function initializeDriversTables() {
    return __awaiter(this, void 0, void 0, function () {
        var db, driverCols, driverColNames, assignCols, assignColNames, requiredAssignCols, _i, requiredAssignCols_1, col, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 22, , 23]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    // Create drivers table
                    return [4 /*yield*/, db.exec("\n      CREATE TABLE IF NOT EXISTS drivers (\n        id TEXT PRIMARY KEY,\n        userId TEXT UNIQUE, -- Links to users table\n        employeeId TEXT UNIQUE, -- Links to employees table\n        name TEXT NOT NULL,\n        phone TEXT NOT NULL UNIQUE,\n        licensePlate TEXT NOT NULL UNIQUE,\n        vehicleType TEXT NOT NULL CHECK(vehicleType IN ('motorbike', 'car', 'van', 'truck')),\n        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'busy', 'offline')),\n        currentLat REAL,\n        currentLng REAL,\n        locationLastUpdated DATETIME,\n        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL\n      )\n    ")];
                case 2:
                    // Create drivers table
                    _a.sent();
                    return [4 /*yield*/, db.all("PRAGMA table_info(drivers)")];
                case 3:
                    driverCols = _a.sent();
                    driverColNames = driverCols.map(function (c) { return c.name; });
                    if (!!driverColNames.includes('updatedAt')) return [3 /*break*/, 5];
                    return [4 /*yield*/, db.exec("ALTER TABLE drivers ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP")];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    if (!!driverColNames.includes('currentLat')) return [3 /*break*/, 7];
                    return [4 /*yield*/, db.exec("ALTER TABLE drivers ADD COLUMN currentLat REAL")];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    if (!!driverColNames.includes('currentLng')) return [3 /*break*/, 9];
                    return [4 /*yield*/, db.exec("ALTER TABLE drivers ADD COLUMN currentLng REAL")];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9:
                    if (!!driverColNames.includes('locationLastUpdated')) return [3 /*break*/, 11];
                    return [4 /*yield*/, db.exec("ALTER TABLE drivers ADD COLUMN locationLastUpdated DATETIME")];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11: 
                // Create driver_assignments table
                return [4 /*yield*/, db.exec("\n      CREATE TABLE IF NOT EXISTS driver_assignments (\n        id TEXT PRIMARY KEY,\n        driverId TEXT NOT NULL,\n        orderId TEXT NOT NULL,\n        assignedBy TEXT NOT NULL,\n        assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n        status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),\n        pickupLat REAL,\n        pickupLng REAL,\n        pickupName TEXT,\n        deliveryLat REAL,\n        deliveryLng REAL,\n        deliveryName TEXT,\n        estimatedDeliveryTime DATETIME,\n        actualPickupTime DATETIME,\n        actualDeliveryTime DATETIME,\n        notificationSent BOOLEAN DEFAULT FALSE,\n        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE,\n        FOREIGN KEY (orderId) REFERENCES ecommerce_orders(id) ON DELETE CASCADE\n      )\n    ")];
                case 12:
                    // Create driver_assignments table
                    _a.sent();
                    return [4 /*yield*/, db.all("PRAGMA table_info(driver_assignments)")];
                case 13:
                    assignCols = _a.sent();
                    assignColNames = assignCols.map(function (c) { return c.name; });
                    requiredAssignCols = [
                        { name: 'driverId', type: 'TEXT' },
                        { name: 'orderId', type: 'TEXT' },
                        { name: 'assignedBy', type: 'TEXT' },
                        { name: 'assignedAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
                        { name: 'pickupLat', type: 'REAL' },
                        { name: 'pickupLng', type: 'REAL' },
                        { name: 'pickupName', type: 'TEXT' },
                        { name: 'deliveryLat', type: 'REAL' },
                        { name: 'deliveryLng', type: 'REAL' },
                        { name: 'deliveryName', type: 'TEXT' },
                        { name: 'updatedAt', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
                    ];
                    _i = 0, requiredAssignCols_1 = requiredAssignCols;
                    _a.label = 14;
                case 14:
                    if (!(_i < requiredAssignCols_1.length)) return [3 /*break*/, 17];
                    col = requiredAssignCols_1[_i];
                    if (!!assignColNames.includes(col.name)) return [3 /*break*/, 16];
                    return [4 /*yield*/, db.exec("ALTER TABLE driver_assignments ADD COLUMN ".concat(col.name, " ").concat(col.type))];
                case 15:
                    _a.sent();
                    _a.label = 16;
                case 16:
                    _i++;
                    return [3 /*break*/, 14];
                case 17: 
                // Create indexes for better performance
                return [4 /*yield*/, db.exec("CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status)")];
                case 18:
                    // Create indexes for better performance
                    _a.sent();
                    return [4 /*yield*/, db.exec("CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driverId)")];
                case 19:
                    _a.sent();
                    return [4 /*yield*/, db.exec("CREATE INDEX IF NOT EXISTS idx_driver_assignments_order ON driver_assignments(orderId)")];
                case 20:
                    _a.sent();
                    return [4 /*yield*/, db.exec("CREATE INDEX IF NOT EXISTS idx_driver_assignments_status ON driver_assignments(status)")];
                case 21:
                    _a.sent();
                    console.log('Drivers tables initialized successfully');
                    return [3 /*break*/, 23];
                case 22:
                    error_1 = _a.sent();
                    console.error('Error initializing drivers tables:', error_1);
                    throw error_1;
                case 23: return [2 /*return*/];
            }
        });
    });
}
// Driver CRUD Operations
function createDriver(driverData) {
    return __awaiter(this, void 0, void 0, function () {
        var db, maxIdResult, id, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.get('SELECT MAX(id) as maxId FROM drivers')];
                case 2:
                    maxIdResult = _a.sent();
                    id = (maxIdResult === null || maxIdResult === void 0 ? void 0 : maxIdResult.maxId) ? maxIdResult.maxId + 1 : Math.floor(Date.now() / 1000);
                    return [4 /*yield*/, db.run("\n      INSERT INTO drivers (id, userId, employeeId, name, phone, contact, licensePlate, vehicleType, status)\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\n    ", [
                            id,
                            driverData.userId,
                            driverData.employeeId,
                            driverData.name,
                            driverData.phone,
                            driverData.phone, // Use phone for contact as well
                            driverData.licensePlate,
                            driverData.vehicleType,
                            driverData.status
                        ])];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, getDriverById(id.toString())];
                case 4: return [2 /*return*/, _a.sent()];
                case 5:
                    error_2 = _a.sent();
                    console.error('Error creating driver:', error_2);
                    throw error_2;
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getDriverById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var db, driver, emp, assignments, assignedOrders, currentLocation, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.get("\n      SELECT d.*, e.jobCenter, e.profilePicture, dept.name as departmentName, u.username\n      FROM drivers d\n      LEFT JOIN employees e ON d.employeeId = e.employeeId\n      LEFT JOIN departments dept ON e.departmentId = dept.id\n      LEFT JOIN users u ON d.userId = u.id\n      WHERE d.id = ? OR d.userId = ? OR d.employeeId = ? OR u.username = ?\n    ", [id, id, id, id])];
                case 2:
                    driver = _a.sent();
                    if (!!driver) return [3 /*break*/, 4];
                    return [4 /*yield*/, db.get("\n        SELECT e.*, dept.name as departmentName\n        FROM employees e\n        JOIN departments dept ON e.departmentId = dept.id\n        WHERE e.employeeId = ? AND dept.name = 'Drivers'\n      ", [id])];
                case 3:
                    emp = _a.sent();
                    if (emp) {
                        driver = {
                            id: emp.employeeId,
                            employeeId: emp.employeeId,
                            name: emp.name,
                            phone: emp.phone,
                            status: 'available',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            departmentName: emp.departmentName,
                            profilePicture: emp.profilePicture,
                            jobCenter: 'Driver'
                        };
                    }
                    _a.label = 4;
                case 4:
                    if (!driver) {
                        throw new Error('Driver not found');
                    }
                    return [4 /*yield*/, db.all("\n      SELECT orderId FROM driver_assignments \n      WHERE driverId = ? AND status != 'delivered' AND status != 'cancelled'\n    ", [driver.id || driver.employeeId])];
                case 5:
                    assignments = _a.sent();
                    assignedOrders = assignments.map(function (a) { return a.orderId; });
                    currentLocation = undefined;
                    if (driver.currentLat && driver.currentLng && driver.locationLastUpdated) {
                        currentLocation = {
                            lat: driver.currentLat,
                            lng: driver.currentLng,
                            lastUpdated: new Date(driver.locationLastUpdated)
                        };
                    }
                    return [2 /*return*/, {
                            id: driver.id || driver.employeeId,
                            userId: driver.userId,
                            employeeId: driver.employeeId,
                            name: driver.name,
                            phone: driver.phone,
                            licensePlate: driver.licensePlate || driver.license_plate || 'N/A',
                            vehicleType: driver.vehicleType || 'car',
                            status: driver.status || 'available',
                            currentLocation: currentLocation,
                            assignedOrders: assignedOrders,
                            createdAt: driver.createdAt ? new Date(driver.createdAt) : new Date(),
                            updatedAt: driver.updatedAt ? new Date(driver.updatedAt) : new Date(),
                            jobCenter: driver.jobCenter || 'Driver',
                            departmentName: driver.departmentName,
                            profilePicture: driver.profilePicture
                        }];
                case 6:
                    error_3 = _a.sent();
                    console.error('Error fetching driver:', error_3);
                    throw error_3;
                case 7: return [2 /*return*/];
            }
        });
    });
}
function getAllDrivers() {
    return __awaiter(this, void 0, void 0, function () {
        var db_2, drivers, error_4;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db_2 = _a.sent();
                    // Fetch all employees in the 'Drivers' department and link with existing driver records
                    console.log('[LIB] getAllDrivers: Starting query...');
                    return [4 /*yield*/, db_2.all("\n      SELECT \n        e.employeeId, \n        e.name, \n        e.phone, \n        e.profilePicture,\n        d.id as driverId,\n        d.userId,\n        u.username,\n        d.licensePlate,\n        d.vehicleType,\n        d.status,\n        d.currentLat,\n        d.currentLng,\n        d.locationLastUpdated,\n        dept.name as departmentName\n      FROM employees e\n      INNER JOIN departments dept ON e.departmentId = dept.id\n      LEFT JOIN drivers d ON e.employeeId = d.employeeId\n      LEFT JOIN users u ON d.userId = u.id\n      WHERE dept.name = 'Drivers' OR dept.id = 11\n      ORDER BY e.name\n    ")];
                case 2:
                    drivers = _a.sent();
                    console.log("[LIB] getAllDrivers: Query returned ".concat(drivers.length, " raw records"));
                    console.log('[LIB] getAllDrivers: Raw driver data:', JSON.stringify(drivers, null, 2));
                    return [4 /*yield*/, Promise.all(drivers.map(function (driver) { return __awaiter(_this, void 0, void 0, function () {
                            var actualDriverId, assignedOrdersCount, assignments, assignmentError_1, currentLocation;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        actualDriverId = driver.employeeId;
                                        assignedOrdersCount = 0;
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, db_2.all("\n          SELECT COUNT(*) as count FROM driver_assignments \n          WHERE driverId = ? AND status != 'delivered' AND status != 'cancelled'\n        ", [actualDriverId])];
                                    case 2:
                                        assignments = _c.sent();
                                        assignedOrdersCount = ((_a = assignments[0]) === null || _a === void 0 ? void 0 : _a.count) || 0;
                                        return [3 /*break*/, 4];
                                    case 3:
                                        assignmentError_1 = _c.sent();
                                        console.warn("[LIB] Could not fetch assignments for driver ".concat(actualDriverId, ":"), assignmentError_1);
                                        return [3 /*break*/, 4];
                                    case 4:
                                        currentLocation = undefined;
                                        if (driver.currentLat && driver.currentLng && driver.locationLastUpdated) {
                                            currentLocation = {
                                                lat: driver.currentLat,
                                                lng: driver.currentLng,
                                                lastUpdated: new Date(driver.locationLastUpdated)
                                            };
                                        }
                                        return [2 /*return*/, {
                                                id: actualDriverId.toString(),
                                                userId: (_b = driver.userId) === null || _b === void 0 ? void 0 : _b.toString(),
                                                username: driver.username || '',
                                                employeeId: driver.employeeId,
                                                name: driver.name || 'Unknown Driver',
                                                phone: driver.phone || '',
                                                licensePlate: driver.licensePlate || 'N/A',
                                                vehicleType: driver.vehicleType || 'car',
                                                status: driver.status || 'available',
                                                currentLocation: currentLocation,
                                                assignedOrders: Array(assignedOrdersCount).fill(''),
                                                createdAt: driver.createdAt ? new Date(driver.createdAt) : new Date(),
                                                updatedAt: driver.updatedAt ? new Date(driver.updatedAt) : new Date(),
                                                jobCenter: 'Driver',
                                                departmentName: driver.departmentName,
                                                profilePicture: driver.profilePicture
                                            }];
                                }
                            });
                        }); }))];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    error_4 = _a.sent();
                    console.error('Error fetching all drivers:', error_4);
                    return [2 /*return*/, []];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function updateDriver(id, updateData) {
    return __awaiter(this, void 0, void 0, function () {
        var db, existing, actualDbId, emp, altLookup, maxIdResult, newId, driverName, driverPhone, driverContact, driverLicensePlate, driverVehicleType, driverStatus, driverUserId, fields, values, lastUpdated, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 15, , 16]);
                    console.log('updateDriver called with id:', id, 'and updateData:', JSON.stringify(updateData, null, 2));
                    return [4 /*yield*/, initializeDriversTables()];
                case 1:
                    _a.sent(); // Ensure tables exist
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 2:
                    db = _a.sent();
                    return [4 /*yield*/, db.get('SELECT id FROM drivers WHERE id = ? OR employeeId = ?', [id, id])];
                case 3:
                    existing = _a.sent();
                    console.log('Existing driver check result:', existing);
                    actualDbId = id;
                    if (!!existing) return [3 /*break*/, 12];
                    return [4 /*yield*/, db.get("\n        SELECT e.* FROM employees e \n        JOIN departments dept ON e.departmentId = dept.id \n        WHERE e.employeeId = ? AND dept.name = 'Drivers'\n      ", [id])];
                case 4:
                    emp = _a.sent();
                    console.log('Employee lookup result:', emp);
                    if (!emp) return [3 /*break*/, 6];
                    // Create the driver record with a proper ID since the id column is TEXT, not auto-increment
                    actualDbId = "DRV-".concat(Date.now());
                    console.log('Creating new driver record with ID:', actualDbId);
                    return [4 /*yield*/, db.run("\n          INSERT INTO drivers (id, name, phone, licensePlate, vehicleType, status, employeeId, userId)\n          VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n        ", [
                            actualDbId,
                            emp.name,
                            emp.phone,
                            "AUTO-".concat(Date.now()),
                            'car',
                            updateData.status || 'available',
                            emp.employeeId,
                            emp.userId || null
                        ])];
                case 5:
                    _a.sent();
                    console.log('New driver record created successfully from employee');
                    return [3 /*break*/, 11];
                case 6:
                    // If no employee found, create a basic driver record using the ID as the username
                    // This handles cases where a driver account exists but doesn't have an employee record
                    console.log('No employee found, creating basic driver record with ID:', id);
                    return [4 /*yield*/, db.get('SELECT * FROM drivers WHERE id = ? OR userId = ? OR employeeId = ?', [id, id, id])];
                case 7:
                    altLookup = _a.sent();
                    if (!altLookup) return [3 /*break*/, 8];
                    actualDbId = altLookup.id;
                    console.log('Found existing driver with id, will update that record:', actualDbId);
                    return [3 /*break*/, 11];
                case 8: return [4 /*yield*/, db.get('SELECT MAX(id) as maxId FROM drivers')];
                case 9:
                    maxIdResult = _a.sent();
                    newId = (maxIdResult === null || maxIdResult === void 0 ? void 0 : maxIdResult.maxId) ? maxIdResult.maxId + 1 : Math.floor(Date.now() / 1000);
                    driverName = typeof id === 'string' ? "Driver ".concat(id) : "Driver ".concat(String(id));
                    driverPhone = 'N/A';
                    driverContact = 'N/A';
                    driverLicensePlate = "DRV-".concat(Date.now());
                    driverVehicleType = 'car';
                    driverStatus = updateData.status || 'available';
                    driverUserId = String(id);
                    console.log('Inserting new driver with values:', {
                        id: newId,
                        name: driverName,
                        phone: driverPhone,
                        contact: driverContact,
                        licensePlate: driverLicensePlate,
                        vehicleType: driverVehicleType,
                        status: driverStatus,
                        userId: driverUserId
                    });
                    return [4 /*yield*/, db.run("\n            INSERT INTO drivers (id, name, phone, contact, licensePlate, vehicleType, status, userId)\n            VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n          ", [
                            Number(newId), // Ensure integer ID
                            String(driverName), // Ensure string name
                            String(driverPhone), // Ensure string phone
                            String(driverContact), // Ensure string contact (NOT NULL)
                            String(driverLicensePlate), // Ensure string licensePlate
                            String(driverVehicleType), // Ensure string vehicleType
                            String(driverStatus), // Ensure string status
                            String(driverUserId) // Ensure string userId
                        ])];
                case 10:
                    _a.sent();
                    actualDbId = newId.toString();
                    console.log('Basic driver record created successfully with generated ID:', newId, 'for user:', id);
                    _a.label = 11;
                case 11: return [3 /*break*/, 13];
                case 12:
                    actualDbId = existing.id.toString();
                    console.log('Using existing driver ID:', actualDbId);
                    _a.label = 13;
                case 13:
                    fields = [];
                    values = [];
                    if (updateData.name !== undefined) {
                        fields.push('name = ?');
                        values.push(String(updateData.name));
                    }
                    if (updateData.phone !== undefined) {
                        fields.push('phone = ?');
                        values.push(String(updateData.phone));
                    }
                    if (updateData.licensePlate !== undefined) {
                        fields.push('licensePlate = ?');
                        values.push(String(updateData.licensePlate));
                    }
                    if (updateData.vehicleType !== undefined) {
                        fields.push('vehicleType = ?');
                        values.push(String(updateData.vehicleType));
                    }
                    if (updateData.status !== undefined) {
                        fields.push('status = ?');
                        values.push(String(updateData.status));
                    }
                    if (updateData.currentLocation !== undefined) {
                        fields.push('currentLat = ?, currentLng = ?, locationLastUpdated = ?');
                        console.log('Processing currentLocation:', updateData.currentLocation);
                        lastUpdated = updateData.currentLocation.lastUpdated instanceof Date
                            ? updateData.currentLocation.lastUpdated
                            : new Date(updateData.currentLocation.lastUpdated);
                        console.log('Processed lastUpdated:', lastUpdated);
                        values.push(Number(updateData.currentLocation.lat), Number(updateData.currentLocation.lng), lastUpdated.toISOString());
                        console.log('Added location values to update:', updateData.currentLocation.lat, updateData.currentLocation.lng, lastUpdated.toISOString());
                    }
                    if (fields.length === 0) {
                        console.log('No fields to update, returning true');
                        return [2 /*return*/, true];
                    }
                    values.push(Number(actualDbId)); // Ensure ID is integer for WHERE clause
                    console.log('Final update query:', "UPDATE drivers SET ".concat(fields.join(', '), ", updatedAt = CURRENT_TIMESTAMP WHERE id = ?"));
                    console.log('Final values:', values);
                    console.log('Updating driver with ID:', actualDbId, '(converted to number:', Number(actualDbId), ')');
                    return [4 /*yield*/, db.run("\n      UPDATE drivers SET ".concat(fields.join(', '), ", updatedAt = CURRENT_TIMESTAMP WHERE id = ?\n    "), values)];
                case 14:
                    _a.sent();
                    console.log('Update query executed successfully');
                    return [2 /*return*/, true];
                case 15:
                    error_5 = _a.sent();
                    console.error('Error updating driver:', error_5);
                    return [2 /*return*/, false];
                case 16: return [2 /*return*/];
            }
        });
    });
}
function deleteDriver(id) {
    return __awaiter(this, void 0, void 0, function () {
        var db, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.run("DELETE FROM drivers WHERE id = ?", [id])];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_6 = _a.sent();
                    console.error('Error deleting driver:', error_6);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Driver Assignment Operations
function assignOrderToDriver(driverId, orderId, assignedBy, pickupLocation, deliveryLocation) {
    return __awaiter(this, void 0, void 0, function () {
        var db, id, driver, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    id = "DA-".concat(Date.now());
                    return [4 /*yield*/, db.run("\n      INSERT INTO driver_assignments (\n        id, driverId, orderId, assignedBy, \n        pickupLat, pickupLng, pickupName,\n        deliveryLat, deliveryLng, deliveryName\n      )\n      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n    ", [
                            id, driverId, orderId, assignedBy,
                            pickupLocation.lat, pickupLocation.lng, pickupLocation.name,
                            deliveryLocation.lat, deliveryLocation.lng, deliveryLocation.name
                        ])];
                case 2:
                    _a.sent();
                    // Update driver status to busy
                    return [4 /*yield*/, updateDriver(driverId, { status: 'busy' })];
                case 3:
                    // Update driver status to busy
                    _a.sent();
                    return [4 /*yield*/, getDriverById(driverId)];
                case 4:
                    driver = _a.sent();
                    return [4 /*yield*/, (0, notifications_driver_1.sendDriverAssignedNotification)(orderId, driver.name, driver.phone)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, getDriverAssignmentById(id)];
                case 6: return [2 /*return*/, _a.sent()];
                case 7:
                    error_7 = _a.sent();
                    console.error('Error assigning order to driver:', error_7);
                    throw error_7;
                case 8: return [2 /*return*/];
            }
        });
    });
}
function getDriverAssignmentById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var db, assignment, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.get("\n      SELECT * FROM driver_assignments WHERE id = ?\n    ", [id])];
                case 2:
                    assignment = _a.sent();
                    if (!assignment) {
                        throw new Error('Driver assignment not found');
                    }
                    return [2 /*return*/, {
                            id: assignment.id,
                            driverId: assignment.driverId,
                            orderId: assignment.orderId,
                            assignedBy: assignment.assignedBy,
                            assignedAt: new Date(assignment.assignedAt),
                            status: assignment.status,
                            pickupLocation: assignment.pickupLat && assignment.pickupLng ? {
                                lat: assignment.pickupLat,
                                lng: assignment.pickupLng,
                                name: assignment.pickupName
                            } : undefined,
                            deliveryLocation: assignment.deliveryLat && assignment.deliveryLng ? {
                                lat: assignment.deliveryLat,
                                lng: assignment.deliveryLng,
                                name: assignment.deliveryName
                            } : undefined,
                            estimatedDeliveryTime: assignment.estimatedDeliveryTime ? new Date(assignment.estimatedDeliveryTime) : undefined,
                            actualPickupTime: assignment.actualPickupTime ? new Date(assignment.actualPickupTime) : undefined,
                            actualDeliveryTime: assignment.actualDeliveryTime ? new Date(assignment.actualDeliveryTime) : undefined
                        }];
                case 3:
                    error_8 = _a.sent();
                    console.error('Error fetching driver assignment:', error_8);
                    throw error_8;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getDriverAssignments(driverId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, assignments, error_9;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.all("\n      SELECT * FROM driver_assignments \n      WHERE driverId = ? \n      ORDER BY assignedAt DESC\n    ", [driverId])];
                case 2:
                    assignments = _a.sent();
                    return [2 /*return*/, assignments.map(function (assignment) { return ({
                            id: assignment.id,
                            driverId: assignment.driverId,
                            orderId: assignment.orderId,
                            assignedBy: assignment.assignedBy,
                            assignedAt: new Date(assignment.assignedAt),
                            status: assignment.status,
                            pickupLocation: assignment.pickupLat && assignment.pickupLng ? {
                                lat: assignment.pickupLat,
                                lng: assignment.pickupLng,
                                name: assignment.pickupName
                            } : undefined,
                            deliveryLocation: assignment.deliveryLat && assignment.deliveryLng ? {
                                lat: assignment.deliveryLat,
                                lng: assignment.deliveryLng,
                                name: assignment.deliveryName
                            } : undefined,
                            estimatedDeliveryTime: assignment.estimatedDeliveryTime ? new Date(assignment.estimatedDeliveryTime) : undefined,
                            actualPickupTime: assignment.actualPickupTime ? new Date(assignment.actualPickupTime) : undefined,
                            actualDeliveryTime: assignment.actualDeliveryTime ? new Date(assignment.actualDeliveryTime) : undefined
                        }); })];
                case 3:
                    error_9 = _a.sent();
                    console.error('Error fetching driver assignments:', error_9);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function updateAssignmentStatus(assignmentId, status, timestamp) {
    return __awaiter(this, void 0, void 0, function () {
        var db, query, values, assignment, driver, assignment, activeAssignments, error_10;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 12, , 13]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    query = "UPDATE driver_assignments SET status = ?, updatedAt = CURRENT_TIMESTAMP";
                    values = [status];
                    if (status === 'picked_up' && timestamp) {
                        query += ", actualPickupTime = ?";
                        values.push(timestamp.toISOString());
                    }
                    else if (status === 'delivered' && timestamp) {
                        query += ", actualDeliveryTime = ?";
                        values.push(timestamp.toISOString());
                    }
                    query += " WHERE id = ?";
                    values.push(assignmentId);
                    return [4 /*yield*/, db.run(query, values)];
                case 2:
                    _a.sent();
                    if (!(status !== 'cancelled')) return [3 /*break*/, 7];
                    return [4 /*yield*/, getDriverAssignmentById(assignmentId)];
                case 3:
                    assignment = _a.sent();
                    return [4 /*yield*/, getDriverById(assignment.driverId)];
                case 4:
                    driver = _a.sent();
                    return [4 /*yield*/, (0, notifications_driver_1.sendOrderStatusUpdateNotification)(assignment.orderId, status, driver.name)];
                case 5:
                    _a.sent();
                    // Sync with order_dispatches table
                    return [4 /*yield*/, db.run("UPDATE order_dispatches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?", [status, assignment.orderId])];
                case 6:
                    // Sync with order_dispatches table
                    _a.sent();
                    _a.label = 7;
                case 7:
                    if (!(status === 'delivered' || status === 'cancelled')) return [3 /*break*/, 11];
                    return [4 /*yield*/, getDriverAssignmentById(assignmentId)];
                case 8:
                    assignment = _a.sent();
                    return [4 /*yield*/, db.all("\n        SELECT COUNT(*) as count FROM driver_assignments \n        WHERE driverId = ? AND status != 'delivered' AND status != 'cancelled'\n      ", [assignment.driverId])];
                case 9:
                    activeAssignments = _a.sent();
                    if (!(activeAssignments[0].count === 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, updateDriver(assignment.driverId, { status: 'available' })];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11: return [2 /*return*/, true];
                case 12:
                    error_10 = _a.sent();
                    console.error('Error updating assignment status:', error_10);
                    return [2 /*return*/, false];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function getAvailableDrivers() {
    return __awaiter(this, void 0, void 0, function () {
        var allDrivers, error_11;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, getAllDrivers()];
                case 1:
                    allDrivers = _a.sent();
                    return [2 /*return*/, allDrivers.filter(function (d) { return d.status === 'available'; })];
                case 2:
                    error_11 = _a.sent();
                    console.error('Error fetching available drivers:', error_11);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
