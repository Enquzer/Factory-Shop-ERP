// Help documentation data structure with role-based access control

export type HelpDocument = {
  id: string;
  title: string;
  category: string;
  content: string;
  roles: ('factory' | 'shop' | 'all')[];
  tags: string[];
};

export type HelpCategory = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of using the system',
    icon: '📘'
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'Managing orders and production tracking',
    icon: '📋'
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Tracking and managing inventory',
    icon: '📦'
  },
  {
    id: 'products',
    title: 'Products',
    description: 'Product management and catalog',
    icon: '🏷️'
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Generating reports and analyzing data',
    icon: '📊'
  },
  {
    id: 'profile',
    title: 'Profile & Settings',
    description: 'Managing your profile and preferences',
    icon: '👤'
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and solutions',
    icon: '🔧'
  }
];

export const helpDocuments: HelpDocument[] = [
  // Factory User Documentation
  {
    id: 'factory-dashboard',
    title: 'Factory Dashboard Overview',
    category: 'getting-started',
    content: `
## Factory Dashboard Overview

The Factory Dashboard is your central hub for managing all production activities. Here you can:

### Key Features:
- View real-time production metrics
- Monitor order status and progress
- Track inventory levels
- Access quick actions for common tasks

### Dashboard Components:
1. **Production Summary** - Shows overall production performance
2. **Recent Orders** - Lists the most recent marketing orders
3. **Inventory Alerts** - Highlights low stock items that need attention
4. **Upcoming Deliveries** - Shows orders scheduled for delivery

### Quick Actions:
- Create New Order: Start a new marketing order
- View Products: Access the product catalog
- Check Inventory: Review current stock levels
- Generate Reports: Create production and inventory reports
    `,
    roles: ['factory'],
    tags: ['dashboard', 'overview', 'metrics']
  },
  {
    id: 'system-logic',
    title: 'Verified Workflow Logic',
    category: 'getting-started',
    content: `
## Verified Workflow Logic

This section explains the core inventory and purchase logic of the system to ensure smooth operations between the factory and shops.

### Initial Inventory
When you register a new product, the initial stock levels for each variant (color/size) are correctly stored in the factory's database (\`product_variants.stock\`).

### Marketing Order Completion
When a marketing order is marked as **isCompleted**:
- The system automatically identifies the product and its variants.
- It increases the factory stock by the quantities produced in that order.
- If a variant doesn't exist yet, it creates it automatically.

### Shop Order Placement
When a shop places an order:
- The system checks if the factory has enough stock.
- If stock is available, it allows the order to be placed as **Pending**.
- **Note**: At this stage, factory stock is not yet decreased (it acts as a request).

### Shop Order Delivery/Confirmation
When the order is marked as **Delivered** or **Closed** (received by shop):
- The factory inventory for those specific items is decreased.
- The shop's personal inventory (\`shop_inventory\`) is increased by the same amount.
- If the shop didn't have that product in their inventory before, the system adds it automatically.

### 🧪 Verification Results
The inventory and purchase logic has been verified through automated testing:
- Production increases factory stock correctly.
- Shop orders prevent over-ordering based on factory availability.
- Order delivery correctly handles the transfer of stock from factory to shop.
    `,
    roles: ['all'],
    tags: ['logic', 'inventory', 'workflow', 'automation']
  },
  {
    id: 'factory-marketing-orders',
    title: 'Managing Marketing Orders',
    category: 'orders',
    content: `
## Managing Marketing Orders

Marketing orders represent production requests from the marketing department. As a factory user, you are responsible for tracking and fulfilling these orders.

### Creating a New Marketing Order:
1. Navigate to Marketing Orders section
2. Click "Create New Order"
3. Fill in order details:
   - Product Name and Code
   - Total Quantity
   - Order Placement Date
   - Planned Delivery Date
   - Item breakdown (size/color combinations)
4. Submit the order

### Tracking Order Progress:
Each order goes through several production stages:
1. **Placed Order** - Initial order creation
2. **Cutting** - Fabric cutting process
3. **Production** - Manufacturing process
4. **Packing** - Packaging completed items
5. **Delivery** - Shipment to destination
6. **Completed** - Order fulfillment complete

### Updating Daily Production Status:
1. Open an order details view
2. Select "Daily Production Status" tab
3. Choose update mode:
   - Size/Color Breakdown: Update specific item quantities
   - Total Quantity: Update overall progress
4. Select Process Stage (Cutting, Production, Packing, Delivery)
5. Enter produced quantities
6. Save updates

### Process Completion Tracking:
The system automatically tracks completion dates for each process stage:
- When a stage is marked as "Completed", the completion date is recorded
- Completion dates are visible in the order summary
- Helps with production analysis and planning
    `,
    roles: ['factory'],
    tags: ['orders', 'production', 'tracking']
  },
  {
    id: 'factory-production-tracking',
    title: 'Production Tracking and Reporting',
    category: 'reports',
    content: `
## Production Tracking and Reporting

The system provides comprehensive production tracking and reporting capabilities to help you monitor performance and make data-driven decisions.

### Daily Production Updates:
- Record production progress daily for each order
- Track progress by process stage (Cutting, Production, Packing, Delivery)
- View production charts showing progress over time
- Compare planned vs actual production quantities

### Process Status Monitoring:
- Real-time status display for each production stage
- Color-coded indicators (Green=Completed, Yellow=Partial, Gray=Pending)
- Percentage completion for partially completed stages
- Automatic recording of completion dates

### Reports and Analytics:
1. **Production Reports**:
   - Summary reports of all marketing orders
   - Detailed production progress reports
   - Export reports to PDF for sharing

2. **Dashboard Analytics**:
   - Production performance metrics
   - Order completion rates
   - Inventory turnover analysis

3. **Order Tracking**:
   - Gantt chart timeline view
   - Production progress visualization
   - Completion date predictions

### Exporting Data:
- Export order details to PDF
- Generate summary reports
- Download production data for external analysis
    `,
    roles: ['factory'],
    tags: ['production', 'tracking', 'reports', 'analytics']
  },
  {
    id: 'factory-inventory-management',
    title: 'Factory Inventory Management',
    category: 'inventory',
    content: `
## Factory Inventory Management

Manage factory inventory to ensure smooth production operations and accurate stock tracking.

### Inventory Overview:
- View current stock levels for all products
- Monitor low stock alerts
- Track inventory movements and adjustments
- Manage product variants (sizes and colors)

### Managing Stock Levels:
1. **Adding New Products**:
   - Register new products during order creation
   - Set minimum stock levels
   - Define product categories and pricing

2. **Updating Stock**:
   - Adjust stock levels manually when needed
   - Track inventory changes with audit logs
   - Receive notifications for low stock items

3. **Inventory Reports**:
   - Generate stock level reports
   - Export inventory data to PDF
   - Analyze inventory turnover rates

### Low Stock Alerts:
- Automatic notifications when stock falls below minimum levels
- Priority highlighting for critical items
- Quick reorder recommendations
    `,
    roles: ['factory'],
    tags: ['inventory', 'stock', 'management']
  },

  // Shop User Documentation
  {
    id: 'shop-dashboard',
    title: 'Shop Dashboard Overview',
    category: 'getting-started',
    content: `
## Shop Dashboard Overview

The Shop Dashboard is your central hub for managing shop operations. Here you can:

### Key Features:
- View shop performance metrics
- Monitor order status
- Track inventory levels
- Access quick actions for common tasks

### Dashboard Components:
1. **Sales Summary** - Shows overall sales performance
2. **Recent Orders** - Lists the most recent orders
3. **Inventory Alerts** - Highlights low stock items that need attention
4. **Popular Products** - Shows best-selling items

### Quick Actions:
- Create New Order: Start a new customer order
- View Products: Access the product catalog
- Check Inventory: Review current stock levels
- View Analytics: Analyze sales performance
    `,
    roles: ['shop'],
    tags: ['dashboard', 'overview', 'metrics']
  },
  {
    id: 'shop-orders',
    title: 'Managing Shop Orders',
    category: 'orders',
    content: `
## Managing Shop Orders

Shop orders represent customer purchases that you fulfill using factory inventory.

### Creating a New Order:
1. Navigate to "Create Order" section
2. Search for products by name or code
3. Add items to your order:
   - Select size and color variants
   - Enter quantities
   - Add multiple items as needed
4. Review order summary
5. Submit the order

### Order Status Tracking:
Each order goes through several fulfillment stages:
1. **Pending** - Order created but not processed
2. **Processing** - Order being prepared
3. **Ready for Pickup** - Order prepared and waiting
4. **Completed** - Order fulfilled and collected
5. **Cancelled** - Order cancelled

### Managing Your Order Cart:
- Add/remove items before submission
- Adjust quantities as needed
- View real-time total calculations
- Save orders as drafts for later completion
    `,
    roles: ['shop'],
    tags: ['orders', 'sales', 'tracking']
  },
  {
    id: 'shop-inventory',
    title: 'Shop Inventory Management',
    category: 'inventory',
    content: `
## Shop Inventory Management

Manage your shop's inventory to ensure you can fulfill customer orders and track stock levels.

### Inventory Overview:
- View current stock levels for all products
- Monitor low stock alerts
- Track inventory movements and adjustments
- Manage product variants (sizes and colors)

### Checking Stock Availability:
1. **Product Search**:
   - Search by product name or code
   - Filter by category or size/color
   - View detailed product information

2. **Stock Status**:
   - Real-time stock levels
   - Variant-specific availability
   - Low stock warnings

3. **Inventory Reports**:
   - Generate stock level reports
   - Export inventory data to PDF
   - Analyze sales vs stock levels

### Low Stock Alerts:
- Automatic notifications when stock falls below minimum levels
- Priority highlighting for critical items
- Quick reorder recommendations
    `,
    roles: ['shop'],
    tags: ['inventory', 'stock', 'management']
  },
  {
    id: 'shop-analytics',
    title: 'Shop Analytics and Reporting',
    category: 'reports',
    content: `
## Shop Analytics and Reporting

Analyze your shop's performance with comprehensive analytics and reporting tools.

### Sales Analytics:
- View sales trends over time
- Analyze best-selling products
- Track revenue by product category
- Compare performance across different periods

### Inventory Analytics:
- Monitor stock turnover rates
- Identify slow-moving products
- Track inventory value
- Analyze stockout frequency

### Customer Insights:
- View customer purchase patterns
- Identify popular product combinations
- Track customer retention metrics
- Analyze seasonal trends

### Exporting Reports:
- Export sales reports to PDF
- Generate inventory analysis reports
- Share performance data with stakeholders
    `,
    roles: ['shop'],
    tags: ['analytics', 'reports', 'performance']
  },

  // Common Documentation (for both roles)
  {
    id: 'user-profile',
    title: 'Managing Your User Profile',
    category: 'profile',
    content: `
## Managing Your User Profile

Customize your account settings and manage your profile information.

### Profile Information:
- Update your personal details
- Change your profile picture
- Set notification preferences
- Manage security settings

### Notification Settings:
- Configure email notifications
- Set up mobile alerts
- Customize notification frequency
- Manage notification types

### Security:
- Change your password
- Enable two-factor authentication
- Review login history
- Manage active sessions

### Preferences:
- Set default views and filters
- Customize dashboard layout
- Choose theme preferences
- Set language preferences
    `,
    roles: ['all'],
    tags: ['profile', 'settings', 'security']
  },
  {
    id: 'faq-general',
    title: 'General FAQ',
    category: 'troubleshooting',
    content: `
## General FAQ

### How do I reset my password?
If you've forgotten your password:
1. Go to the login page
2. Click "Forgot Password"
3. Enter your username or email
4. Follow the password reset instructions sent to your email

### How do I update my profile information?
1. Click on your profile icon in the top right corner
2. Select "Profile" from the dropdown menu
3. Update your information in the profile form
4. Click "Save Changes"

### How do I export reports?
1. Navigate to the Reports section
2. Select the report type you want to export
3. Apply any filters or date ranges
4. Click the "Export to PDF" button

### How do I get help with a specific feature?
1. Click on the Help icon in the header
2. Browse documentation by category
3. Use the search function to find specific topics
4. Contact support if you can't find what you need
    `,
    roles: ['all'],
    tags: ['faq', 'help', 'support']
  }
];