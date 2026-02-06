import { getDb, resetDbCache } from './db';

export type MarketingOrderStatus = 
  'Placed Order' | 
  'Planning' |
  'Sample Making' |
  'Cutting' | 
  'Sewing' | 
  'Finishing' |
  'Quality Inspection' |
  'Packing' | 
  'Store' |
  'Delivery' | 
  'Completed' |
  'Cancelled';

export type MarketingOrderItem = {
  id?: number;
  orderId: string;
  size: string;
  color: string;
  quantity: number;
};

export type MarketingOrderComponent = {
  id?: number;
  orderId: string;
  componentName: string;
  smv: number;
  manpower: number;
  sewingOutputPerDay: number;
  operationDays: number;
  efficiency: number;
  sewingStartDate?: string;
  sewingFinishDate?: string;
  cuttingStartDate?: string;
  cuttingFinishDate?: string;
  packingStartDate?: string;
  packingFinishDate?: string;
};

export type DailyProductionStatus = {
  id?: number;
  orderId: string;
  date: string;
  size: string;
  color: string;
  quantity: number;
  status: string;
  isTotalUpdate?: boolean;
  processStage?: string; // Add processStage field
  componentName?: string; // Add componentName field
};

export type MarketingOrder = {
  id: string;
  orderNumber: string;
  productName: string;
  productCode: string;
  mainCategory?: string;
  subCategory?: string;
  description?: string;
  quantity: number;
  status: MarketingOrderStatus;
  cuttingStatus?: string;
  sewingStatus?: string;
  finishingStatus?: string;
  qualityInspectionStatus?: 'Passed' | 'Failed' | 'Pending' | 'Approved' | 'Rejected' | 'Rework';
  qualityInspectionReportUrl?: string;
  packingStatus?: string;
  deliveryStatus?: string;
  assignedTo?: string;
  dueDate?: string;
  completedDate?: string;
  pdfUrl?: string;
  imageUrl?: string;
  isCompleted: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  orderPlacementDate?: string;
  plannedDeliveryDate?: string;
  sizeSetSampleApproved?: string;
  productionStartDate?: string;
  productionFinishedDate?: string;
  // Process completion dates
  planningCompletionDate?: string;
  sampleCompletionDate?: string;
  cuttingCompletionDate?: string;
  sewingCompletionDate?: string;
  finishingCompletionDate?: string;
  qualityInspectionCompletionDate?: string;
  packingCompletionDate?: string;
  deliveryCompletionDate?: string;
  
  // Gatekeeper and Sequencing
  isPlanningApproved?: boolean;
  priority?: number;
  qualityInspectionStage?: string;
  
  // Attachments
  ppmMeetingAttached?: string;
  sampleApprovalAttached?: string;
  cuttingQualityAttached?: string;
  
  items: MarketingOrderItem[];
  
  // Planning specific fields
  smv?: number;
  manpower?: number;
  sewingOutputPerDay?: number;
  operationDays?: number;
  sewingStartDate?: string;
  sewingFinishDate?: string;
  remarks?: string;
  piecesPerSet?: number;
  efficiency?: number;
  
  // Production Release Fields
  cuttingStartDate?: string;
  cuttingFinishDate?: string;
  packingStartDate?: string;
  packingFinishDate?: string;
  isNewProduct?: boolean;
  components?: MarketingOrderComponent[];
  styleComponents?: string; // JSON string from styles table
  isMaterialsConfirmed?: boolean;
  
  // Receiving voucher fields
  receivingVoucherPadNumber?: string;
  receivingVoucherSequence?: number;
  receivingVoucherPrefix?: string;
  receivingVoucherFormat?: string;
};

export type OperationBulletinItem = {
  id?: number;
  orderId?: string;
  productCode?: string;
  sequence: number;
  operationName: string;
  componentName?: string;
  machineType: string;
  smv: number;
  manpower: number;
  operatorId?: string;
  operatorName?: string;
};

export interface QualityInspection {
  id?: number;
  orderId: string;
  date: string;
  stage: 'Sample' | 'Order' | 'Inline-Cutting' | 'Inline-Sewing' | 'Final';
  size?: string;
  color?: string;
  quantityInspected: number;
  sampleSize?: number;
  totalCritical?: number;
  totalMajor?: number;
  totalMinor?: number;
  defectJson?: string; // Detailed breakdown of defects as JSON
  quantityPassed: number; // Also used as Approved
  quantityRejected: number;
  status: 'Passed' | 'Failed' | 'Approved' | 'Rejected' | 'Rework';
  reportUrl?: string;
  remarks?: string;
  inspectorId?: string;
  createdAt?: string;
}

// Client-side function to fetch marketing orders from API
export async function getMarketingOrders(): Promise<MarketingOrder[]> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders`
      : '/api/marketing-orders';
      
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
      
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch marketing orders');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching marketing orders:', error);
    return [];
  }
}

// Client-side function to get a specific marketing order by ID
export async function getMarketingOrderById(id: string): Promise<MarketingOrder | null> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/${id}`
      : `/api/marketing-orders/${id}`;
      
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
      
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching marketing order:', error);
    return null;
  }
}

// Client-side function to create a new marketing order
export async function createMarketingOrder(order: Omit<MarketingOrder, 'id' | 'createdAt' | 'updatedAt' | 'items'> & { items: Omit<MarketingOrderItem, 'id' | 'orderId'>[] } & { isNewProduct?: boolean, category?: string, price?: number, imageUrl?: string }): Promise<MarketingOrder> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders`
      : '/api/marketing-orders';
      
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(order),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'Failed to create marketing order');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating marketing order:', error);
    throw error;
  }
}

// Client-side function to update a marketing order
export async function updateMarketingOrder(id: string, order: Partial<MarketingOrder>): Promise<boolean> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/${id}`
      : `/api/marketing-orders/${id}`;
      
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(order),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error updating marketing order:', error);
    return false;
  }
}

// Client-side function to update a marketing order component (planning)
export async function updateMarketingOrderComponent(orderId: string, componentId: number, data: Partial<MarketingOrderComponent>): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/marketing-orders/${orderId}/components/${componentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error updating order component:', error);
    return false;
  }
}

