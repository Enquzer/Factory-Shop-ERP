# Shop-Specific Telegram Channel Integration

## 🎯 Requirement Summary

### Use Case

Each shop has a dedicated Telegram channel where their team receives automated notifications with PDF reports at key order milestones:

1. **Order Placed** → PDF with order details, timestamp, order sequence number
2. **Payment Verified** → Notification with payment slip image
3. **Order Dispatched** → Comprehensive PDF report with full order details, payment slip, summary

### Key Features

- ✅ One Telegram channel per shop
- ✅ Factory admin configures channel ID for each shop
- ✅ Automated PDF generation at each milestone
- ✅ Multi-shop support
- ✅ Team members already added to channels by shop

---

## 📊 Architecture Overview

```
Shop Places Order
       ↓
System Generates PDF
       ↓
Send to Shop's Telegram Channel
       ↓
Team Members Notified
```

### Milestones & Notifications

| Milestone            | Trigger                  | Content                              | Format       |
| -------------------- | ------------------------ | ------------------------------------ | ------------ |
| **Order Placed**     | Shop submits order       | Order details, timestamp, sequence # | PDF          |
| **Payment Verified** | Factory verifies payment | Confirmation + payment slip          | Image + Text |
| **Order Dispatched** | Store dispatches order   | Full report + summary                | PDF          |

---

## 🗄️ Database Modifications

### 1. Add Telegram Channel Field to Shops Table

```sql
-- Add telegram_channel_id column to shops table
ALTER TABLE shops ADD COLUMN telegram_channel_id TEXT;
```

**Field Details**:

- **Column**: `telegram_channel_id`
- **Type**: TEXT
- **Nullable**: Yes (optional, shop may not have Telegram)
- **Format**: `-100XXXXXXXXXX` (Telegram channel ID format)
- **Example**: `-1001234567890`

### 2. Create Telegram Notification Log Table

```sql
CREATE TABLE IF NOT EXISTS shop_telegram_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId TEXT NOT NULL,
  shopId TEXT NOT NULL,
  channelId TEXT NOT NULL,
  messageType TEXT NOT NULL, -- 'order_placed', 'payment_verified', 'order_dispatched'
  messageId TEXT,
  pdfUrl TEXT,
  imageUrl TEXT,
  status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
  errorMessage TEXT,
  sentAt DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orderId) REFERENCES orders (id),
  FOREIGN KEY (shopId) REFERENCES shops (id)
);
```

---

## 🔧 Implementation Steps

### Step 1: Install Dependencies (5 minutes)

```bash
npm install node-telegram-bot-api
npm install --save-dev @types/node-telegram-bot-api
```

### Step 2: Update Environment Variables (2 minutes)

Add to `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ENABLED=true
```

### Step 3: Update Database Schema (10 minutes)

File: `src/lib/db.ts`

Add to `initializeDatabase()` function:

```typescript
// Add telegram_channel_id to shops table
try {
  await database.exec(`
    ALTER TABLE shops ADD COLUMN telegram_channel_id TEXT
  `);
} catch (error) {
  console.log(
    "telegram_channel_id column already exists or was added successfully",
  );
}

// Create shop telegram notifications log table
await database.exec(`
  CREATE TABLE IF NOT EXISTS shop_telegram_notifications (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES orders (id),
    FOREIGN KEY (shopId) REFERENCES shops (id)
  )
`);
```

### Step 4: Create Telegram Library (30 minutes)

File: `src/lib/telegram-shop-notifications.ts`

