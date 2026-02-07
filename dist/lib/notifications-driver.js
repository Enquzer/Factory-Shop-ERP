"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.sendDriverAssignedNotification = sendDriverAssignedNotification;
exports.sendOrderStatusUpdateNotification = sendOrderStatusUpdateNotification;
exports.getUserNotifications = getUserNotifications;
exports.markNotificationAsRead = markNotificationAsRead;
exports.initializeNotificationsTable = initializeNotificationsTable;
var db_1 = require("./db");
// Send notification to customer when driver is assigned
function sendDriverAssignedNotification(orderId, driverName, driverPhone) {
    return __awaiter(this, void 0, void 0, function () {
        var db, order, notificationId, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.get("\n      SELECT customerId, customerName, customerEmail, customerPhone \n      FROM ecommerce_orders \n      WHERE id = ?\n    ", [orderId])];
                case 2:
                    order = _a.sent();
                    if (!order) {
                        console.error('Order not found for notification');
                        return [2 /*return*/, false];
                    }
                    notificationId = "NOTIF-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
                    return [4 /*yield*/, db.run("\n      INSERT INTO notifications (\n        id, userId, type, title, message, orderId, isRead, createdAt\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n    ", [
                            notificationId,
                            order.customerId,
                            'driver_assigned',
                            'Driver Assigned to Your Order',
                            "Good news! Driver ".concat(driverName, " has been assigned to deliver your order #").concat(orderId, ". You can now track your order in real-time. Driver contact: ").concat(driverPhone),
                            orderId,
                            false
                        ])];
                case 3:
                    _a.sent();
                    // Mark notification as sent in driver assignment
                    return [4 /*yield*/, db.run("\n      UPDATE driver_assignments \n      SET notificationSent = TRUE \n      WHERE orderId = ?\n    ", [orderId])];
                case 4:
                    // Mark notification as sent in driver assignment
                    _a.sent();
                    console.log("Notification sent to customer ".concat(order.customerName, " for order ").concat(orderId));
                    return [2 /*return*/, true];
                case 5:
                    error_1 = _a.sent();
                    console.error('Error sending driver assigned notification:', error_1);
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Send status update notification to customer
function sendOrderStatusUpdateNotification(orderId, status, driverName) {
    return __awaiter(this, void 0, void 0, function () {
        var db, order, title, message, notificationId, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.get("\n      SELECT customerId, customerName \n      FROM ecommerce_orders \n      WHERE id = ?\n    ", [orderId])];
                case 2:
                    order = _a.sent();
                    if (!order) {
                        return [2 /*return*/, false];
                    }
                    title = '';
                    message = '';
                    switch (status) {
                        case 'accepted':
                            title = 'Order Accepted';
                            message = "Your order #".concat(orderId, " has been accepted by driver ").concat(driverName || 'your assigned driver', " and is being prepared for pickup.");
                            break;
                        case 'picked_up':
                            title = 'Order Picked Up';
                            message = "Your order #".concat(orderId, " has been picked up by driver ").concat(driverName || 'your assigned driver', " and is on the way!");
                            break;
                        case 'in_transit':
                            title = 'Order In Transit';
                            message = "Your order #".concat(orderId, " is now in transit and heading to your location.");
                            break;
                        case 'delivered':
                            title = 'Order Delivered!';
                            message = "Great news! Your order #".concat(orderId, " has been successfully delivered. Thank you for choosing us!");
                            break;
                        default:
                            return [2 /*return*/, false];
                    }
                    notificationId = "NOTIF-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
                    return [4 /*yield*/, db.run("\n      INSERT INTO notifications (\n        id, userId, type, title, message, orderId, isRead, createdAt\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)\n    ", [
                            notificationId,
                            order.customerId,
                            'order_status',
                            title,
                            message,
                            orderId,
                            false
                        ])];
                case 3:
                    _a.sent();
                    console.log("Status update notification sent for order ".concat(orderId, ": ").concat(status));
                    return [2 /*return*/, true];
                case 4:
                    error_2 = _a.sent();
                    console.error('Error sending status update notification:', error_2);
                    return [2 /*return*/, false];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Get unread notifications for user
function getUserNotifications(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, notifications, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.all("\n      SELECT * FROM notifications \n      WHERE userId = ? \n      ORDER BY createdAt DESC \n      LIMIT 50\n    ", [userId])];
                case 2:
                    notifications = _a.sent();
                    return [2 /*return*/, notifications.map(function (notif) { return (__assign(__assign({}, notif), { createdAt: new Date(notif.createdAt), isRead: Boolean(notif.isRead) })); })];
                case 3:
                    error_3 = _a.sent();
                    console.error('Error fetching user notifications:', error_3);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Mark notification as read
function markNotificationAsRead(notificationId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.run("\n      UPDATE notifications \n      SET isRead = TRUE, updatedAt = CURRENT_TIMESTAMP \n      WHERE id = ?\n    ", [notificationId])];
                case 2:
                    _a.sent();
                    return [2 /*return*/, true];
                case 3:
                    error_4 = _a.sent();
                    console.error('Error marking notification as read:', error_4);
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Initialize notifications table
function initializeNotificationsTable() {
    return __awaiter(this, void 0, void 0, function () {
        var db, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, (0, db_1.getDB)()];
                case 1:
                    db = _a.sent();
                    return [4 /*yield*/, db.exec("\n      CREATE TABLE IF NOT EXISTS notifications (\n        id TEXT PRIMARY KEY,\n        userId TEXT NOT NULL,\n        type TEXT NOT NULL, -- 'driver_assigned', 'order_status', 'general'\n        title TEXT NOT NULL,\n        message TEXT NOT NULL,\n        orderId TEXT,\n        isRead BOOLEAN DEFAULT FALSE,\n        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,\n        FOREIGN KEY (orderId) REFERENCES ecommerce_orders(id) ON DELETE SET NULL\n      )\n    ")];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, db.exec("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, db.exec("CREATE INDEX IF NOT EXISTS idx_notifications_order ON notifications(orderId)")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, db.exec("CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(userId, isRead) WHERE isRead = FALSE")];
                case 5:
                    _a.sent();
                    console.log('Notifications table initialized successfully');
                    return [3 /*break*/, 7];
                case 6:
                    error_5 = _a.sent();
                    console.error('Error initializing notifications table:', error_5);
                    throw error_5;
                case 7: return [2 /*return*/];
            }
        });
    });
}