/**
 * Client-side function to handover order to next department
 */
export async function handoverOrder(orderId: string, currentStatus: MarketingOrderStatus): Promise<boolean> {
  const processSequence: MarketingOrderStatus[] = [
    'Placed Order',
    'Planning',
    'Sample Making',
    'Cutting', 
    'Sewing', 
    'Finishing',
    'Quality Inspection',
    'Packing', 
    'Store',
    'Delivery',
    'Completed'
  ];
  
  const currentIndex = processSequence.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex >= processSequence.length - 1) return false;
  
  const nextStatus = processSequence[currentIndex + 1];
  
  const updates: Partial<MarketingOrder> = {
    status: nextStatus
  };
  
  // Specific completion dates
  if (currentStatus === 'Sewing') updates.sewingCompletionDate = new Date().toISOString().split('T')[0];
  if (currentStatus === 'Finishing') updates.finishingCompletionDate = new Date().toISOString().split('T')[0];
  if (currentStatus === 'Quality Inspection') updates.qualityInspectionCompletionDate = new Date().toISOString().split('T')[0];
  if (currentStatus === 'Packing') updates.packingCompletionDate = new Date().toISOString().split('T')[0];

  return await updateMarketingOrder(orderId, updates);
}

// Client-side function to delete a marketing order
export async function deleteMarketingOrder(id: string): Promise<boolean> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/${id}`
      : `/api/marketing-orders/${id}`;
      
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting marketing order:', error);
    return false;
  }
}

// Client-side function to get process status summary for an order
export async function getProcessStatusSummary(orderId: string): Promise<any[]> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/process-status/${orderId}`
      : `/api/marketing-orders/process-status/${orderId}`;
      
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching process status summary:', error);
    return [];
  }
}

// Server-side function to get all marketing orders from database
export async function getMarketingOrdersFromDB(): Promise<MarketingOrder[]> {
  try {
    const db = await getDb();
    const orders = await db.all(`
      SELECT mo.*, s.components as styleComponents 
      FROM marketing_orders mo
      LEFT JOIN styles s ON mo.productCode = s.number
      ORDER BY mo.createdAt DESC
    `);
    
    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await db.all(`
          SELECT * FROM marketing_order_items 
          WHERE orderId = ?
        `, order.id);
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          productName: order.productName,
          productCode: order.productCode,
          description: order.description,
          quantity: order.quantity,
          status: order.status,
          cuttingStatus: order.cuttingStatus,
          sewingStatus: order.sewingStatus,
          finishingStatus: order.finishingStatus,
          qualityInspectionStatus: order.qualityInspectionStatus,
          qualityInspectionStage: order.qualityInspectionStage,
          packingStatus: order.packingStatus,
          deliveryStatus: order.deliveryStatus,
          assignedTo: order.assignedTo,
          dueDate: order.dueDate,
          completedDate: order.completedDate,
          pdfUrl: order.pdfUrl,
          imageUrl: order.imageUrl,
          isCompleted: order.isCompleted === 1,
          createdBy: order.createdBy,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
          orderPlacementDate: order.orderPlacementDate,
          plannedDeliveryDate: order.plannedDeliveryDate,
          sizeSetSampleApproved: order.sizeSetSampleApproved,
          productionStartDate: order.productionStartDate,
          productionFinishedDate: order.productionFinishedDate,
          planningCompletionDate: order.planningCompletionDate,
          sampleCompletionDate: order.sampleCompletionDate,
          cuttingCompletionDate: order.cuttingCompletionDate,
          sewingCompletionDate: order.sewingCompletionDate,
          finishingCompletionDate: order.finishingCompletionDate,
          qualityInspectionCompletionDate: order.qualityInspectionCompletionDate,
          packingCompletionDate: order.packingCompletionDate,
          deliveryCompletionDate: order.deliveryCompletionDate,
          smv: order.smv,
          manpower: order.manpower,
          sewingOutputPerDay: order.sewingOutputPerDay,
          operationDays: order.operationDays,
          sewingStartDate: order.sewingStartDate,
          sewingFinishDate: order.sewingFinishDate,
          remarks: order.remarks,
          piecesPerSet: order.piecesPerSet,
          efficiency: order.efficiency,
          cuttingStartDate: order.cuttingStartDate,
          cuttingFinishDate: order.cuttingFinishDate,
          packingStartDate: order.packingStartDate,
          packingFinishDate: order.packingFinishDate,
          isNewProduct: order.isNewProduct === 1,
          isPlanningApproved: order.isPlanningApproved === 1,
          isMaterialsConfirmed: order.isMaterialsConfirmed === 1,
          styleComponents: order.styleComponents,
          items: items.map((item: any) => ({
            id: item.id,
            orderId: item.orderId,
            size: item.size,
            color: item.color,
            quantity: item.quantity
          })),
          components: await db.all(`SELECT * FROM marketing_order_components WHERE orderId = ?`, order.id)
        };
      })
    );
    
    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching marketing orders:', error);
    return [];
  }
}