```typescript
import TelegramBot from "node-telegram-bot-api";
import { getDb } from "./db";
import fs from "fs";
import path from "path";

// Initialize bot (only on server side)
let bot: TelegramBot | null = null;

if (typeof window === "undefined" && process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
}

export type TelegramMessageType =
  | "order_placed"
  | "payment_verified"
  | "order_dispatched";

/**
 * Send order notification to shop's Telegram channel
 */
export async function sendShopOrderNotification(
  orderId: string,
  shopId: string,
  messageType: TelegramMessageType,
  options: {
    pdfPath?: string;
    imagePath?: string;
    caption?: string;
    additionalText?: string;
  },
): Promise<boolean> {
  if (!bot || !process.env.TELEGRAM_ENABLED) {
    console.log("Telegram bot not enabled or not configured");
    return false;
  }

  try {
    const db = await getDb();

    // Get shop's telegram channel ID
    const shop = await db.get(
      "SELECT telegram_channel_id, name FROM shops WHERE id = ?",
      shopId,
    );

    if (!shop || !shop.telegram_channel_id) {
      console.log(`Shop ${shopId} does not have a Telegram channel configured`);
      return false;
    }

    const channelId = shop.telegram_channel_id;
    let messageId: string | undefined;
    let status = "sent";
    let errorMessage: string | undefined;

    try {
      // Send based on message type
      if (messageType === "order_placed" && options.pdfPath) {
        // Send PDF document
        const message = await bot.sendDocument(channelId, options.pdfPath, {
          caption:
            options.caption ||
            `📋 New Order #${orderId}\n\n${options.additionalText || ""}`,
          parse_mode: "Markdown",
        });
        messageId = message.message_id.toString();
      } else if (messageType === "payment_verified" && options.imagePath) {
        // Send payment slip image
        const message = await bot.sendPhoto(channelId, options.imagePath, {
          caption:
            options.caption ||
            `✅ Payment Verified for Order #${orderId}\n\n${options.additionalText || ""}`,
          parse_mode: "Markdown",
        });
        messageId = message.message_id.toString();
      } else if (messageType === "order_dispatched" && options.pdfPath) {
        // Send comprehensive dispatch report
        const message = await bot.sendDocument(channelId, options.pdfPath, {
          caption:
            options.caption ||
            `🚚 Order Dispatched #${orderId}\n\n${options.additionalText || ""}`,
          parse_mode: "Markdown",
        });
        messageId = message.message_id.toString();
      } else {
        // Send text message only
        const message = await bot.sendMessage(
          channelId,
          options.caption ||
            `Order #${orderId} - ${messageType}\n\n${options.additionalText || ""}`,
          { parse_mode: "Markdown" },
        );
        messageId = message.message_id.toString();
      }
    } catch (sendError: any) {
      status = "failed";
      errorMessage = sendError.message;
      console.error("Error sending Telegram message:", sendError);
    }

    // Log the notification
    await db.run(
      `
      INSERT INTO shop_telegram_notifications (
        orderId, shopId, channelId, messageType, messageId, 
        pdfUrl, imageUrl, status, errorMessage, sentAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
      [
        orderId,
        shopId,
        channelId,
        messageType,
        messageId || null,
        options.pdfPath || null,
        options.imagePath || null,
        status,
        errorMessage || null,
      ],
    );

    return status === "sent";
  } catch (error) {
    console.error("Error in sendShopOrderNotification:", error);
    return false;
  }
}

/**
 * Get notification history for an order
 */
export async function getOrderTelegramHistory(orderId: string) {
  const db = await getDb();
  return await db.all(
    "SELECT * FROM shop_telegram_notifications WHERE orderId = ? ORDER BY created_at DESC",
    orderId,
  );
}

/**
 * Get notification history for a shop
 */
export async function getShopTelegramHistory(shopId: string) {
  const db = await getDb();
  return await db.all(
    "SELECT * FROM shop_telegram_notifications WHERE shopId = ? ORDER BY created_at DESC",
    shopId,
  );
}
```

### Step 5: Create PDF Generation Functions (45 minutes)

File: `src/lib/shop-order-pdf-generator.ts`

```typescript
import { getDb } from "./db";
import fs from "fs";
import path from "path";

/**
 * Generate Order Placement PDF
 */
export async function generateOrderPlacementPDF(
  orderId: string,
): Promise<string> {
  const db = await getDb();

  // Get order details
  const order = await db.get("SELECT * FROM orders WHERE id = ?", orderId);
  if (!order) throw new Error("Order not found");

  // Get order items
  const items = JSON.parse(order.items);

  // Get shop details
  const shop = await db.get("SELECT * FROM shops WHERE id = ?", order.shopId);

  // Generate order sequence number (count of orders for this shop)
  const orderCount = await db.get(
    "SELECT COUNT(*) as count FROM orders WHERE shopId = ? AND created_at <= ?",
    [order.shopId, order.created_at],
  );
  const sequenceNumber = orderCount.count;

  // Create PDF content (simplified - you can enhance this)
  const pdfContent = `
    ═══════════════════════════════════════
    📋 ORDER PLACEMENT CONFIRMATION
    ═══════════════════════════════════════
    
    Order ID: ${orderId}
    Order Sequence: #${sequenceNumber}
    Shop: ${shop.name}
    Date: ${new Date(order.created_at).toLocaleString()}
    
    ───────────────────────────────────────
    ORDER DETAILS
    ───────────────────────────────────────
    
    ${items
      .map(
        (item: any, index: number) => `
    ${index + 1}. ${item.name}
       Color: ${item.color}
       Size: ${item.size}
       Quantity: ${item.quantity}
       Price: ${item.price} Birr
       Subtotal: ${item.quantity * item.price} Birr
    `,
      )
      .join("\n")}
    
    ───────────────────────────────────────
    SUMMARY
    ───────────────────────────────────────
    
    Total Items: ${items.length}
    Total Quantity: ${items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
    Total Amount: ${order.amount} Birr
    
    Status: ${order.status}
    
    ═══════════════════════════════════════
    Generated: ${new Date().toLocaleString()}
    ═══════════════════════════════════════
  `;

  // Save to file (in production, use a proper PDF library like pdfkit or puppeteer)
  const pdfDir = path.join(process.cwd(), "public", "order-pdfs");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const pdfPath = path.join(pdfDir, `order-${orderId}-placement.txt`);
  fs.writeFileSync(pdfPath, pdfContent);

  return pdfPath;
}

/**
 * Generate Order Dispatch PDF with full details
 */
export async function generateOrderDispatchPDF(
  orderId: string,
): Promise<string> {
  const db = await getDb();

  // Get order details
  const order = await db.get("SELECT * FROM orders WHERE id = ?", orderId);
  if (!order) throw new Error("Order not found");

  // Get order items
  const items = JSON.parse(order.items);

  // Get shop details
  const shop = await db.get("SELECT * FROM shops WHERE id = ?", order.shopId);

  // Parse dispatch info
  const dispatchInfo = order.dispatchInfo ? JSON.parse(order.dispatchInfo) : {};

  // Calculate summary
  const uniqueStyles = new Set(items.map((item: any) => item.name)).size;
  const totalQty = items.reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );
  const totalValue = order.amount;

  // Create comprehensive PDF content
  const pdfContent = `
    ═══════════════════════════════════════
    🚚 ORDER DISPATCH REPORT
    ═══════════════════════════════════════
    
    Order ID: ${orderId}
    Shop: ${shop.name}
    Contact: ${shop.contactPerson}
    Phone: ${shop.contactPhone || "N/A"}
    Location: ${shop.exactLocation}, ${shop.city}
    
    ───────────────────────────────────────
    ORDER TIMELINE
    ───────────────────────────────────────
    
    Order Placed: ${new Date(order.created_at).toLocaleString()}
    Payment Verified: ${order.confirmationDate ? new Date(order.confirmationDate).toLocaleString() : "N/A"}
    Dispatched: ${order.actualDispatchDate ? new Date(order.actualDispatchDate).toLocaleString() : new Date().toLocaleString()}
    Expected Delivery: ${order.deliveryDate || "N/A"}
    
    ───────────────────────────────────────
    DISPATCH DETAILS
    ───────────────────────────────────────
    
    Dispatch Method: ${dispatchInfo.method || "N/A"}
    Vehicle/Courier: ${dispatchInfo.vehicle || "N/A"}
    Driver/Contact: ${dispatchInfo.driver || "N/A"}
    Tracking Number: ${dispatchInfo.trackingNumber || "N/A"}
    
    ───────────────────────────────────────
    ORDER ITEMS
    ───────────────────────────────────────
    
    ${items
      .map(
        (item: any, index: number) => `
    ${index + 1}. ${item.name}
       Color: ${item.color}
       Size: ${item.size}
       Quantity: ${item.quantity}
       Unit Price: ${item.price} Birr
       Subtotal: ${item.quantity * item.price} Birr
    `,
      )
      .join("\n")}
    
    ───────────────────────────────────────
    ORDER SUMMARY
    ───────────────────────────────────────
    
    Total Unique Styles: ${uniqueStyles}
    Total Quantity: ${totalQty} pieces
    Total Value: ${totalValue} Birr
    
    Discount Applied: ${shop.discount}%
    Final Amount: ${totalValue} Birr
    
    ───────────────────────────────────────
    PAYMENT INFORMATION
    ───────────────────────────────────────
    
    Payment Status: ${order.status}
    Payment Slip: ${order.paymentSlipUrl ? "Attached" : "Not Available"}
    
    ═══════════════════════════════════════
    Generated: ${new Date().toLocaleString()}
    Factory-Shop ERP System
    ═══════════════════════════════════════
  `;

  // Save to file
  const pdfDir = path.join(process.cwd(), "public", "order-pdfs");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const pdfPath = path.join(pdfDir, `order-${orderId}-dispatch.txt`);
  fs.writeFileSync(pdfPath, pdfContent);

  return pdfPath;
}
```

### Step 6: Integrate with Order Workflow (30 minutes)

#### 6.1 Order Placement Notification

File: `src/app/api/orders/route.ts`

Add after order creation (around line 200):

```typescript
import { sendShopOrderNotification } from "@/lib/telegram-shop-notifications";
import { generateOrderPlacementPDF } from "@/lib/shop-order-pdf-generator";

// After order is created successfully
try {
  // Generate PDF
  const pdfPath = await generateOrderPlacementPDF(orderId);

  // Send to Telegram channel
  await sendShopOrderNotification(orderId, shopId, "order_placed", {
    pdfPath,
    caption: `📋 *New Order Received*\n\nOrder ID: \`${orderId}\`\nShop: ${shopName}\nAmount: ${totalAmount} Birr`,
    additionalText: `Total Items: ${items.length}\nStatus: Pending Verification`,
  });
} catch (telegramError) {
  console.error("Error sending Telegram notification:", telegramError);
  // Don't fail the order creation if Telegram fails
}
```

#### 6.2 Payment Verification Notification

File: `src/app/api/orders/[id]/payment-verify/route.ts`

Add after payment verification:

```typescript
import { sendShopOrderNotification } from "@/lib/telegram-shop-notifications";

