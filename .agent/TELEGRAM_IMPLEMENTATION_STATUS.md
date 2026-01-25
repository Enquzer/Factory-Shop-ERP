# Shop Telegram Channel Integration - Implementation Status

## ✅ Completed

### 1. Database Schema ✓

**File**: `src/lib/db.ts`

- ✅ Added `telegram_channel_id` column to `shops` table
- ✅ Created `shop_telegram_notifications` table for logging

**Changes Made**:

```sql
-- Added to shops table
ALTER TABLE shops ADD COLUMN telegram_channel_id TEXT;

-- New table for notification logging
CREATE TABLE shop_telegram_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId TEXT NOT NULL,
  shopId TEXT NOT NULL,
  channelId TEXT NOT NULL,
  messageType TEXT NOT NULL,
  messageId TEXT,
  pdfUrl TEXT,
  imageUrl TEXT,
  status TEXT NOT NULL,
  errorMessage TEXT,
  sentAt DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 2. Telegram Notification Library ✓

**File**: `src/lib/telegram-shop-notifications.ts`

**Functions Created**:

- ✅ `sendShopOrderNotification()` - Send notifications to shop channels
- ✅ `getOrderTelegramHistory()` - Get notification history for an order
- ✅ `getShopTelegramHistory()` - Get notification history for a shop
- ✅ `testTelegramChannel()` - Test if a channel is configured correctly

**Features**:

- Lazy bot initialization (only when needed)
- Support for PDF documents
- Support for images (payment slips)
- Comprehensive error handling
- Automatic logging to database
- Graceful handling of missing channel IDs

---

### 3. PDF Generator for Telegram ✓

**File**: `src/lib/shop-order-telegram-pdf.ts`

**Functions Created**:

- ✅ `generateOrderPlacementPDF()` - Generate order placement report
- ✅ `generateOrderDispatchPDF()` - Generate comprehensive dispatch report
- ✅ `getPaymentSlipPath()` - Get payment slip file path
- ✅ `cleanupOldPDFs()` - Maintenance function to clean old PDFs

**PDF Content Includes**:

- Order details with sequence number
- Shop information
- Item breakdown
- Summary statistics
- Timeline information
- Dispatch details
- Payment information

---

## 🔨 Next Steps (To Be Implemented)

### 4. Integration with Order Workflow

**Files to Modify**:

#### A. Order Placement (`src/app/api/orders/route.ts`)

**Location**: After order creation (around line 200)

```typescript
// Add this import at the top
import { sendShopOrderNotification } from "@/lib/telegram-shop-notifications";
import { generateOrderPlacementPDF } from "@/lib/shop-order-telegram-pdf";

// Add after order is created successfully
try {
  // Generate PDF
  const pdfPath = await generateOrderPlacementPDF(orderId);

  // Send to Telegram channel
  await sendShopOrderNotification(orderId, shopId, "order_placed", {
    pdfPath,
    caption: `📋 *New Order Received*\n\nOrder ID: \`${orderId}\`\nShop: ${shopName}\nAmount: ${totalAmount.toLocaleString()} Birr`,
    additionalText: `Total Items: ${items.length}\nStatus: Pending Verification`,
  });
} catch (telegramError) {
  console.error("Error sending Telegram notification:", telegramError);
  // Don't fail the order creation if Telegram fails
}
```

---

#### B. Payment Verification (`src/app/api/orders/[id]/payment-verify/route.ts`)

**Location**: After payment is verified

```typescript
// Add imports
import { sendShopOrderNotification } from "@/lib/telegram-shop-notifications";
import { getPaymentSlipPath } from "@/lib/shop-order-telegram-pdf";

// Add after payment verification
try {
  const imagePath = order.paymentSlipUrl
    ? getPaymentSlipPath(order.paymentSlipUrl)
    : undefined;

  await sendShopOrderNotification(id, order.shopId, "payment_verified", {
    imagePath,
    caption: `✅ *Payment Verified*\n\nOrder ID: \`${id}\`\nAmount: ${order.amount.toLocaleString()} Birr\nVerified by: Factory`,
    additionalText: `Your order is now confirmed and will be processed.`,
  });
} catch (telegramError) {
  console.error("Error sending Telegram notification:", telegramError);
}
```

---

#### C. Order Dispatch (`src/app/api/orders/[id]/dispatch/route.ts`)

**Location**: After order is dispatched

```typescript
// Add imports
import { sendShopOrderNotification } from "@/lib/telegram-shop-notifications";
import { generateOrderDispatchPDF } from "@/lib/shop-order-telegram-pdf";