// Server-side function to get a specific marketing order by ID
export async function getMarketingOrderByIdFromDB(id: string): Promise<MarketingOrder | null> {
  try {
    const db = await getDb();
    const order = await db.get(`
      SELECT * FROM marketing_orders 
      WHERE id = ?
    `, id);
    
    if (!order) {
      return null;
    }
    
    // Get items for the order
    const items = await db.all(`
      SELECT * FROM marketing_order_items 
      WHERE orderId = ?
    `, id);
    
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      productName: order.productName,
      productCode: order.productCode,
      description: order.description,
      quantity: order.quantity,
      status: order.status,
      cuttingStatus: order.cuttingStatus,
      sewingStatus: order.sewingStatus,
      finishingStatus: order.finishingStatus,
      qualityInspectionStatus: order.qualityInspectionStatus,
      qualityInspectionStage: order.qualityInspectionStage,
      packingStatus: order.packingStatus,
      deliveryStatus: order.deliveryStatus,
      assignedTo: order.assignedTo,
      dueDate: order.dueDate,
      completedDate: order.completedDate,
      pdfUrl: order.pdfUrl,
      imageUrl: order.imageUrl,
      isCompleted: order.isCompleted === 1,
      createdBy: order.createdBy,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      orderPlacementDate: order.orderPlacementDate,
      plannedDeliveryDate: order.plannedDeliveryDate,
      sizeSetSampleApproved: order.sizeSetSampleApproved,
      productionStartDate: order.productionStartDate,
      productionFinishedDate: order.productionFinishedDate,
      planningCompletionDate: order.planningCompletionDate,
      sampleCompletionDate: order.sampleCompletionDate,
      cuttingCompletionDate: order.cuttingCompletionDate,
      sewingCompletionDate: order.sewingCompletionDate,
      finishingCompletionDate: order.finishingCompletionDate,
      qualityInspectionCompletionDate: order.qualityInspectionCompletionDate,
      packingCompletionDate: order.packingCompletionDate,
      deliveryCompletionDate: order.deliveryCompletionDate,
      smv: order.smv,
      manpower: order.manpower,
      sewingOutputPerDay: order.sewingOutputPerDay,
      operationDays: order.operationDays,
      sewingStartDate: order.sewingStartDate,
      sewingFinishDate: order.sewingFinishDate,
      remarks: order.remarks,
      piecesPerSet: order.piecesPerSet,
      efficiency: order.efficiency,
      cuttingStartDate: order.cuttingStartDate,
      cuttingFinishDate: order.cuttingFinishDate,
      packingStartDate: order.packingStartDate,
      packingFinishDate: order.packingFinishDate,
      isNewProduct: order.isNewProduct === 1,
      isPlanningApproved: order.isPlanningApproved === 1,
      isMaterialsConfirmed: order.isMaterialsConfirmed === 1,
      receivingVoucherPadNumber: order.receivingVoucherPadNumber,
      receivingVoucherSequence: order.receivingVoucherSequence,
      receivingVoucherPrefix: order.receivingVoucherPrefix,
      receivingVoucherFormat: order.receivingVoucherFormat,
      items
    };
  } catch (error) {
    console.error('Error fetching marketing order:', error);
    return null;
  }
}

// Server-side function to create a new marketing order in database
export async function createMarketingOrderInDB(order: Omit<MarketingOrder, 'id' | 'createdAt' | 'updatedAt'> & { items: Omit<MarketingOrderItem, 'id' | 'orderId'>[] }): Promise<MarketingOrder> {
  try {
    const db = await getDb();
    
    // Generate order ID
    const orderId = `MKT-ORD-${Date.now()}`;
    
    // Generate order number if not provided
    let orderNumber = order.orderNumber;
    let attempts = 0;
    const maxAttempts = 5;
    let orderPlacementDate = order.orderPlacementDate || new Date().toISOString().split('T')[0]; // Define outside try block
    
    while (attempts < maxAttempts) {
      if (!orderNumber) {
        // Generate order number in format CM-YYYY-XXXX where XXXX is a sequential number
        const year = new Date().getFullYear();
        
        // Get the count of orders for this year to generate a sequential number
        const orderCountResult = await db.get(`
          SELECT COUNT(*) as count FROM marketing_orders 
          WHERE orderNumber LIKE ?
        `, `CM-${year}-%`);
        
        const orderCount = orderCountResult?.count || 0;
        const nextNumber = orderCount + 1 + attempts; // Add attempts to avoid collision
        orderNumber = `CM-${year}-${nextNumber.toString().padStart(4, '0')}`;
      }
      
      try {
        // Set order placement date to current date if not provided
        orderPlacementDate = order.orderPlacementDate || new Date().toISOString().split('T')[0];
        
        // Insert order into database
        await db.run(`
          INSERT INTO marketing_orders (
            id, orderNumber, productName, productCode, description, quantity, status, 
            cuttingStatus, sewingStatus, finishingStatus, qualityInspectionStatus, packingStatus, deliveryStatus, assignedTo, 
            dueDate, completedDate, pdfUrl, imageUrl, isCompleted, createdBy, createdAt, updatedAt,
            orderPlacementDate, plannedDeliveryDate, sizeSetSampleApproved, productionStartDate, productionFinishedDate,
            isPlanningApproved, priority, ppmMeetingAttached, sampleApprovalAttached, cuttingQualityAttached, piecesPerSet, efficiency
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          orderId,
          orderNumber,
          order.productName,
          order.productCode,
          order.description,
          order.quantity,
          order.status,
          order.cuttingStatus,
          order.sewingStatus,
          order.finishingStatus,
          order.qualityInspectionStatus,
          order.packingStatus,
          order.deliveryStatus,
          order.assignedTo,
          order.dueDate,
          order.completedDate,
          order.pdfUrl,
          order.imageUrl,
          order.isCompleted ? 1 : 0,
          order.createdBy,
          orderPlacementDate,
          order.plannedDeliveryDate,
          order.sizeSetSampleApproved,
          order.productionStartDate,
          order.productionFinishedDate,
          order.isPlanningApproved ? 1 : 0,
          order.priority || 0,
          order.ppmMeetingAttached || null,
          order.sampleApprovalAttached || null,
          order.cuttingQualityAttached || null,
          order.piecesPerSet || 1,
          order.efficiency || 70.0
        );
        
        break; // Success, exit the retry loop
      } catch (insertError: any) {
        // If it's a unique constraint error, try with a different order number
        if (insertError.code === 'SQLITE_CONSTRAINT' && insertError.errno === 19 && insertError.message.includes('UNIQUE constraint failed')) {
          attempts++;
          orderNumber = undefined as unknown as string; // Reset order number to generate a new one
          continue;
        } else {
          // If it's a different error, throw it
          throw insertError;
        }
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error(`Failed to create unique order number after ${maxAttempts} attempts`);
    }
    
    // Insert items into database
    const itemsWithOrderId = order.items.map(item => ({
      ...item,
      orderId: orderId
    }));
    
    for (const item of itemsWithOrderId) {
      await db.run(`
        INSERT INTO marketing_order_items (orderId, size, color, quantity)
        VALUES (?, ?, ?, ?)
      `, item.orderId, item.size, item.color, item.quantity);
    }
    
    // --- Multi-Component Workflow ---
    // Fetch style components based on productCode (Style Number)
    try {
        const style = await db.get(`SELECT components FROM styles WHERE number = ?`, order.productCode);
        if (style && style.components) {
            const components = JSON.parse(style.components); // [{name: 'Jacket', ratio: 1}]
            
            // Standard generic operations to initialize tracking
            const standardOps = [
                { name: 'Cutting', sequence: 10 },
                { name: 'Sewing', sequence: 20 },
                { name: 'Finishing', sequence: 30 },
                { name: 'Packing', sequence: 40 }
            ];
            
            for (const comp of components) {
                // Initialize component planning record
                await db.run(`
                    INSERT INTO marketing_order_components (orderId, componentName)
                    VALUES (?, ?)
                `, orderId, comp.name);

                // Generate OB for each component
                for (const op of standardOps) {
                    await db.run(`
                        INSERT INTO operation_bulletins (
                            orderId, productCode, sequence, operationName, componentName, machineType, smv, manpower
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, 
                    orderId, 
                    order.productCode, 
                    op.sequence, 
                    op.name, 
                    comp.name, 
                    'Standard', // Default machine
                    0, // Default SMV
                    0 // Default Manpower
                    );
                }
            }
        } else {
             // Fallback for Single Component / Legacy: Generate OB without component name
             const standardOps = [
                { name: 'Cutting', sequence: 10 },
                { name: 'Sewing', sequence: 20 },
                { name: 'Finishing', sequence: 30 },
                { name: 'Packing', sequence: 40 }
            ];
            
             for (const op of standardOps) {
                await db.run(`
                    INSERT INTO operation_bulletins (
                        orderId, productCode, sequence, operationName, componentName, machineType, smv, manpower
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, 
                orderId, 
                order.productCode, 
                op.sequence, 
                op.name, 
                'Main', // Default component name
                'Standard',
                0,
                0
                );
            }
        }
    } catch (e) {
        console.error("Error generating component OBs:", e);
    }

// --- Fallback for PiecesPerSet > 1 (e.g. Suits/PJ) ---
    if (order.piecesPerSet && order.piecesPerSet > 1) {
        try {
            const existingComponents = await db.all(`SELECT id FROM marketing_order_components WHERE orderId = ?`, orderId);
            if (existingComponents.length === 0) {
                const names = order.piecesPerSet === 2 ? ['Top', 'Bottom'] : Array.from({length: order.piecesPerSet}, (_, i) => `Part ${i+1}`);
                for (const name of names) {
                    await db.run(`INSERT INTO marketing_order_components (orderId, componentName) VALUES (?, ?)`, orderId, name);
                    
                    // Also generate standard OB for these fallbacks
                    const standardOps = [{ name: 'Cutting', seq: 10 }, { name: 'Sewing', seq: 20 }, { name: 'Finishing', seq: 30 }, { name: 'Packing', seq: 40 }];
                    for (const op of standardOps) {
                        await db.run(`
                            INSERT INTO operation_bulletins (orderId, productCode, sequence, operationName, componentName, machineType, smv, manpower)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, orderId, order.productCode, op.seq, op.name, name, 'Standard', 0, 0);
                    }
                }
            }
        } catch (err) {
            console.error("Error initializing fallback components:", err);
        }
    }

    // Return the created order with items
    return {
      ...order,
      id: orderId,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      orderPlacementDate,
      items: itemsWithOrderId.map((item, index) => ({
        ...item,
        id: index + 1
      }))
    };
  } catch (error) {
    console.error('Error creating marketing order:', error);
    throw error;
  }
}