// After payment is verified
try {
  // Send notification with payment slip
  await sendShopOrderNotification(id, order.shopId, "payment_verified", {
    imagePath: order.paymentSlipUrl
      ? path.join(process.cwd(), "public", order.paymentSlipUrl)
      : undefined,
    caption: `✅ *Payment Verified*\n\nOrder ID: \`${id}\`\nAmount: ${order.amount} Birr\nVerified by: Factory`,
    additionalText: `Your order is now confirmed and will be processed.`,
  });
} catch (telegramError) {
  console.error("Error sending Telegram notification:", telegramError);
}
```

#### 6.3 Order Dispatch Notification

File: `src/app/api/orders/[id]/dispatch/route.ts`

Add after dispatch:

```typescript
import { sendShopOrderNotification } from "@/lib/telegram-shop-notifications";
import { generateOrderDispatchPDF } from "@/lib/shop-order-pdf-generator";

// After order is dispatched
try {
  // Generate comprehensive dispatch PDF
  const pdfPath = await generateOrderDispatchPDF(id);

  // Send to Telegram channel
  await sendShopOrderNotification(id, order.shopId, "order_dispatched", {
    pdfPath,
    caption: `🚚 *Order Dispatched*\n\nOrder ID: \`${id}\`\nExpected Delivery: ${deliveryDate}`,
    additionalText: `Please check the attached comprehensive report for full details.`,
  });
} catch (telegramError) {
  console.error("Error sending Telegram notification:", telegramError);
}
```

### Step 7: Update Shop Management UI (20 minutes)

File: `src/app/(app)/shops/page.tsx` (or wherever shops are managed)

Add Telegram Channel ID field to shop creation/edit form:

```typescript
// Add to form state
const [telegramChannelId, setTelegramChannelId] = useState('');

