import { getDb } from './db';
import { getCombinedOB } from './ie-ob-integration';

// Line Balancing Data Structures
export interface Workstation {
  id: number;
  workstationCode: string;
  workstationName: string;
  section: string; // Cutting, Sewing, Finishing, Packing
  capacity: number; // units per hour
  currentLoad: number; // current units being processed
  status: 'available' | 'occupied' | 'maintenance';
  machineId: number | null;
  operatorId: string | null;
  assignedOperations: string[]; // Array of operation codes
  smv: number; // Standard Minute Value for this workstation
  efficiency: number; // Current efficiency percentage
  targetEfficiency: number; // Target efficiency
  createdAt: Date;
  updatedAt: Date;
}

export interface LineBalance {
  id: number;
  orderId: string;
  productCode: string;
  lineName: string;
  section: string;
  targetOutput: number; // units per hour
  workingHours: number; // hours per day
  numberOfWorkstations: number;
  totalSMV: number;
  calculatedCycleTime: number;
  actualCycleTime: number;
  lineEfficiency: number;
  bottleneckWorkstationId: number | null;
  status: 'planned' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface OperationAssignment {
  id: number;
  lineBalanceId: number;
  workstationId: number;
  operationCode: string;
  sequence: number;
  smv: number;
  assignedOperator: string | null;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// Line Balancing Functions
export async function getWorkstations(section?: string): Promise<Workstation[]> {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM tbl_IE_Workstations';
    const params: any[] = [];
    
    if (section) {
      query += ' WHERE section = ?';
      params.push(section);
    }
    
    query += ' ORDER BY workstationCode';
    const workstations = await db.all(query, params);
    
    return workstations.map((ws: any) => ({
      ...ws,
      assignedOperations: ws.assignedOperations ? JSON.parse(ws.assignedOperations) : [],
      createdAt: new Date(ws.createdAt),
      updatedAt: new Date(ws.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching workstations:', error);
    return [];
  }
}

export async function createWorkstation(workstation: Omit<Workstation, 'id' | 'createdAt' | 'updatedAt' | 'currentLoad'> & { createdBy: string }): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_Workstations 
       (workstationCode, workstationName, section, capacity, status, machineId, operatorId, 
        assignedOperations, smv, efficiency, targetEfficiency, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workstation.workstationCode,
        workstation.workstationName,
        workstation.section,
        workstation.capacity,
        workstation.status,
        workstation.machineId,
        workstation.operatorId,
        JSON.stringify(workstation.assignedOperations || []),
        workstation.smv || 0,
        workstation.efficiency || 0,
        workstation.targetEfficiency || 85,
        workstation.createdBy
      ]
    );
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating workstation:', error);
    throw error;
  }
}

export async function updateWorkstation(id: number, updates: Partial<Workstation>): Promise<boolean> {
  try {
    const db = await getDb();
    const updateFields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.values(updates).filter((_, index) => {
      const key = Object.keys(updates)[index];
      return key !== 'id' && key !== 'createdAt';
    });
    
    // Handle JSON fields
    const assignedOpsIndex = Object.keys(updates).indexOf('assignedOperations');
    if (assignedOpsIndex !== -1 && updates.assignedOperations) {
      values[assignedOpsIndex] = JSON.stringify(updates.assignedOperations);
    }
    
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.run(
      `UPDATE tbl_IE_Workstations SET ${updateFields}, updatedAt = ? WHERE id = ?`,
      values
    );
    return true;
  } catch (error) {
    console.error('Error updating workstation:', error);
    return false;
  }
}

// Line Balance Functions
export async function getLineBalances(orderId?: string): Promise<LineBalance[]> {
  try {
    const db = await getDb();
    let query = 'SELECT * FROM tbl_IE_Line_Balance';
    const params: any[] = [];
    
    if (orderId) {
      query += ' WHERE orderId = ?';
      params.push(orderId);
    }
    
    query += ' ORDER BY createdAt DESC';
    const balances = await db.all(query, params);
    
    return balances.map((lb: any) => ({
      ...lb,
      createdAt: new Date(lb.createdAt),
      updatedAt: new Date(lb.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching line balances:', error);
    return [];
  }
}

export async function createLineBalance(balance: Omit<LineBalance, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  try {
    const db = await getDb();
    
    const result = await db.run(
      `INSERT INTO tbl_IE_Line_Balance 
       (orderId, productCode, lineName, section, targetOutput, workingHours, 
        numberOfWorkstations, totalSMV, calculatedCycleTime, actualCycleTime, 
        lineEfficiency, bottleneckWorkstationId, status, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        balance.orderId,
        balance.productCode,
        balance.lineName,
        balance.section,
        balance.targetOutput,
        balance.workingHours,
        balance.numberOfWorkstations,
        balance.totalSMV,
        balance.calculatedCycleTime,
        balance.actualCycleTime,
        balance.lineEfficiency || 0,
        balance.bottleneckWorkstationId,
        balance.status,
        balance.createdBy
      ]
    );
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating line balance:', error);
    throw error;
  }
}

// Operation Assignment Functions
export async function getOperationAssignments(lineBalanceId: number): Promise<OperationAssignment[]> {
  try {
    const db = await getDb();
    const assignments = await db.all(
      `SELECT oa.*, ws.workstationCode, ws.workstationName, op.operationName
       FROM tbl_IE_Operation_Assignments oa
       JOIN tbl_IE_Workstations ws ON oa.workstationId = ws.id
       LEFT JOIN tbl_IE_Op_Library op ON oa.operationCode = op.opCode
       WHERE oa.lineBalanceId = ?
       ORDER BY oa.sequence`,
      [lineBalanceId]
    );
    
    return assignments.map((assignment: any) => ({
      ...assignment,
      startTime: new Date(assignment.startTime),
      endTime: new Date(assignment.endTime),
      createdAt: new Date(assignment.createdAt),
      updatedAt: new Date(assignment.updatedAt)
    }));
  } catch (error) {
    console.error('Error fetching operation assignments:', error);
    return [];
  }
}

export async function createOperationAssignment(assignment: Omit<OperationAssignment, 'id' | 'createdAt' | 'updatedAt'> & { createdBy: string }): Promise<number> {
  try {
    const db = await getDb();
    const result = await db.run(
      `INSERT INTO tbl_IE_Operation_Assignments 
       (lineBalanceId, workstationId, operationCode, sequence, smv, assignedOperator, 
        startTime, endTime, status, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignment.lineBalanceId,
        assignment.workstationId,
        assignment.operationCode,
        assignment.sequence,
        assignment.smv,
        assignment.assignedOperator,
        assignment.startTime.toISOString(),
        assignment.endTime.toISOString(),
        assignment.status,
        assignment.createdBy
      ]
    );
    return result.lastID || 0;
  } catch (error) {
    console.error('Error creating operation assignment:', error);
    throw error;
  }
}

// Line Balancing Algorithm Functions
export async function calculateLineBalance(
  orderId: string, 
  productCode: string, 
  targetOutput: number,
  workingHours: number = 8
): Promise<{ 
  lineBalanceId: number;
  workstations: Workstation[];
  assignments: OperationAssignment[];
  efficiency: number;
  bottleneck: string | null;
}> {
  try {
    const db = await getDb();
    
    // Get OB for this product using combined layout (prio: IE, fallback: Planning)
    const obResult = await getCombinedOB(orderId);
    
    if (!obResult || !obResult.items || obResult.items.length === 0) {
      throw new Error(`No Operation Bulletin (OB) found for Order ID: ${orderId}. Please ensure an OB exists in either Planning or IE module before balancing.`);
    }

    const obItems = obResult.items.map((item: any) => ({
      ...item,
      normalizedSMV: Math.max(0.001, item.standardSMV || item.smv || 0), // Ensure at least a tiny SMV to avoid division errors
      normalizedOpName: item.operationName || item.opCode || 'Unknown Op'
    }));
    
    // Calculate total SMV
    const totalSMV = obItems.reduce((sum: number, item: any) => sum + item.normalizedSMV, 0);
    
    // Calculate required cycle time (in minutes)
    const requiredCycleTime = (workingHours * 60) / targetOutput;
    
    // Get available workstations for this section
    const firstComp = (obItems[0].componentName || '').toLowerCase();
    const section = firstComp.includes('cutting') ? 'Cutting' : 
                   firstComp.includes('packing') ? 'Packing' : 
                   firstComp.includes('finishing') ? 'Finishing' : 'Sewing';
    
    const workstations = await getWorkstations(section);
    const availableWorkstations = workstations.filter(ws => ws.status === 'available');
    
    if (availableWorkstations.length === 0) {
      throw new Error(`No available workstations in ${section} section. Please add workstations for this section first.`);
    }
    
    // Simple line balancing algorithm (assign operations to workstations)
    const assignments: any[] = [];
    let currentWorkstationIndex = 0;
    let currentWorkstationTime = 0;
    let bottleneckWorkstationId: number | null = null;
    let maxWorkstationTime = 0;
    
    for (const item of obItems) {
      const operationSMV = item.normalizedSMV;
      
      // If current workstation can't handle this operation, move to next
      if (currentWorkstationTime + operationSMV > requiredCycleTime && 
          currentWorkstationIndex < availableWorkstations.length - 1) {
        // Move to next workstation
        if (currentWorkstationTime > maxWorkstationTime) {
          maxWorkstationTime = currentWorkstationTime;
          bottleneckWorkstationId = availableWorkstations[currentWorkstationIndex].id;
        }
        currentWorkstationIndex++;
        currentWorkstationTime = 0;
      }
      
      // Assign operation to current workstation
      const workstation = availableWorkstations[currentWorkstationIndex];
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + operationSMV * 60000); // Convert SMV to milliseconds
      
      assignments.push({
        workstationId: workstation.id,
        operationCode: item.opCode || item.normalizedOpName,
        sequence: item.sequence,
        smv: operationSMV,
        startTime,
        endTime,
        assignedOperator: workstation.operatorId,
        status: 'pending' as const,
        createdBy: 'system'
      });
      
      currentWorkstationTime += operationSMV;
      
      // Update workstation with assigned operation
      await updateWorkstation(workstation.id, {
        assignedOperations: [...(workstation.assignedOperations || []), item.opCode || item.normalizedOpName],
        smv: (workstation.smv || 0) + operationSMV,
        currentLoad: (workstation.currentLoad || 0) + 1
      });
    }
    
    // Calculate final efficiency
    const actualCycleTime = Math.max(0.001, maxWorkstationTime || currentWorkstationTime);
    let efficiency = (requiredCycleTime / actualCycleTime) * 100;
    
    // Cap efficiency at 100% or handle invalid numbers
    if (isNaN(efficiency) || !isFinite(efficiency)) efficiency = 0;
    efficiency = Math.min(100, efficiency);
    
    // Create line balance record
    const lineBalanceId = await createLineBalance({
      orderId,
      productCode,
      lineName: `${section} Line - ${productCode}`,
      section,
      targetOutput,
      workingHours,
      numberOfWorkstations: Math.min(currentWorkstationIndex + 1, availableWorkstations.length),
      totalSMV,
      calculatedCycleTime: requiredCycleTime,
      actualCycleTime: actualCycleTime,
      lineEfficiency: efficiency,
      bottleneckWorkstationId,
      status: 'active',
      createdBy: 'system'
    });
    
    // Create operation assignments
    for (const assignment of assignments) {
      await createOperationAssignment({
        lineBalanceId,
        workstationId: assignment.workstationId,
        operationCode: assignment.operationCode,
        sequence: assignment.sequence,
        smv: assignment.smv,
        assignedOperator: assignment.assignedOperator,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        status: 'pending',
        createdBy: 'system'
      });
    }
    
    return {
      lineBalanceId,
      workstations: availableWorkstations.slice(0, currentWorkstationIndex + 1),
      assignments,
      efficiency,
      bottleneck: bottleneckWorkstationId ? 
        availableWorkstations.find(ws => ws.id === bottleneckWorkstationId)?.workstationCode || null : 
        null
    };
    
  } catch (error) {
    console.error('Error calculating line balance:', error);
    throw error;
  }
}

// Get line balance details with full information
export async function getLineBalanceDetails(lineBalanceId: number) {
  try {
    const db = await getDb();
    
    // Get line balance
    const lineBalance = await db.get(
      'SELECT * FROM tbl_IE_Line_Balance WHERE id = ?',
      [lineBalanceId]
    );
    
    if (!lineBalance) {
      return null;
    }
    
    // Get operation assignments with workstation details
    const assignments = await db.all(
      `SELECT oa.*, ws.workstationCode, ws.workstationName, op.operationName, e.name as operatorName
       FROM tbl_IE_Operation_Assignments oa
       JOIN tbl_IE_Workstations ws ON oa.workstationId = ws.id
       LEFT JOIN tbl_IE_Op_Library op ON oa.operationCode = op.opCode
       LEFT JOIN employees e ON oa.assignedOperator = e.employeeId
       WHERE oa.lineBalanceId = ?
       ORDER BY oa.sequence`,
      [lineBalanceId]
    );
    
    // Get bottleneck workstation details
    let bottleneckWorkstation = null;
    if (lineBalance.bottleneckWorkstationId) {
      bottleneckWorkstation = await db.get(
        'SELECT * FROM tbl_IE_Workstations WHERE id = ?',
        [lineBalance.bottleneckWorkstationId]
      );
    }
    
    return {
      ...lineBalance,
      createdAt: new Date(lineBalance.createdAt),
      updatedAt: new Date(lineBalance.updatedAt),
      assignments: assignments.map((a: any) => ({
        ...a,
        startTime: new Date(a.startTime),
        endTime: new Date(a.endTime),
        createdAt: new Date(a.createdAt),
        updatedAt: new Date(a.updatedAt)
      })),
      bottleneckWorkstation
    };
  } catch (error) {
    console.error('Error fetching line balance details:', error);
    return null;
  }
}