// Server-side function to update a marketing order in database
export async function updateMarketingOrderInDB(id: string, order: Partial<MarketingOrder>): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Build dynamic update query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    
    if (order.orderNumber !== undefined) {
      fields.push('orderNumber = ?');
      values.push(order.orderNumber);
    }
    if (order.productName !== undefined) {
      fields.push('productName = ?');
      values.push(order.productName);
    }
    if (order.productCode !== undefined) {
      fields.push('productCode = ?');
      values.push(order.productCode);
    }
    if (order.description !== undefined) {
      fields.push('description = ?');
      values.push(order.description);
    }
    if (order.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(order.quantity);
    }
    if (order.status !== undefined) {
      fields.push('status = ?');
      values.push(order.status);
    }
    if (order.cuttingStatus !== undefined) {
      fields.push('cuttingStatus = ?');
      values.push(order.cuttingStatus);
    }
    if (order.sewingStatus !== undefined) {
      fields.push('sewingStatus = ?');
      values.push(order.sewingStatus);
    }
    if (order.finishingStatus !== undefined) {
      fields.push('finishingStatus = ?');
      values.push(order.finishingStatus);
    }
    if (order.qualityInspectionStatus !== undefined) {
      fields.push('qualityInspectionStatus = ?');
      values.push(order.qualityInspectionStatus);
    }
    if (order.qualityInspectionStage !== undefined) {
      fields.push('qualityInspectionStage = ?');
      values.push(order.qualityInspectionStage);
    }
    if (order.packingStatus !== undefined) {
      fields.push('packingStatus = ?');
      values.push(order.packingStatus);
    }
    if (order.deliveryStatus !== undefined) {
      fields.push('deliveryStatus = ?');
      values.push(order.deliveryStatus);
    }
    if (order.planningCompletionDate !== undefined) {
      fields.push('planningCompletionDate = ?');
      values.push(order.planningCompletionDate);
    }
    if (order.sampleCompletionDate !== undefined) {
      fields.push('sampleCompletionDate = ?');
      values.push(order.sampleCompletionDate);
    }
    if (order.cuttingCompletionDate !== undefined) {
      fields.push('cuttingCompletionDate = ?');
      values.push(order.cuttingCompletionDate);
    }
    if (order.sewingCompletionDate !== undefined) {
      fields.push('sewingCompletionDate = ?');
      values.push(order.sewingCompletionDate);
    }
    if (order.finishingCompletionDate !== undefined) {
      fields.push('finishingCompletionDate = ?');
      values.push(order.finishingCompletionDate);
    }
    if (order.qualityInspectionCompletionDate !== undefined) {
      fields.push('qualityInspectionCompletionDate = ?');
      values.push(order.qualityInspectionCompletionDate);
    }
    if (order.packingCompletionDate !== undefined) {
      fields.push('packingCompletionDate = ?');
      values.push(order.packingCompletionDate);
    }
    if (order.deliveryCompletionDate !== undefined) {
      fields.push('deliveryCompletionDate = ?');
      values.push(order.deliveryCompletionDate);
    }
    if (order.assignedTo !== undefined) {
      fields.push('assignedTo = ?');
      values.push(order.assignedTo);
    }
    if (order.dueDate !== undefined) {
      fields.push('dueDate = ?');
      values.push(order.dueDate);
    }
    if (order.completedDate !== undefined) {
      fields.push('completedDate = ?');
      values.push(order.completedDate);
    }
    if (order.pdfUrl !== undefined) {
      fields.push('pdfUrl = ?');
      values.push(order.pdfUrl);
    }
    if (order.imageUrl !== undefined) {
      fields.push('imageUrl = ?');
      values.push(order.imageUrl);
    }
    if (order.isCompleted !== undefined) {
      fields.push('isCompleted = ?');
      values.push(order.isCompleted ? 1 : 0);
    }
    if (order.orderPlacementDate !== undefined) {
      fields.push('orderPlacementDate = ?');
      values.push(order.orderPlacementDate);
    }
    if (order.plannedDeliveryDate !== undefined) {
      fields.push('plannedDeliveryDate = ?');
      values.push(order.plannedDeliveryDate);
    }
    if (order.sizeSetSampleApproved !== undefined) {
      fields.push('sizeSetSampleApproved = ?');
      values.push(order.sizeSetSampleApproved);
    }
    if (order.productionStartDate !== undefined) {
      fields.push('productionStartDate = ?');
      values.push(order.productionStartDate);
    }
    if (order.productionFinishedDate !== undefined) {
      fields.push('productionFinishedDate = ?');
      values.push(order.productionFinishedDate);
    }
    if (order.isPlanningApproved !== undefined) {
      fields.push('isPlanningApproved = ?');
      values.push(order.isPlanningApproved ? 1 : 0);
    }
    if (order.isMaterialsConfirmed !== undefined) {
      fields.push('isMaterialsConfirmed = ?');
      values.push(order.isMaterialsConfirmed ? 1 : 0);
    }
    if (order.priority !== undefined) {
      fields.push('priority = ?');
      values.push(order.priority);
    }
    if (order.ppmMeetingAttached !== undefined) {
      fields.push('ppmMeetingAttached = ?');
      values.push(order.ppmMeetingAttached);
    }
    if (order.sampleApprovalAttached !== undefined) {
      fields.push('sampleApprovalAttached = ?');
      values.push(order.sampleApprovalAttached);
    }
    if (order.cuttingQualityAttached !== undefined) {
      fields.push('cuttingQualityAttached = ?');
      values.push(order.cuttingQualityAttached);
    }
    if (order.smv !== undefined) {
      fields.push('smv = ?');
      values.push(order.smv);
    }
    if (order.manpower !== undefined) {
      fields.push('manpower = ?');
      values.push(order.manpower);
    }
    if (order.sewingOutputPerDay !== undefined) {
      fields.push('sewingOutputPerDay = ?');
      values.push(order.sewingOutputPerDay);
    }
    if (order.operationDays !== undefined) {
      fields.push('operationDays = ?');
      values.push(order.operationDays);
    }
    if (order.sewingStartDate !== undefined) {
      fields.push('sewingStartDate = ?');
      values.push(order.sewingStartDate);
    }
    if (order.sewingFinishDate !== undefined) {
      fields.push('sewingFinishDate = ?');
      values.push(order.sewingFinishDate);
    }
    if (order.remarks !== undefined) {
      fields.push('remarks = ?');
      values.push(order.remarks);
    }
    if (order.piecesPerSet !== undefined) {
      fields.push('piecesPerSet = ?');
      values.push(order.piecesPerSet);
    }
    if (order.efficiency !== undefined) {
      fields.push('efficiency = ?');
      values.push(order.efficiency);
    }
    if (order.cuttingStartDate !== undefined) {
      fields.push('cuttingStartDate = ?');
      values.push(order.cuttingStartDate);
    }
    if (order.cuttingFinishDate !== undefined) {
      fields.push('cuttingFinishDate = ?');
      values.push(order.cuttingFinishDate);
    }
    if (order.packingStartDate !== undefined) {
      fields.push('packingStartDate = ?');
      values.push(order.packingStartDate);
    }
    if (order.packingFinishDate !== undefined) {
      fields.push('packingFinishDate = ?');
      values.push(order.packingFinishDate);
    }
    if (order.isNewProduct !== undefined) {
      fields.push('isNewProduct = ?');
      values.push(order.isNewProduct ? 1 : 0);
    }
    
    // Always update the updatedAt field
    fields.push('updatedAt = datetime("now")');
    
    if (fields.length > 0) {
      values.push(id);
      const query = `UPDATE marketing_orders SET ${fields.join(', ')} WHERE id = ?`;
      await db.run(query, ...values);
    }
    
    // Removed auto-trigger from status change. Planning team will trigger this via "Release to Production".

    // Update items if provided (breakdown update)
    if (order.items && order.items.length > 0) {
      // 1. Delete old items
      await db.run('DELETE FROM marketing_order_items WHERE orderId = ?', id);
      
      // 2. Insert new items
      let totalQty = 0;
      for (const item of order.items) {
        await db.run(`
          INSERT INTO marketing_order_items (orderId, size, color, quantity)
          VALUES (?, ?, ?, ?)
        `, id, item.size, item.color, item.quantity);
        totalQty += item.quantity;
      }
      
      // 3. Update the total quantity in the main order table if we've updated breakdown
      await db.run('UPDATE marketing_orders SET quantity = ? WHERE id = ?', totalQty, id);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating marketing order:', error);
    return false;
  }
}

