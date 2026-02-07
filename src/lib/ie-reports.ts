import { getDb } from './db';

/**
 * Get Efficiency Data for reports
 */
export async function getEfficiencyReport() {
  const db = await getDb();
  
  // This is a simplified calculation: (Produced * SMV) / (Minutes worked)
  // We'll aggregate by date and department/category
  const efficiencyData = await db.all(`
    SELECT 
      substr(pl.date, 1, 10) as reportDate,
      op.category,
      SUM(pl.unitsProduced * op.standardSMV) as totalProducedMinutes,
      COUNT(DISTINCT pl.employeeId) * 480 as availableMinutes, -- Assuming 8h work day for each unique employee
      (SUM(pl.unitsProduced * op.standardSMV) * 100.0) / (COUNT(DISTINCT pl.employeeId) * 480) as efficiency
    FROM daily_production_logs pl
    JOIN tbl_IE_Op_Library op ON pl.opCode = op.opCode
    GROUP BY reportDate, op.category
    ORDER BY reportDate DESC
    LIMIT 30
  `);
  
  return efficiencyData;
}

/**
 * Get SAM Analysis Data
 */
export async function getSAMAnalysis() {
  const db = await getDb();
  
  // Average SMV per category
  const categorySAM = await db.all(`
    SELECT 
      category,
      AVG(standardSMV) as avgSMV,
      MAX(standardSMV) as maxSMV,
      MIN(standardSMV) as minSMV,
      COUNT(*) as operationCount
    FROM tbl_IE_Op_Library
    GROUP BY category
  `);
  
  // Top 10 operations by SMV
  const topSMVOperations = await db.all(`
    SELECT operationName, standardSMV, category
    FROM tbl_IE_Op_Library
    ORDER BY standardSMV DESC
    LIMIT 10
  `);

  return {
    categorySAM,
    topSMVOperations
  };
}

/**
 * Get Line Performance Data
 */
export async function getLinePerformance() {
  const db = await getDb();
  
  // Aggregate data from Line Balancing
  // Efficiency per line and takt time compliance
  const performance = await db.all(`
    SELECT 
      lineName as lineId,
      AVG(lineEfficiency) as avgEfficiency,
      AVG(targetOutput) as avgTarget,
      numberOfWorkstations as workstations,
      (SELECT COUNT(DISTINCT assignedOperator) FROM tbl_IE_Operation_Assignments WHERE lineBalanceId = lb.id) as operators
    FROM tbl_IE_Line_Balance lb
    GROUP BY lineId
  `);
  
  return performance;
}

/**
 * Get Dashboard KPIs for IE
 */
export async function getIEKPIs() {
  const db = await getDb();
  
  const totalOperations = await db.get('SELECT COUNT(*) as count FROM tbl_IE_Op_Library WHERE isActive = 1');
  const totalMachines = await db.get('SELECT COUNT(*) as count FROM tbl_IE_Machines WHERE status = "active"');
  const avgEfficiency = await db.get('SELECT AVG(lineEfficiency) as avg FROM tbl_IE_Line_Balance');
  
  return {
    totalOperations: totalOperations?.count || 0,
    totalMachines: totalMachines?.count || 0,
    avgEfficiency: (avgEfficiency?.avg || 0).toFixed(2)
  };
}

/**
 * Get active efficiency alerts
 */
export async function getEfficiencyAlerts() {
  const db = await getDb();
  
  // Alert if line efficiency < 60%
  const lineAlerts = await db.all(`
    SELECT 
      lineName as source,
      'Line Efficiency Low' as title,
      lineEfficiency as value,
      'Warning' as severity
    FROM tbl_IE_Line_Balance
    WHERE lineEfficiency < 60
  `);

  // Alert if any workstation in a line is a bottleneck with < 50% efficiency
  const workstationAlerts = await db.all(`
    SELECT 
      ws.workstationCode as source,
      'Workstation Bottleneck' as title,
      ws.efficiency as value,
      'Critical' as severity
    FROM tbl_IE_Workstations ws
    WHERE ws.efficiency < 50 AND ws.status = 'occupied'
  `);

  return [...lineAlerts, ...workstationAlerts];
}
