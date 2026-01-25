# Telegram Notification Integration - Deep Project Analysis

## Executive Summary

This document provides a comprehensive analysis of the Factory-Shop-ERP system to prepare for integrating Telegram notifications. The system currently has a robust in-app notification system that can be extended to send notifications via Telegram.

---

## 1. Project Overview

### Technology Stack

- **Framework**: Next.js 14.2.5 (React-based)
- **Database**: SQLite3 (local file-based database)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Custom JWT-based authentication
- **API**: Next.js API Routes (RESTful)

### Project Structure

```
Factory-Shop-ERP/
├── src/
│   ├── app/              # Next.js app directory (pages & API routes)
│   ├── components/       # React components
│   ├── lib/              # Business logic & database operations
│   ├── hooks/            # React hooks
│   └── contexts/         # React contexts
├── db/                   # SQLite database files
└── public/               # Static assets
```

---

## 2. Current Notification System Architecture

### 2.1 Database Schema

The notifications are stored in a SQLite table with the following structure:

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  userType TEXT NOT NULL,
  shopId TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  href TEXT NOT NULL,
  isRead INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 2.2 User Types (Roles)

The system supports the following user types:

1. **factory** - Factory administrators
2. **shop** - Individual shop users
3. **store** - Store/warehouse managers
4. **finance** - Finance department
5. **planning** - Production planning team
6. **sample_maker** - Sample creation team
7. **cutting** - Cutting department
8. **sewing** - Sewing department
9. **finishing** - Finishing department
10. **packing** - Packing department
11. **quality_inspection** - QC team
12. **designer** - Design team

### 2.3 Notification Library (`src/lib/notifications.ts`)

**Key Functions:**

- `createNotification()` - Creates a new notification
- `getNotifications()` - Retrieves notifications for a user type
- `markNotificationAsRead()` - Marks a single notification as read
- `markAllNotificationsAsRead()` - Marks all notifications for a user as read

**Notification Structure:**

```typescript
type Notification = {
  id: string;
  userType: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | ...;
  shopId?: string;
  title: string;
  description: string;
  href: string;
  isRead: boolean;
  createdAt: Date;
}
```

### 2.4 API Endpoints

- `POST /api/notifications` - Create notification
- `GET /api/notifications?userType=X&shopId=Y` - Get notifications
- `PUT /api/notifications?id=X` - Mark notification as read

---

## 3. Notification Trigger Points

### 3.1 Order Management Notifications

**File**: `src/app/api/orders/[id]/status/route.ts`

Triggers:

- Order confirmed (status: 'Awaiting Payment')
- Payment confirmed (status: 'Paid')
- Order released to store (status: 'Released')
- Order delivered (status: 'Delivered')

**Recipients**: Factory, Shop, Store

### 3.2 Production Workflow Notifications

#### Cutting Department (`src/lib/cutting.ts`)

Triggers:

- Cutting completed → QC department
- Cut panels ready for handover → Sewing department
- Sewing accepted cut panels → Planning department

#### Marketing Orders (`src/app/api/marketing-orders/`)

Triggers:

- New marketing order created
- Order status changes
- Production milestones reached

### 3.3 Product & Inventory Notifications

**File**: `src/lib/products-sqlite.ts`

Triggers:

- Low stock alerts
- Product variant updates
- Product image updates

### 3.4 Shop Management Notifications

Triggers:

- Shop registration
- Shop approval/rejection
- Password reset requests

### 3.5 Finance Notifications

Triggers:

- Payment requests
- Payment verification
- Order release confirmations

---

## 4. Notification Patterns Analysis

### 4.1 Common Notification Pattern

```typescript
await createNotification({
  userType: "target_user_type",
  shopId: "optional_shop_id", // Only for shop-specific notifications
  title: "Short Title",
  description: "Detailed message",
  href: "/link/to/relevant/page",
});
```

### 4.2 Notification Categories

#### Critical Notifications (Immediate Telegram Alert)

- Payment confirmations
- QC failures
- Order cancellations
- Production delays

#### Important Notifications (Telegram Alert)

- New orders
- Status changes
- Handover completions
- Low stock alerts

#### Informational Notifications (Optional Telegram)

- Order updates
- General status changes
- Non-critical updates

---

## 5. Integration Points for Telegram

### 5.1 Recommended Architecture

```
┌─────────────────┐
│  Application    │
│  Triggers       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ createNotification()
│ (Enhanced)      │
└────────┬────────┘
         │
         ├──────────────┬─────────────┐
         ▼              ▼             ▼
┌────────────┐  ┌──────────┐  ┌──────────┐
│  SQLite    │  │ Telegram │  │  Email   │
│  Database  │  │   Bot    │  │ (Future) │
└────────────┘  └──────────┘  └──────────┘
```

