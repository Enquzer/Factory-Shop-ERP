# Owner KPI & Reporting Dashboard

## Overview
The Owner KPI Dashboard provides comprehensive business insights for factory owners and executives. It offers real-time visibility into key performance indicators across sales, production, inventory, and shop performance.

## Features

### 1. Core KPIs Overview
- **Total Sales Value**: Sum of all order values in selected period
- **Total Orders**: Count of orders placed
- **Units Produced**: Total quantity produced in the factory
- **Active Shops**: Number of currently operating retail shops
- **Average Order Value (AOV)**: Total sales divided by total orders
- **Units per Transaction (UPT)**: Average number of units per order
- **Customer Retention Rate**: Percentage of shops that repeatedly purchase
- **Order Fulfillment Rate**: Percentage of orders delivered successfully
- **On-Time Delivery Rate**: Efficiency in meeting delivery promises
- **Marketing Order Completion Rate**: Marketing production order execution ratio
- **Best Selling Product**: Most popular product by quantity sold
- **Top Performing Shop**: Shop generating the highest total purchase
- **Sales Growth % (MoM)**: Month-to-month revenue growth

### 2. Inventory & Stock KPIs
- **Total Stock (Quantity)**: Total pieces in inventory
- **Total Stock (Value)**: Monetary value of current stock
- **Low Stock Alerts**: Items requiring replenishment
- **Stock by Category**: Inventory value split by product line

### 3. Production & Marketing Order KPIs
- **Production Efficiency**: (Completed Units / Planned Units) × 100
- **Marketing Order Completion Rate**: (Completed Marketing Orders / Total Marketing Orders) × 100

### 4. Shop Performance & Sales KPIs
- **Shop Ranking**: Shops ranked by total sales value
- **Top Performing Shops**: Top 10 shops by sales performance

### 5. Data Visualization
- **Monthly Sales Growth**: Line chart showing sales trends
- **Shop Performance**: Pie chart of top-performing shops
- **Product Category Contribution**: Pie chart of sales by category
- **Stock by Category**: Bar chart of inventory value by category

### 6. Filtering Capabilities
- **Date Range Selector**: Default current month, customizable range
- **Shop Selector**: Filter by specific shop
- **Product Category Filter**: Filter by product category
- **Region Filter**: Filter by region (Addis Ababa, Dire Dawa, Adama)
- **Order Status Filter**: Filter by order status (Pending, Paid, Dispatched, etc.)

### 7. Export & Reporting
- **PDF Export**: Generate comprehensive PDF reports with all KPIs
- **Report Title**: "Owner KPI Dashboard – CAREMENT ERP"
- **Logo Inclusion**: Company branding in reports
- **Filters Display**: Shows applied filters in the report
- **Timestamp**: Report generation date and time

### 8. AI Insights
- **Natural Language Queries**: Ask questions in plain English
- **Business Insights**: AI-powered analysis and recommendations
- **Sample Prompts**:
  - "Show me which shop bought the most men's products last quarter."
  - "Compare on-time delivery rate between this month and last month."
  - "List all products sent to Jemo Branch in the last 30 days."
  - "Show me the most delayed production orders."
  - "How many unique products were ordered by shops this quarter?"

## Technical Implementation

### API Endpoints
- `GET /api/reports/owner-kpis`: Fetch all owner KPIs with optional filters

### Data Sources
- Orders database
- Products database
- Shops database
- Marketing orders database
- Inventory data

### Authentication
- Factory users only (role-based access control)

### Libraries Used
- Recharts for data visualization
- jsPDF for PDF generation
- Genkit AI for natural language processing