// Add after dispatch
try {
  // Generate comprehensive dispatch PDF
  const pdfPath = await generateOrderDispatchPDF(id);

  await sendShopOrderNotification(id, order.shopId, "order_dispatched", {
    pdfPath,
    caption: `🚚 *Order Dispatched*\n\nOrder ID: \`${id}\`\nExpected Delivery: ${deliveryDate}`,
    additionalText: `Please check the attached comprehensive report for full details.`,
  });
} catch (telegramError) {
  console.error("Error sending Telegram notification:", telegramError);
}
```

---

### 5. Shop Management UI Updates

**Files to Modify**:

#### A. Shop List/Management Page

**File**: `src/app/(app)/shops/page.tsx` (or similar)

Add Telegram Channel ID field to shop creation/edit form:

```typescript
// Add to form state
const [telegramChannelId, setTelegramChannelId] = useState('');

// Add to form JSX
<div className="mb-4">
  <label className="block text-sm font-medium mb-1">
    Telegram Channel ID (Optional)
  </label>
  <input
    type="text"
    value={telegramChannelId}
    onChange={(e) => setTelegramChannelId(e.target.value)}
    placeholder="-1001234567890"
    className="w-full px-3 py-2 border rounded-md"
  />
  <p className="text-xs text-gray-500 mt-1">
    Enter the Telegram channel ID where order notifications will be sent.
    Format: -100XXXXXXXXXX
  </p>
</div>
```

---

#### B. Telegram Settings Page (New)

**File**: `src/app/(app)/settings/telegram/page.tsx`

Create a dedicated page for managing Telegram channels for all shops.

**Features**:

- List all shops with their Telegram channel IDs
- Inline editing of channel IDs
- Test button to send test message
- Status indicator (configured/not configured)
- Instructions on how to get channel ID

---

### 6. API Routes for Testing

**File**: `src/app/api/telegram/test/route.ts` (New)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { testTelegramChannel } from "@/lib/telegram-shop-notifications";
import { authenticateRequest } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req);

  if (!user || user.role !== "factory") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { channelId } = await req.json();

  const result = await testTelegramChannel(channelId);

  return NextResponse.json(result);
}
```

---

## 📋 Installation Steps

### Step 1: Install Dependencies

```bash
npm install node-telegram-bot-api
npm install --save-dev @types/node-telegram-bot-api
```

### Step 2: Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow prompts:
   - Bot name: "Carement Order Bot"
   - Bot username: "carement_order_bot" (must end with 'bot')
4. Save the bot token

### Step 3: Configure Environment Variables

Add to `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ENABLED=true
```

### Step 4: Restart Development Server

```bash
npm run dev
```

The database tables will be created automatically on next startup.

---

## 🧪 Testing Checklist

### Database Setup

- [ ] Restart server to create new tables
- [ ] Verify `telegram_channel_id` column exists in shops table
- [ ] Verify `shop_telegram_notifications` table exists

### Telegram Bot Setup

- [ ] Bot created via BotFather
- [ ] Bot token added to .env
- [ ] TELEGRAM_ENABLED set to true

### Channel Configuration

- [ ] Create test Telegram channel
- [ ] Add bot as administrator to channel
- [ ] Get channel ID (use @userinfobot)
- [ ] Add channel ID to a test shop

### Notification Testing

- [ ] Place test order → Check if PDF sent to channel
- [ ] Upload payment slip → Check if image sent to channel
- [ ] Dispatch order → Check if dispatch report sent to channel

### Error Handling

- [ ] Test with shop that has no channel ID (should skip gracefully)
- [ ] Test with invalid channel ID (should log error)
- [ ] Test with bot not admin in channel (should log error)

---

## 📊 Message Format Examples

### 1. Order Placement

```
📋 *New Order Received*

Order ID: `ORD-2026-001`
Shop: ABC Fashion Store
Amount: 15,000 Birr

Total Items: 5
Status: Pending Verification

📄 [Order Details PDF Attached]
```