// Server-side function to delete a marketing order from database
export async function deleteMarketingOrderFromDB(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    const result = await db.run(`
      DELETE FROM marketing_orders WHERE id = ?
    `, id);
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error deleting marketing order:', error);
    return false;
  }
}

// Server-side function to get marketing orders that have started sewing but not completed
export async function getMarketingOrdersStartedSewingNotCompleted(): Promise<MarketingOrder[]> {
  try {
    const db = await getDb();
    
    // Get marketing orders that have started the sewing process but not completed it
    // This includes orders that are currently in the 'Sewing' status
    // OR orders that have sewing production records but are not yet completed
    const orders = await db.all(`
      SELECT mo.*, s.components as styleComponents 
      FROM marketing_orders mo
      LEFT JOIN styles s ON mo.productCode = s.number
      WHERE (mo.status = 'Sewing'  -- Currently in sewing stage
             OR (mo.status IN ('Cutting', 'Sewing', 'Finishing', 'Quality Inspection', 'Packing') 
                 AND EXISTS (SELECT 1 FROM daily_production_status dps 
                             WHERE dps.orderId = mo.id 
                             AND dps.processStage = 'Sewing' 
                             AND dps.status != 'Completed')))
        AND mo.sewingCompletionDate IS NULL  -- Make sure sewing isn't marked as completed
      ORDER BY mo.createdAt DESC
    `);

    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        const items = await db.all(`
          SELECT * FROM marketing_order_items 
          WHERE orderId = ?
        `, order.id);
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          productName: order.productName,
          productCode: order.productCode,
          description: order.description,
          quantity: order.quantity,
          status: order.status,
          cuttingStatus: order.cuttingStatus,
          sewingStatus: order.sewingStatus,
          finishingStatus: order.finishingStatus,
          qualityInspectionStatus: order.qualityInspectionStatus,
          qualityInspectionStage: order.qualityInspectionStage,
          packingStatus: order.packingStatus,
          deliveryStatus: order.deliveryStatus,
          assignedTo: order.assignedTo,
          dueDate: order.dueDate,
          completedDate: order.completedDate,
          pdfUrl: order.pdfUrl,
          imageUrl: order.imageUrl,
          isCompleted: order.isCompleted === 1,
          createdBy: order.createdBy,
          createdAt: new Date(order.createdAt),
          updatedAt: new Date(order.updatedAt),
          orderPlacementDate: order.orderPlacementDate,
          plannedDeliveryDate: order.plannedDeliveryDate,
          sizeSetSampleApproved: order.sizeSetSampleApproved,
          productionStartDate: order.productionStartDate,
          productionFinishedDate: order.productionFinishedDate,
          planningCompletionDate: order.planningCompletionDate,
          sampleCompletionDate: order.sampleCompletionDate,
          cuttingCompletionDate: order.cuttingCompletionDate,
          sewingCompletionDate: order.sewingCompletionDate,
          finishingCompletionDate: order.finishingCompletionDate,
          qualityInspectionCompletionDate: order.qualityInspectionCompletionDate,
          packingCompletionDate: order.packingCompletionDate,
          deliveryCompletionDate: order.deliveryCompletionDate,
          smv: order.smv,
          manpower: order.manpower,
          sewingOutputPerDay: order.sewingOutputPerDay,
          operationDays: order.operationDays,
          sewingStartDate: order.sewingStartDate,
          sewingFinishDate: order.sewingFinishDate,
          remarks: order.remarks,
          piecesPerSet: order.piecesPerSet,
          efficiency: order.efficiency,
          cuttingStartDate: order.cuttingStartDate,
          cuttingFinishDate: order.cuttingFinishDate,
          packingStartDate: order.packingStartDate,
          packingFinishDate: order.packingFinishDate,
          isNewProduct: order.isNewProduct === 1,
          isPlanningApproved: order.isPlanningApproved === 1,
          isMaterialsConfirmed: order.isMaterialsConfirmed === 1,
          styleComponents: order.styleComponents,
          items: items.map((item: any) => ({
            id: item.id,
            orderId: item.orderId,
            size: item.size,
            color: item.color,
            quantity: item.quantity
          })),
          components: await db.all(`SELECT * FROM marketing_order_components WHERE orderId = ?`, order.id)
        };
      })
    );
    
    return ordersWithItems;
  } catch (error) {
    console.error('Error fetching marketing orders started sewing but not completed:', error);
    return [];
  }
}