### 5.2 Required Modifications

#### A. Environment Variables (`.env`)

```env
# Existing
GEMINI_API_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
PORT=3000

# New for Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ENABLED=true
```

#### B. User-Telegram Mapping Table

```sql
CREATE TABLE user_telegram_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  userType TEXT NOT NULL,
  shopId TEXT,
  telegramChatId TEXT NOT NULL,
  telegramUsername TEXT,
  notificationPreferences TEXT,  -- JSON: which notifications to receive
  isActive INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userType, shopId, telegramChatId)
)
```

#### C. New Library: `src/lib/telegram.ts`

Functions needed:

- `sendTelegramNotification(chatId, title, description, href)`
- `registerTelegramUser(userType, shopId, chatId, username)`
- `getTelegramChatIds(userType, shopId?)`
- `updateNotificationPreferences(userId, preferences)`
- `verifyTelegramUser(chatId, verificationCode)`

#### D. Enhanced Notification Function

```typescript
export const createNotification = async (
  notification: Omit<Notification, "id" | "isRead" | "createdAt">,
  options?: {
    sendTelegram?: boolean;
    priority?: "critical" | "important" | "info";
  },
) => {
  // 1. Save to database (existing)
  const notificationId = await saveToDatabase(notification);

  // 2. Send to Telegram (new)
  if (options?.sendTelegram !== false) {
    await sendToTelegram(notification, options?.priority);
  }

  return notificationId;
};
```

---

## 6. Telegram Bot Implementation Plan

### 6.1 Bot Commands

```
/start - Register for notifications
/verify <code> - Verify your account
/settings - Configure notification preferences
/status - Check your notification settings
/help - Get help
/stop - Unsubscribe from notifications
```

### 6.2 Notification Format

```
🔔 [TITLE]
━━━━━━━━━━━━━━━━
📝 [DESCRIPTION]

🔗 View Details: [BASE_URL][HREF]

⏰ [TIMESTAMP]
```

### 6.3 Priority Indicators

- 🚨 Critical (Red dot)
- ⚠️ Important (Yellow dot)
- ℹ️ Info (Blue dot)

---

## 7. Database Modifications Required

### 7.1 New Tables

1. **user_telegram_settings** - Maps users to Telegram chat IDs
2. **telegram_verification_codes** - Temporary codes for user verification
3. **telegram_notification_log** - Track sent Telegram notifications

### 7.2 Schema for Verification Codes

