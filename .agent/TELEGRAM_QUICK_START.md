# Telegram Notification Integration - Quick Start Guide

## 📋 Overview

This guide provides step-by-step instructions to integrate Telegram notifications into the Factory-Shop-ERP system.

---

## 🎯 What You Need to Know

### Current System Status

✅ **Working**: In-app notification system with database storage  
✅ **Supported**: 12 user types (factory, shop, store, finance, planning, etc.)  
✅ **Active**: 50+ notification trigger points across the application  
⏳ **Missing**: External notification delivery (Telegram, Email, SMS)

### Integration Goal

Extend the existing `createNotification()` function to simultaneously:

1. Save notifications to SQLite database (existing)
2. Send notifications via Telegram Bot (new)
3. Allow users to control preferences (new)

---

## 🚀 Implementation Roadmap

### Step 1: Set Up Telegram Bot (15 minutes)

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts to create your bot:
   - Bot name: "Carement ERP Notifications"
   - Bot username: "carement_erp_bot" (must end with 'bot')
4. Save the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Set bot commands:
   ```
   /start - Register for notifications
   /verify - Verify your account
   /settings - Configure preferences
   /status - Check settings
   /help - Get help
   /stop - Unsubscribe
   ```

### Step 2: Install Dependencies (5 minutes)

```bash
npm install node-telegram-bot-api
npm install --save-dev @types/node-telegram-bot-api
```

### Step 3: Configure Environment Variables (5 minutes)

Add to `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ENABLED=true
TELEGRAM_WEBHOOK_SECRET=generate_random_string_here
```

### Step 4: Create Database Tables (10 minutes)

Add to `src/lib/db.ts` in the `initializeDatabase()` function:

```sql
-- User-Telegram mapping
CREATE TABLE IF NOT EXISTS user_telegram_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  userType TEXT NOT NULL,
  shopId TEXT,
  telegramChatId TEXT NOT NULL,
  telegramUsername TEXT,
  notificationPreferences TEXT,
  isActive INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userType, shopId, telegramChatId)
);

-- Verification codes
CREATE TABLE IF NOT EXISTS telegram_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  userType TEXT NOT NULL,
  shopId TEXT,
  verificationCode TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  isUsed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notification log
CREATE TABLE IF NOT EXISTS telegram_notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notificationId TEXT NOT NULL,
  chatId TEXT NOT NULL,
  status TEXT NOT NULL,
  errorMessage TEXT,
  sentAt DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (notificationId) REFERENCES notifications (id)
);
```

### Step 5: Create Telegram Library (30 minutes)

Create `src/lib/telegram.ts` with core functions:

- Bot initialization
- Send message function
- User registration
- Webhook handler

### Step 6: Create API Routes (20 minutes)

- `POST /api/telegram/webhook` - Handle bot updates
- `POST /api/telegram/register` - Generate verification code
- `POST /api/telegram/verify` - Verify user
- `GET /api/telegram/settings` - Get preferences
- `PUT /api/telegram/settings` - Update preferences

### Step 7: Enhance Notification Function (15 minutes)

Modify `src/lib/notifications.ts` to call Telegram API

### Step 8: Build User Interface (30 minutes)

Add Telegram settings section to user profile page

### Step 9: Test Integration (20 minutes)

- Test bot commands
- Test user registration
- Test notification delivery
- Test error handling

### Step 10: Deploy (Variable)

- Set up production bot
- Configure webhook
- Update environment variables
- Monitor logs

---

## 📊 Notification Priority System

### Critical (🚨)

- Payment failures
- QC failures
- System errors
- Security alerts

**Action**: Always send to Telegram, regardless of user preferences

### Important (⚠️)

- New orders
- Status changes
- Production milestones
- Low stock alerts

**Action**: Send to Telegram if user enabled this category

### Informational (ℹ️)

- General updates
- Non-urgent changes
- System messages

**Action**: Send to Telegram only if user explicitly enabled

---

## 🔧 Code Examples

### Example 1: Enhanced Notification Creation

```typescript
// Before (existing)
await createNotification({
  userType: "factory",
  title: "New Order",
  description: "Order #123 received",
  href: "/orders/123",
});

// After (with Telegram)
await createNotification(
  {
    userType: "factory",
    title: "New Order",
    description: "Order #123 received",
    href: "/orders/123",
  },
  {
    sendTelegram: true,
    priority: "important",
  },
);
```

### Example 2: Telegram Message Format

```
🔔 New Order

━━━━━━━━━━━━━━━━
📝 Order #123 has been received from Shop ABC

🔗 View Details: http://localhost:3000/orders/123

⏰ 2026-01-24 15:30
```

### Example 3: User Registration Flow

```typescript
// 1. User clicks "Connect Telegram" in profile
// 2. System generates code
const code = await generateVerificationCode(user.id, user.role, user.shopId);

// 3. Display code to user
// "Your verification code: ABC123"
// "Open Telegram and send: /verify ABC123"

// 4. User sends command to bot
// 5. Bot verifies and links account
await verifyAndLinkTelegram(chatId, code);
```

---

## 🎨 User Interface Components

### Profile Page Addition

```
┌─────────────────────────────────────┐
│ Telegram Notifications              │
├─────────────────────────────────────┤
│ Status: ● Connected                 │
│ Username: @johndoe                  │
│                                     │
│ [Configure Preferences]             │
│ [Disconnect Telegram]               │
└─────────────────────────────────────┘
```