// Server-side function to get total produced quantity for an order
export async function getTotalProducedQuantity(orderId: string): Promise<number> {
  try {
    const db = await getDb();
    
    // Check if we have breakdown updates (isTotalUpdate = 0)
    const breakdownResult = await db.get(`
      SELECT SUM(quantity) as totalProduced
      FROM daily_production_status 
      WHERE orderId = ? AND isTotalUpdate = 0
    `, orderId);
    
    const breakdownTotal = breakdownResult?.totalProduced || 0;
    
    // Check if we have total updates (isTotalUpdate = 1)
    const totalUpdateResult = await db.get(`
      SELECT SUM(quantity) as totalProduced
      FROM daily_production_status 
      WHERE orderId = ? AND isTotalUpdate = 1
    `, orderId);
    
    const totalUpdateTotal = totalUpdateResult?.totalProduced || 0;
    
    // Return the maximum of either. Usually, they don't mix, but if they do, 
    // we assume the one with more content is more accurate, or we just sum them if they are for different days.
    // However, the current logic in DailyProductionForm might overlap.
    // Simplest logic: if there is breakdown, return breakdown. Else return total.
    return breakdownTotal > 0 ? breakdownTotal : totalUpdateTotal;
  } catch (error) {
    console.error('Error fetching total produced quantity:', error);
    return 0;
  }
}

// Server-side function to get daily production status for an order
export async function getDailyProductionStatus(orderId: string): Promise<DailyProductionStatus[]> {
  try {
    const db = await getDb();
    const statuses = await db.all(`
      SELECT * FROM daily_production_status 
      WHERE orderId = ?
      ORDER BY date DESC
    `, orderId);
    
    return statuses.map((status: any) => ({
      id: status.id,
      orderId: status.orderId,
      date: status.date,
      size: status.size,
      color: status.color,
      quantity: status.quantity,
      status: status.status,
      isTotalUpdate: status.isTotalUpdate ? status.isTotalUpdate === 1 : false,
      processStage: status.processStage,
      componentName: status.componentName
    }));
  } catch (error) {
    console.error('Error fetching daily production status:', error);
    return [];
  }
}