```sql
CREATE TABLE telegram_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  userType TEXT NOT NULL,
  shopId TEXT,
  verificationCode TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  isUsed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 7.3 Schema for Notification Log

```sql
CREATE TABLE telegram_notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notificationId TEXT NOT NULL,
  chatId TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'sent', 'failed', 'pending'
  errorMessage TEXT,
  sentAt DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (notificationId) REFERENCES notifications (id)
)
```

---

## 8. API Routes to Create

### 8.1 Telegram Webhook

- `POST /api/telegram/webhook` - Receive updates from Telegram

### 8.2 User Management

- `POST /api/telegram/register` - Generate verification code
- `POST /api/telegram/verify` - Verify user with code
- `GET /api/telegram/settings` - Get user settings
- `PUT /api/telegram/settings` - Update preferences

### 8.3 Testing

- `POST /api/telegram/test` - Send test notification

---

## 9. Security Considerations

### 9.1 Authentication

- Verify Telegram webhook requests using bot token
- Use verification codes for user registration
- Implement rate limiting on verification attempts

### 9.2 Data Privacy

- Store only necessary Telegram data (chat ID, username)
- Allow users to delete their Telegram data
- Encrypt sensitive notification content

### 9.3 Rate Limiting

- Implement Telegram API rate limits (30 messages/second)
- Queue notifications if rate limit exceeded
- Batch similar notifications

---

## 10. Dependencies to Install

```json
{
  "dependencies": {
    "node-telegram-bot-api": "^0.66.0",
    "bull": "^4.12.0" // For notification queue (optional)
  },
  "devDependencies": {
    "@types/node-telegram-bot-api": "^0.64.0"
  }
}
```

---

## 11. Configuration Files

### 11.1 Telegram Bot Configuration

Create `src/config/telegram.ts`:

```typescript
export const telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  enabled: process.env.TELEGRAM_ENABLED === "true",
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || "",
  maxRetries: 3,
  retryDelay: 1000,
  rateLimit: {
    maxMessages: 30,
    perSeconds: 1,
  },
};
```

---

## 12. User Flow for Telegram Registration

1. User logs into ERP system
2. User navigates to Profile/Settings
3. User clicks "Connect Telegram"
4. System generates unique verification code
5. System displays code and instructions
6. User opens Telegram and messages the bot
7. User sends `/verify <code>` command
8. Bot verifies code and links account
9. User receives confirmation in both ERP and Telegram
10. User can configure notification preferences

---

## 13. Notification Preference Schema

```typescript
type NotificationPreferences = {
  orders: {
    newOrder: boolean;
    statusChange: boolean;
    payment: boolean;
  };
  production: {
    milestones: boolean;
    delays: boolean;
    qcResults: boolean;
  };
  inventory: {
    lowStock: boolean;
    stockUpdates: boolean;
  };
  system: {
    critical: boolean; // Always true
    important: boolean;
    informational: boolean;
  };
};
```

---

## 14. Implementation Phases

### Phase 1: Foundation (Week 1)

- Install dependencies
- Create database tables
- Set up Telegram bot
- Create basic webhook handler

### Phase 2: Core Integration (Week 2)

- Implement telegram.ts library
- Enhance createNotification function
- Create user registration flow
- Build settings UI

### Phase 3: Testing & Refinement (Week 3)

- Test all notification types
- Implement rate limiting
- Add error handling
- Create admin dashboard

### Phase 4: Deployment (Week 4)

- Production bot setup
- Webhook configuration
- User documentation
- Monitoring setup

---

## 15. Key Files to Modify

1. **src/lib/notifications.ts** - Add Telegram integration
2. **src/lib/db.ts** - Add new tables
3. **src/app/api/notifications/route.ts** - Enhance API
4. **All notification trigger points** - Add Telegram flag

---

## 16. Testing Strategy

### 16.1 Unit Tests

- Telegram message formatting
- User verification logic
- Notification routing

### 16.2 Integration Tests

- End-to-end notification flow
- Webhook handling
- Database operations

### 16.3 Manual Testing

- Bot commands
- User registration
- Notification delivery
- Error scenarios

---

## 17. Monitoring & Logging

### 17.1 Metrics to Track

- Notifications sent/failed
- Response times
- User registrations
- Delivery rates

### 17.2 Logging

- All Telegram API calls
- Webhook events
- Errors and exceptions
- User actions

---

## 18. Fallback Mechanisms

1. **Telegram API Down**
   - Queue notifications
   - Retry with exponential backoff
   - Alert admins

2. **User Not Registered**
   - Store in database only
   - Show in-app notification

3. **Rate Limit Exceeded**
   - Queue messages
   - Batch similar notifications
   - Prioritize critical alerts

---

## 19. Cost Considerations

- Telegram Bot API is **FREE**
- No message limits for bots
- Self-hosted solution (no external service costs)
- Minimal server resource usage

---

## 20. Next Steps

Once you're ready to proceed, I can help you with:

1. **Setting up the Telegram bot** (via BotFather)
2. **Creating the database migrations**
3. **Implementing the telegram.ts library**
4. **Enhancing the notification system**
5. **Building the user registration UI**
6. **Testing the integration**

---

## Appendix A: Example Notification Mappings

| Event             | User Types Notified                   | Telegram Priority | Current Location               |
| ----------------- | ------------------------------------- | ----------------- | ------------------------------ |
| New Order         | factory, finance                      | Important         | `orders/route.ts`              |
| Payment Confirmed | factory, shop, store                  | Critical          | `orders/[id]/payment/route.ts` |
| QC Failed         | cutting, quality_inspection, planning | Critical          | `cutting.ts`                   |
| Low Stock         | factory, store                        | Important         | `products-sqlite.ts`           |
| Order Released    | store, shop                           | Important         | `orders/[id]/release/route.ts` |
| Cutting Complete  | quality_inspection                    | Important         | `cutting.ts`                   |
| Sewing Accepted   | planning                              | Info              | `cutting.ts`                   |

---

## Appendix B: Telegram Bot Setup Checklist

- [ ] Create bot via @BotFather
- [ ] Get bot token
- [ ] Set bot commands
- [ ] Configure webhook URL
- [ ] Set bot description
- [ ] Upload bot profile picture
- [ ] Test bot in private chat
- [ ] Document bot usage

---

## Appendix C: Environment Variables Reference

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_ENABLED=true
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your_random_secret_here

# Existing
GEMINI_API_KEY=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
PORT=3000
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-24  
**Author**: AI Assistant  
**Status**: Ready for Implementation