### Settings Modal

```
┌─────────────────────────────────────┐
│ Notification Preferences            │
├─────────────────────────────────────┤
│ Orders                              │
│ ☑ New orders                        │
│ ☑ Status changes                    │
│ ☑ Payment updates                   │
│                                     │
│ Production                          │
│ ☑ Milestones                        │
│ ☐ Daily updates                     │
│ ☑ Delays                            │
│                                     │
│ Inventory                           │
│ ☑ Low stock alerts                  │
│ ☐ Stock updates                     │
│                                     │
│ [Save Preferences]                  │
└─────────────────────────────────────┘
```

---

## 🔒 Security Best Practices

### 1. Webhook Security

- Verify all webhook requests using secret token
- Validate Telegram update structure
- Rate limit webhook endpoint

### 2. User Verification

- Use time-limited verification codes (15 minutes)
- One-time use codes
- Secure code generation (crypto.randomBytes)

### 3. Data Privacy

- Store minimal Telegram data
- Allow users to delete data
- Don't send sensitive info in notifications

### 4. Rate Limiting

- Respect Telegram API limits (30 msg/sec)
- Implement queue for high volume
- Batch similar notifications

---

## 📈 Monitoring & Metrics

### Key Metrics to Track

1. **Delivery Rate**: % of notifications successfully sent
2. **Registration Rate**: % of users who connect Telegram
3. **Error Rate**: % of failed deliveries
4. **Response Time**: Time to send notification
5. **User Engagement**: % of users who interact with bot

### Logging Strategy

```typescript
// Log every Telegram operation
logger.info("Telegram notification sent", {
  notificationId: "NOTIF-123",
  chatId: "123456789",
  userType: "factory",
  priority: "important",
  status: "success",
  responseTime: "245ms",
});
```

---

## 🐛 Troubleshooting

### Issue: Bot not responding

**Solution**:

- Check bot token is correct
- Verify bot is not blocked by user
- Check webhook is properly configured

### Issue: Notifications not sending

**Solution**:

- Check TELEGRAM_ENABLED is true
- Verify user has registered Telegram
- Check notification preferences
- Review error logs

### Issue: Duplicate notifications

**Solution**:

- Implement idempotency key
- Check for duplicate webhook calls
- Add notification deduplication logic

### Issue: Rate limit exceeded

**Solution**:

- Implement message queue
- Batch similar notifications
- Add delay between messages

---

## 📚 Resources

### Telegram Bot API Documentation

- Official Docs: https://core.telegram.org/bots/api
- Node.js Library: https://github.com/yagop/node-telegram-bot-api

### Testing Tools

- Telegram Bot API Tester: https://core.telegram.org/bots/api#making-requests
- Webhook Tester: https://webhook.site/

### Community Resources

- Telegram Bot Developers: https://t.me/BotDevelopers
- Stack Overflow: [telegram-bot] tag

---

## ✅ Pre-Launch Checklist

### Development

- [ ] Bot created via BotFather
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database tables created
- [ ] Telegram library implemented
- [ ] API routes created
- [ ] Notification function enhanced
- [ ] UI components built

### Testing

- [ ] Bot commands tested
- [ ] User registration flow tested
- [ ] All notification types tested
- [ ] Error handling tested
- [ ] Rate limiting tested
- [ ] Security measures tested

### Documentation

- [ ] User guide created
- [ ] Admin documentation written
- [ ] API documentation updated
- [ ] Code comments added

### Deployment

- [ ] Production bot created
- [ ] Webhook configured
- [ ] Environment variables set
- [ ] Monitoring enabled
- [ ] Backup plan ready

---

## 🎓 User Training Guide

### For End Users

1. **How to Connect Telegram**
   - Login to ERP
   - Go to Profile → Settings
   - Click "Connect Telegram"
   - Follow on-screen instructions

2. **How to Configure Notifications**
   - Open Telegram bot
   - Send `/settings`
   - Choose categories
   - Save preferences

3. **How to Disconnect**
   - Send `/stop` to bot
   - Or disconnect from ERP profile

### For Administrators

1. **How to Monitor System**
   - Check notification logs
   - Review delivery rates
   - Monitor error rates

2. **How to Troubleshoot**
   - Check user registration status
   - Review error logs
   - Test bot manually

---

## 💡 Tips & Best Practices

1. **Start Small**: Begin with critical notifications only
2. **Get Feedback**: Ask users what notifications they want
3. **Monitor Closely**: Watch for errors in first week
4. **Iterate Quickly**: Adjust based on user feedback
5. **Document Everything**: Keep detailed logs and docs

---

## 🔄 Future Enhancements

### Phase 2 Features

- [ ] Rich message formatting (buttons, inline keyboards)
- [ ] Image attachments in notifications
- [ ] Two-way communication (reply to notifications)
- [ ] Group notifications for teams
- [ ] Scheduled digest notifications

### Phase 3 Features

- [ ] Email notifications
- [ ] SMS notifications
- [ ] Push notifications (mobile app)
- [ ] Notification analytics dashboard
- [ ] AI-powered notification prioritization

---

**Last Updated**: 2026-01-24  
**Version**: 1.0  
**Status**: Ready for Implementation