// Server-side function to add/update daily production status
export async function updateDailyProductionStatus(status: Omit<DailyProductionStatus, 'id'>): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Check if status entry already exists for this order/date/size/color combination
    let existingStatus;
    if (status.isTotalUpdate) {
      // For total updates, check by order, date, stage and component
      existingStatus = await db.get(`
        SELECT id FROM daily_production_status 
        WHERE orderId = ? AND date = ? AND processStage = ? AND isTotalUpdate = 1 AND (componentName = ? OR componentName IS NULL)
      `, status.orderId, status.date, status.processStage, status.componentName || null);
    } else {
      // For size/color specific updates, check by order/date/stage/size/color and component
      existingStatus = await db.get(`
        SELECT id FROM daily_production_status 
        WHERE orderId = ? AND date = ? AND processStage = ? AND size = ? AND color = ? AND (componentName = ? OR componentName IS NULL)
      `, status.orderId, status.date, status.processStage, status.size, status.color, status.componentName || null);
    }
    
    if (existingStatus) {
      // Update existing entry
      await db.run(`
        UPDATE daily_production_status 
        SET quantity = ?, status = ?, isTotalUpdate = ?, processStage = ?, componentName = ?
        WHERE id = ?
      `, status.quantity, status.status, status.isTotalUpdate ? 1 : 0, status.processStage || null, status.componentName || null, existingStatus.id);
    } else {
      // Insert new entry
      if (status.isTotalUpdate) {
        // For total updates, insert with empty size and color
        await db.run(`
          INSERT INTO daily_production_status (orderId, date, size, color, quantity, status, isTotalUpdate, processStage, componentName)
          VALUES (?, ?, '', '', ?, ?, ?, ?, ?)
        `, status.orderId, status.date, status.quantity, status.status, status.isTotalUpdate ? 1 : 0, status.processStage || null, status.componentName || null);
      } else {
        // For size/color specific updates, insert with provided values
        await db.run(`
          INSERT INTO daily_production_status (orderId, date, size, color, quantity, status, isTotalUpdate, processStage, componentName)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, status.orderId, status.date, status.size, status.color, status.quantity, status.status, status.isTotalUpdate ? 1 : 0, status.processStage || null, status.componentName || null);
      }
    }
    
    // If the status is "Completed", update the process completion date in the marketing order
    if (status.status === 'Completed' && status.processStage) {
      const today = new Date().toISOString().split('T')[0];
      let dateField = '';
      
      switch (status.processStage) {
        case 'Planning':
          dateField = 'planningCompletionDate';
          break;
        case 'Sample Making':
          dateField = 'sampleCompletionDate';
          break;
        case 'Cutting':
          dateField = 'cuttingCompletionDate';
          break;
        case 'Sewing':
        case 'Production':
          dateField = 'sewingCompletionDate';
          break;
        case 'Finishing':
          dateField = 'finishingCompletionDate';
          break;
        case 'Quality Inspection':
          dateField = 'qualityInspectionCompletionDate';
          break;
        case 'Packing':
          dateField = 'packingCompletionDate';
          break;
        case 'Delivery':
          dateField = 'deliveryCompletionDate';
          break;
      }
      
      if (dateField) {
        // Update completion date
        await db.run(`
          UPDATE marketing_orders 
          SET ${dateField} = ?
          WHERE id = ?
        `, today, status.orderId);

        // Handover: Update main status to the next stage
        const processSequence: MarketingOrderStatus[] = [
          'Placed Order',
          'Planning',
          'Sample Making',
          'Cutting', 
          'Sewing', 
          'Finishing',
          'Quality Inspection',
          'Packing', 
          'Store',
          'Delivery',
          'Completed'
        ];
        
        const currentStageIndex = processSequence.indexOf(status.processStage as MarketingOrderStatus);
        if (currentStageIndex !== -1 && currentStageIndex < processSequence.length - 1) {
          const nextStatus = processSequence[currentStageIndex + 1];
          await db.run(`
            UPDATE marketing_orders 
            SET status = ?
            WHERE id = ?
          `, nextStatus, status.orderId);
          
          // Note: In an ideal world, we'd trigger the notification here too, 
          // but since this is called from an API route, we'll handle notifications there 
          // or just rely on the API caller to know.
          // Actually, updateMarketingOrderInDB handles notifications when called via API.
          // But this is updateDailyProductionStatus.
          // I'll add a small check in the API route.
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateDailyProductionStatus:', error);
    if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
    }
    return false;
  }
}
// Operation Bulletin Functions

/**
 * Get operation bulletin items for a product or specific order (Server-Side)
 */
export async function getOperationBulletinFromDB(orderId?: string, productCode?: string): Promise<OperationBulletinItem[]> {
  try {
    const db = await getDb();
    let query = `
      SELECT ob.*, ea.employeeId as operatorId, e.name as operatorName
      FROM operation_bulletins ob
      LEFT JOIN employee_assignments ea ON ob.orderId = ea.orderId 
        AND CAST(ob.sequence AS TEXT) = ea.opCode 
        AND (ob.componentName = ea.componentName OR (ob.componentName IS NULL AND ea.componentName IS NULL))
      LEFT JOIN employees e ON ea.employeeId = e.employeeId
      WHERE 
    `;
    const params: any[] = [];

    if (orderId) {
      query += 'ob.orderId = ? ';
      params.push(orderId);
    } else if (productCode) {
      query += 'ob.productCode = ? ';
      params.push(productCode);
    } else {
      return [];
    }

    query += ' ORDER BY ob.sequence ASC';
    const items = await db.all(query, ...params);
    return items;
  } catch (error) {
    console.error('Error fetching operation bulletin:', error);
    return [];
  }
}

/**
 * Save operation bulletin items (Server-Side)
 */
export async function saveOperationBulletinInDB(items: OperationBulletinItem[], orderId?: string, productCode?: string): Promise<boolean> {
  try {
    const db = await getDb();
    
    // Delete existing items
    if (orderId) {
      await db.run('DELETE FROM operation_bulletins WHERE orderId = ?', orderId);
    } else if (productCode) {
      await db.run('DELETE FROM operation_bulletins WHERE productCode = ?', productCode);
    } else {
      return false;
    }

    // Insert new items
    for (const item of items) {
      await db.run(`
        INSERT INTO operation_bulletins (orderId, productCode, sequence, operationName, componentName, machineType, smv, manpower)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, 
        orderId || null, 
        productCode || null, 
        item.sequence || 0, 
        item.operationName || '', 
        item.componentName || null,
        item.machineType || '', 
        isNaN(item.smv) ? 0 : (item.smv || 0), 
        isNaN(item.manpower) ? 0 : (item.manpower || 0)
      );
    }

    return true;
  } catch (error) {
    console.error('Error saving operation bulletin in DB:', error);
    return false;
  }
}