### 2. Payment Verification

```
✅ *Payment Verified*

Order ID: `ORD-2026-001`
Amount: 15,000 Birr
Verified by: Factory

Your order is now confirmed and will be processed.

🖼️ [Payment Slip Image Attached]
```

### 3. Order Dispatch

```
🚚 *Order Dispatched*

Order ID: `ORD-2026-001`
Expected Delivery: 2026-01-26

Please check the attached comprehensive report for full details.

📄 [Full Dispatch Report PDF Attached]
```

---

## 🔍 How to Get Telegram Channel ID

1. Create a Telegram channel for the shop
2. Add your bot to the channel as an administrator
3. Send any message to the channel
4. Forward that message to `@userinfobot`
5. The bot will reply with channel information including the ID
6. Copy the channel ID (starts with `-100`)
7. Paste it in the shop settings

**Example Channel ID**: `-1001234567890`

---

## 🎯 Implementation Priority

### High Priority (Do First)

1. ✅ Database schema updates (DONE)
2. ✅ Telegram library (DONE)
3. ✅ PDF generator (DONE)
4. ⏳ Order placement integration
5. ⏳ Payment verification integration
6. ⏳ Order dispatch integration

### Medium Priority (Do Next)

7. ⏳ Shop management UI updates
8. ⏳ Telegram settings page
9. ⏳ Test API route

### Low Priority (Nice to Have)

10. ⏳ Notification history viewer
11. ⏳ Retry failed notifications
12. ⏳ Notification statistics dashboard

---

## 💡 Pro Tips

1. **Test with One Shop First**: Configure Telegram for one shop and test thoroughly before rolling out to all shops

2. **Monitor Logs**: Check server logs for any Telegram errors, especially in the first few days

3. **Educate Shop Teams**: Make sure shop teams know they'll receive notifications in Telegram

4. **Bot Permissions**: Ensure bot has "Post Messages" permission in all channels

5. **PDF Cleanup**: Run the `cleanupOldPDFs()` function periodically (e.g., monthly) to save disk space

6. **Error Handling**: The system is designed to never fail order processing if Telegram fails - it just logs the error

---

## 🐛 Troubleshooting

### Issue: Notifications not sending

**Check**:

- Is TELEGRAM_ENABLED=true in .env?
- Is bot token correct?
- Does shop have telegram_channel_id set?
- Is bot admin in the channel?
- Check server logs for errors

### Issue: PDF not attached

**Check**:

- Does the PDF file exist in public/telegram-pdfs/?
- Check file permissions
- Check server logs for PDF generation errors

### Issue: Image not attached

**Check**:

- Does payment slip file exist?
- Is the path correct?
- Is the file format supported (PNG, JPG)?

---

## 📈 Estimated Timeline

| Task                             | Time        | Status           |
| -------------------------------- | ----------- | ---------------- |
| Database updates                 | 15 min      | ✅ DONE          |
| Telegram library                 | 30 min      | ✅ DONE          |
| PDF generator                    | 45 min      | ✅ DONE          |
| Order placement integration      | 15 min      | ⏳ TODO          |
| Payment verification integration | 15 min      | ⏳ TODO          |
| Order dispatch integration       | 15 min      | ⏳ TODO          |
| Shop UI updates                  | 30 min      | ⏳ TODO          |
| Telegram settings page           | 30 min      | ⏳ TODO          |
| Testing                          | 30 min      | ⏳ TODO          |
| **Total**                        | **3 hours** | **50% Complete** |

---

## 🎉 What's Working Now

- ✅ Database schema ready
- ✅ Telegram bot integration ready
- ✅ PDF generation ready
- ✅ Notification logging ready
- ✅ Error handling in place
- ✅ Multi-shop support ready

---

## 🚀 Next Action

**Ready to continue implementation?**

I can now help you with:

1. Integrating the notifications into the order workflow
2. Creating the shop management UI updates
3. Building the Telegram settings page
4. Testing the complete flow

Just let me know which part you'd like me to implement next!

---

**Last Updated**: 2026-01-24  
**Status**: 50% Complete - Core infrastructure ready  
**Next Step**: Integrate with order workflow