// Add to form JSX
<div>
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

// Add to form submission
const shopData = {
  // ... existing fields
  telegram_channel_id: telegramChannelId || null
};
```

### Step 8: Create Admin Settings Page (15 minutes)

File: `src/app/(app)/settings/telegram/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function TelegramSettingsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const response = await fetch('/api/shops');
    const data = await response.json();
    setShops(data);
    setLoading(false);
  };

  const updateChannelId = async (shopId: string, channelId: string) => {
    await fetch(`/api/shops/${shopId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_channel_id: channelId })
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Telegram Channel Settings</h1>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Shop Name</th>
              <th className="px-6 py-3 text-left">Telegram Channel ID</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop: any) => (
              <tr key={shop.id} className="border-t">
                <td className="px-6 py-4">{shop.name}</td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    defaultValue={shop.telegram_channel_id || ''}
                    placeholder="-1001234567890"
                    className="px-3 py-1 border rounded"
                    onBlur={(e) => updateChannelId(shop.id, e.target.value)}
                  />
                </td>
                <td className="px-6 py-4">
                  {shop.telegram_channel_id ? (
                    <span className="text-green-600">✓ Configured</span>
                  ) : (
                    <span className="text-gray-400">Not Set</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:underline">
                    Test
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">How to get Telegram Channel ID:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Create a Telegram channel for the shop</li>
          <li>Add your bot to the channel as an administrator</li>
          <li>Forward any message from the channel to @userinfobot</li>
          <li>Copy the channel ID (starts with -100)</li>
          <li>Paste it here</li>
        </ol>
      </div>
    </div>
  );
}
```

---

## 📝 Message Format Examples

### 1. Order Placement Message

```
📋 *New Order Received*

Order ID: `ORD-2026-001`
Shop: ABC Fashion Store
Amount: 15,000 Birr

Total Items: 5
Status: Pending Verification

📄 [Order Details PDF Attached]

⏰ 2026-01-24 15:45:30
```

### 2. Payment Verification Message

```
✅ *Payment Verified*

Order ID: `ORD-2026-001`
Amount: 15,000 Birr
Verified by: Factory

Your order is now confirmed and will be processed.

🖼️ [Payment Slip Image Attached]

⏰ 2026-01-24 16:30:15
```

### 3. Order Dispatch Message

```
🚚 *Order Dispatched*

Order ID: `ORD-2026-001`
Expected Delivery: 2026-01-26

📊 Order Summary:
• Unique Styles: 3
• Total Quantity: 45 pieces
• Total Value: 15,000 Birr

Please check the attached comprehensive report for full details.

📄 [Full Dispatch Report PDF Attached]

⏰ 2026-01-25 10:00:00
```

---

## 🔍 Testing Checklist

### Setup Testing

- [ ] Bot token configured in .env
- [ ] Database tables created successfully
- [ ] Shop has telegram_channel_id set
- [ ] Bot is admin in the channel

### Functionality Testing

- [ ] Order placement sends PDF to channel
- [ ] Payment verification sends image to channel
- [ ] Order dispatch sends comprehensive PDF
- [ ] Multiple shops work independently
- [ ] Error handling works (channel not found, etc.)

### PDF Testing

- [ ] Order placement PDF contains all details
- [ ] Dispatch PDF includes payment slip reference
- [ ] Summary calculations are correct
- [ ] Timestamps are accurate

---

## 🚀 Deployment Steps

1. **Create Telegram Bot**
   - Open Telegram, search @BotFather
   - Send `/newbot`
   - Name it "Carement Order Bot"
   - Save the token

2. **Set Up Channels**
   - Create a channel for each shop
   - Add bot as administrator
   - Get channel ID using @userinfobot

3. **Configure System**
   - Add bot token to .env
   - Run database migrations
   - Configure channel IDs for each shop

4. **Test**
   - Place a test order
   - Verify PDF is sent to channel
   - Check all team members receive notification

5. **Go Live**
   - Enable for all shops
   - Monitor for errors
   - Gather feedback

---

## 💡 Pro Tips

1. **Use Proper PDF Library**: Replace text files with actual PDFs using `pdfkit` or `puppeteer`
2. **Add Inline Buttons**: Add "View in ERP" button to messages
3. **Error Notifications**: Send admin alerts if channel delivery fails
4. **Batch Processing**: Queue messages if sending to many channels
5. **Rich Formatting**: Use Telegram's markdown for better readability

---

## 📊 Estimated Timeline

| Task                   | Time        | Complexity |
| ---------------------- | ----------- | ---------- |
| Database updates       | 15 min      | Low        |
| Telegram library       | 30 min      | Medium     |
| PDF generation         | 45 min      | Medium     |
| Integration (3 points) | 45 min      | Medium     |
| UI updates             | 30 min      | Low        |
| Testing                | 30 min      | Low        |
| **Total**              | **3 hours** | **Medium** |

---

**Ready to implement? Let me know and I'll start creating the code files!** 🚀