/**
 * Client-side function to get operation bulletin
 */
export async function getOperationBulletin(orderId?: string, productCode?: string): Promise<OperationBulletinItem[]> {
  try {
    const params = new URLSearchParams();
    if (orderId) params.append('orderId', orderId);
    if (productCode) params.append('productCode', productCode);
    
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined' 
      ? `${baseUrl}/api/marketing-orders/operation-bulletin?${params.toString()}`
      : `/api/marketing-orders/operation-bulletin?${params.toString()}`;
      
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching operation bulletin:', error);
    return [];
  }
}

/**
 * Client-side function to save operation bulletin
 */
export async function saveOperationBulletin(items: OperationBulletinItem[], orderId?: string, productCode?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/marketing-orders/operation-bulletin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items, orderId, productCode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Save OB failed:', errorData);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error saving operation bulletin:', error);
    return false;
  }
}
/**
 * Client-side function to save quality inspection
 */
export async function saveQualityInspection(inspection: Omit<QualityInspection, 'id' | 'createdAt'>): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/quality-inspection', {
      method: 'POST',
      headers,
      body: JSON.stringify(inspection),
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving quality inspection:', error);
    return false;
  }
}

/**
 * Client-side function to get quality inspections for an order
 */
export async function getQualityInspections(orderId: string): Promise<QualityInspection[]> {
  try {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/quality-inspection?orderId=${orderId}`, { headers });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching quality inspections:', error);
    return [];
  }
}

/**
 * Server-side function to save quality inspection in DB
 */
export async function saveQualityInspectionInDB(inspection: Omit<QualityInspection, 'id' | 'createdAt'>): Promise<boolean> {
  try {
    const db = await getDb();
    
    await db.run(`
      INSERT INTO quality_inspections (
        orderId, date, stage, size, color, quantityInspected, sampleSize, totalCritical, totalMajor, totalMinor, defectJson, quantityPassed, quantityRejected, status, reportUrl, remarks, inspectorId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      inspection.orderId,
      inspection.date,
      inspection.stage,
      inspection.size || null,
      inspection.color || null,
      inspection.quantityInspected || 0,
      inspection.sampleSize || 0,
      inspection.totalCritical || 0,
      inspection.totalMajor || 0,
      inspection.totalMinor || 0,
      inspection.defectJson || null,
      inspection.quantityPassed || 0,
      inspection.quantityRejected || 0,
      inspection.status,
      inspection.reportUrl || null,
      inspection.remarks || null,
      inspection.inspectorId || null
    );

    // Update the main order's quality status, stage and report link with the latest inspection
    await db.run(`
      UPDATE marketing_orders SET qualityInspectionStatus = ?, qualityInspectionStage = ?, qualityInspectionReportUrl = ? WHERE id = ?
    `, inspection.status, inspection.stage, inspection.reportUrl || null, inspection.orderId);

    return true;
  } catch (error) {
    console.error('Error saving quality inspection in DB:', error);
    return false;
  }
}

/**
 * Server-side function to get quality inspections for an order from DB
 */
export async function getQualityInspectionsFromDB(orderId: string): Promise<QualityInspection[]> {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT * FROM quality_inspections WHERE orderId = ? ORDER BY date DESC, createdAt DESC
    `, orderId);
    return rows;
  } catch (error) {
    console.error('Error fetching quality inspections from DB:', error);
    return [];
  }
}

/**
 * Server-side function to update a marketing order component in DB
 */
export async function updateMarketingOrderComponentInDB(componentId: number, data: Partial<MarketingOrderComponent>): Promise<boolean> {
  try {
    const db = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.smv !== undefined) { fields.push('smv = ?'); values.push(data.smv); }
    if (data.manpower !== undefined) { fields.push('manpower = ?'); values.push(data.manpower); }
    if (data.efficiency !== undefined) { fields.push('efficiency = ?'); values.push(data.efficiency); }
    if (data.sewingOutputPerDay !== undefined) { fields.push('sewingOutputPerDay = ?'); values.push(data.sewingOutputPerDay); }
    if (data.operationDays !== undefined) { fields.push('operationDays = ?'); values.push(data.operationDays); }
    if (data.sewingStartDate !== undefined) { fields.push('sewingStartDate = ?'); values.push(data.sewingStartDate); }
    if (data.sewingFinishDate !== undefined) { fields.push('sewingFinishDate = ?'); values.push(data.sewingFinishDate); }
    if (data.cuttingStartDate !== undefined) { fields.push('cuttingStartDate = ?'); values.push(data.cuttingStartDate); }
    if (data.cuttingFinishDate !== undefined) { fields.push('cuttingFinishDate = ?'); values.push(data.cuttingFinishDate); }
    if (data.packingStartDate !== undefined) { fields.push('packingStartDate = ?'); values.push(data.packingStartDate); }
    if (data.packingFinishDate !== undefined) { fields.push('packingFinishDate = ?'); values.push(data.packingFinishDate); }

    if (fields.length === 0) return false;

    values.push(componentId);
    await db.run(`UPDATE marketing_order_components SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error) {
    console.error('Error updating marketing order component in DB:', error);
    return false;
  }
}
/**
 * Client-side function to initialize components for an order
 */
export async function initializeOrderComponents(orderId: string, names: string[]): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/marketing-orders/${orderId}/initialize-components`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ names }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error initializing order components:', error);
    return false;
  }
}
