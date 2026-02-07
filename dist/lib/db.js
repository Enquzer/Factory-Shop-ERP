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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbUtils = void 0;
exports.initializeDB = initializeDB;
exports.getDB = getDB;
exports.getDb = getDB;
exports.resetDbCache = resetDbCache;
var sqlite_1 = require("sqlite");
var path_1 = __importDefault(require("path"));
// Database instance
var db = null;
// Initialize database connection
function initializeDB() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (db)
                        return [2 /*return*/, db];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, sqlite_1.open)({
                            filename: path_1.default.join(process.cwd(), 'db', 'carement.db'),
                            driver: require('sqlite3').Database
                        })];
                case 2:
                    // Open database file
                    db = _a.sent();
                    console.log('Database connected successfully');
                    // Only run initial setup if this is the first time
                    // Skip setup to avoid the orderNumber error
                    // await setupDatabaseSchema();
                    return [2 /*return*/, db];
                case 3:
                    error_1 = _a.sent();
                    console.error('Database connection error:', error_1);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Get database instance
function getDB() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!db) return [3 /*break*/, 2];
                    return [4 /*yield*/, initializeDB()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, db];
            }
        });
    });
}
// Reset database cache
function resetDbCache() {
    db = null;
}
// Setup initial database schema
function setupDatabaseSchema() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDB()];
                case 1:
                    db = _a.sent();
                    // Create tables if they don't exist
                    return [4 /*yield*/, db.exec("\n    CREATE TABLE IF NOT EXISTS users (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      username TEXT UNIQUE NOT NULL,\n      password TEXT NOT NULL,\n      role TEXT NOT NULL,\n      profilePictureUrl TEXT,\n      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n    );\n\n    CREATE TABLE IF NOT EXISTS shops (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      name TEXT NOT NULL,\n      ownerName TEXT NOT NULL,\n      phoneNumber TEXT,\n      address TEXT,\n      telegram_channel_id TEXT,\n      isActive BOOLEAN DEFAULT 1,\n      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n    );\n\n    CREATE TABLE IF NOT EXISTS products (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      name TEXT NOT NULL,\n      description TEXT,\n      category TEXT,\n      basePrice REAL,\n      isActive BOOLEAN DEFAULT 1,\n      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n    );\n\n    CREATE TABLE IF NOT EXISTS orders (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      shopId INTEGER,\n      orderNumber TEXT UNIQUE NOT NULL,\n      status TEXT DEFAULT 'pending',\n      totalAmount REAL,\n      paymentStatus TEXT DEFAULT 'unpaid',\n      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (shopId) REFERENCES shops(id)\n    );\n\n    CREATE TABLE IF NOT EXISTS roles (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      name TEXT UNIQUE NOT NULL,\n      displayName TEXT NOT NULL,\n      description TEXT,\n      permissions TEXT,\n      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP\n    );\n\n    CREATE TABLE IF NOT EXISTS user_roles (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      userId INTEGER NOT NULL,\n      role TEXT NOT NULL,\n      permissions TEXT,\n      assignedBy INTEGER,\n      assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (userId) REFERENCES users(id),\n      FOREIGN KEY (assignedBy) REFERENCES users(id)\n    );\n\n    CREATE TABLE IF NOT EXISTS telegram_groups (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      chatId TEXT UNIQUE NOT NULL,\n      chatTitle TEXT,\n      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      isActive BOOLEAN DEFAULT 1\n    );\n\n    CREATE TABLE IF NOT EXISTS shop_telegram_notifications (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      shopId INTEGER,\n      messageId TEXT,\n      channelId TEXT,\n      messageText TEXT,\n      messageType TEXT,\n      sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      deliveryStatus TEXT DEFAULT 'pending',\n      FOREIGN KEY (shopId) REFERENCES shops(id)\n    );\n\n    CREATE TABLE IF NOT EXISTS notifications (\n      id TEXT PRIMARY KEY,\n      userType TEXT NOT NULL,\n      shopId TEXT,\n      title TEXT NOT NULL,\n      description TEXT NOT NULL,\n      href TEXT NOT NULL,\n      isRead BOOLEAN DEFAULT 0,\n      created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n    );\n\n    CREATE TABLE IF NOT EXISTS patterns (\n      id INTEGER PRIMARY KEY AUTOINCREMENT,\n      name TEXT NOT NULL,\n      version INTEGER DEFAULT 1,\n      parent_pattern_id INTEGER,\n      data TEXT NOT NULL,\n      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n      FOREIGN KEY (parent_pattern_id) REFERENCES patterns(id)\n    );\n\n    CREATE TABLE IF NOT EXISTS system_settings (\n      key TEXT PRIMARY KEY,\n      value TEXT NOT NULL,\n      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n    );\n  ")];
                case 2:
                    // Create tables if they don't exist
                    _a.sent();
                    // Create indexes
                    return [4 /*yield*/, db.exec("\n    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);\n    CREATE INDEX IF NOT EXISTS idx_shops_telegram ON shops(telegram_channel_id);\n    CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shopId);\n    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);\n    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(orderNumber);\n  ")];
                case 3:
                    // Create indexes
                    _a.sent();
                    // Insert default data
                    return [4 /*yield*/, insertDefaultData()];
                case 4:
                    // Insert default data
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Insert default data
function insertDefaultData() {
    return __awaiter(this, void 0, void 0, function () {
        var db, adminExists, roles, _i, roles_1, role;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDB()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.get('SELECT id FROM users WHERE username = ?', ['admin'])];
                case 2:
                    adminExists = _a.sent();
                    if (!!adminExists) return [3 /*break*/, 4];
                    // Insert default admin user (password: admin123)
                    return [4 /*yield*/, db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', 'admin'])];
                case 3:
                    // Insert default admin user (password: admin123)
                    _a.sent();
                    console.log('Default admin user created');
                    _a.label = 4;
                case 4:
                    roles = [
                        { name: 'factory', displayName: 'Factory Admin', description: 'Factory administrator with full factory access', permissions: '{"dashboard":true,"products":true,"orders":true,"inventory":true,"reports":true}' },
                        { name: 'shop', displayName: 'Shop Owner', description: 'Shop owner with shop management access', permissions: '{"dashboard":true,"orders":true,"inventory":true,"reports":true}' },
                        { name: 'store', displayName: 'Store Keeper', description: 'Store management access', permissions: '{"dashboard":true,"inventory":true,"materials":true}' },
                        { name: 'finance', displayName: 'Finance Manager', description: 'Financial operations access', permissions: '{"dashboard":true,"orders":true,"payments":true,"reports":true}' },
                        { name: 'planning', displayName: 'Planning Department', description: 'Production planning access', permissions: '{"dashboard":true,"planning":true,"reports":true}' },
                        { name: 'cutting', displayName: 'Cutting Department', description: 'Cutting department access', permissions: '{"dashboard":true,"cutting":true,"reports":true}' },
                        { name: 'sewing', displayName: 'Sewing Department', description: 'Sewing department access', permissions: '{"dashboard":true,"sewing":true,"reports":true}' },
                        { name: 'finishing', displayName: 'Finishing Department', description: 'Finishing department access', permissions: '{"dashboard":true,"finishing":true,"reports":true}' },
                        { name: 'packing', displayName: 'Packing Department', description: 'Packing department access', permissions: '{"dashboard":true,"packing":true,"reports":true}' },
                        { name: 'quality_inspection', displayName: 'Quality Control', description: 'Quality inspection access', permissions: '{"dashboard":true,"qc":true,"reports":true}' },
                        { name: 'marketing', displayName: 'Marketing Department', description: 'Marketing operations access', permissions: '{"dashboard":true,"marketing":true,"reports":true}' },
                        { name: 'designer', displayName: 'Designer', description: 'Designer studio access', permissions: '{"dashboard":true,"design":true,"reports":true}' },
                        { name: 'hr', displayName: 'HR Manager', description: 'HR and Incentive management access', permissions: '{"dashboard":true,"hr":true,"reports":true}' },
                        { name: 'admin', displayName: 'System Administrator', description: 'Full system administrator', permissions: '{"dashboard":true,"users":true,"products":true,"orders":true,"inventory":true,"reports":true,"settings":true}' }
                    ];
                    _i = 0, roles_1 = roles;
                    _a.label = 5;
                case 5:
                    if (!(_i < roles_1.length)) return [3 /*break*/, 8];
                    role = roles_1[_i];
                    return [4 /*yield*/, db.run('INSERT OR IGNORE INTO roles (name, displayName, description, permissions) VALUES (?, ?, ?, ?)', [role.name, role.displayName, role.description, role.permissions])];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log('Default roles created');
                    return [2 /*return*/];
            }
        });
    });
}
// Database utility functions
exports.dbUtils = {
    // User operations
    getUserByUsername: function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.get('SELECT * FROM users WHERE username = ?', [username])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    getUserById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.get('SELECT * FROM users WHERE id = ?', [id])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    createUser: function (username, password, role) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, role])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    },
    // Shop operations
    getShops: function () {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.all('SELECT * FROM shops WHERE isActive = 1')];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    getShopById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.get('SELECT * FROM shops WHERE id = ? AND isActive = 1', [id])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    createShop: function (name, ownerName, phoneNumber, address) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.run('INSERT INTO shops (name, ownerName, phoneNumber, address) VALUES (?, ?, ?, ?)', [name, ownerName, phoneNumber, address])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    },
    updateShopTelegramChannel: function (shopId, channelId) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.run('UPDATE shops SET telegram_channel_id = ? WHERE id = ?', [channelId, shopId])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Order operations
    getOrders: function () {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.all("\n      SELECT o.*, s.name as shopName \n      FROM orders o \n      LEFT JOIN shops s ON o.shopId = s.id \n      ORDER BY o.createdAt DESC\n    ")];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    getOrderById: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.get("\n      SELECT o.*, s.name as shopName, s.telegram_channel_id\n      FROM orders o\n      LEFT JOIN shops s ON o.shopId = s.id\n      WHERE o.id = ?\n    ", [id])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    createOrder: function (shopId, orderNumber, totalAmount) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.run('INSERT INTO orders (shopId, orderNumber, totalAmount) VALUES (?, ?, ?)', [shopId, orderNumber, totalAmount])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    },
    // Role operations
    getRoleByName: function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.get('SELECT * FROM roles WHERE name = ?', [name])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    getUserRoles: function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.all("\n      SELECT ur.*, r.displayName, r.permissions\n      FROM user_roles ur\n      JOIN roles r ON ur.role = r.name\n      WHERE ur.userId = ?\n    ", [userId])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    // Telegram operations
    saveTelegramGroup: function (chatId, chatTitle) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.run('INSERT OR IGNORE INTO telegram_groups (chatId, chatTitle) VALUES (?, ?)', [chatId, chatTitle])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    },
    getTelegramGroups: function () {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.all('SELECT * FROM telegram_groups WHERE isActive = 1')];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    },
    logTelegramNotification: function (shopId, messageId, channelId, messageText, messageType) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.run('INSERT INTO shop_telegram_notifications (shopId, messageId, channelId, messageText, messageType) VALUES (?, ?, ?, ?, ?)', [shopId, messageId, channelId, messageText, messageType])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result.lastID];
                }
            });
        });
    },
    // System settings
    getSetting: function (key) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.get('SELECT value FROM system_settings WHERE key = ?', [key])];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result ? result.value : null];
                }
            });
        });
    },
    setSetting: function (key, value) {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, getDB()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.run('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = CURRENT_TIMESTAMP', [key, value])];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    }
};
exports.default = exports.dbUtils;
