
import { getDb, resetDbCache } from './db';

export type Employee = {
  id: number;
  employeeId: string;
  name: string;
  jobCenter: string;
  phone?: string;
  address?: string;
  joinedDate?: string;
  status: 'Active' | 'Inactive';
  profilePicture?: string;
  skills: any[];
  attendanceDays: number;
  disciplinaryFines: number;
  qualityPenalties: number;
  baseSalary: number;
  promotionTrack?: string;
  trainingHistory?: string;
  examHistory?: string;
  pensionOptOut?: boolean;
  loyaltyStatus?: string;
};

export type OperationRate = {
  id: number;
  opCode: string;
  opName: string;
  ratePerPcs: number;
  jobCenter: string;
};

export type EmployeeAssignment = {
  id: number;
  employeeId: string;
  orderId: string;
  opCode: string;
  componentName?: string;
  machineId?: string;
  assignedAt: string;
  status: string;
};

export type ProductionLog = {
  id: number;
  employeeId: string;
  orderId: string;
  opCode: string;
  unitsProduced: number;
  machineId?: string;
  date: string;
  timestamp: string;
};

// --- Employee Management ---

export async function getEmployees(): Promise<Employee[]> {
  const db = await getDb();
  const employees = await db.all('SELECT * FROM employees ORDER BY name ASC');
  return employees.map((emp: any) => ({
    ...emp,
    skills: emp.skills ? JSON.parse(emp.skills) : []
  }));
}

export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  const db = await getDb();
  const emp = await db.get('SELECT * FROM employees WHERE employeeId = ?', [employeeId]);
  if (!emp) return null;
  return {
    ...emp,
    skills: emp.skills ? JSON.parse(emp.skills) : []
  };
}

export async function createEmployee(employee: Omit<Employee, 'id'>): Promise<number> {
  const db = await getDb();
  const result = await db.run(`
    INSERT INTO employees (
      employeeId, name, jobCenter, phone, address, joinedDate, 
      status, profilePicture, skills, attendanceDays, 
      disciplinaryFines, qualityPenalties, baseSalary,
      promotionTrack, trainingHistory, examHistory, 
      pensionOptOut, loyaltyStatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    employee.employeeId, employee.name, employee.jobCenter, employee.phone, 
    employee.address, employee.joinedDate, employee.status, employee.profilePicture, 
    JSON.stringify(employee.skills || []), employee.attendanceDays || 0, 
    employee.disciplinaryFines || 0, employee.qualityPenalties || 0, employee.baseSalary || 0,
    employee.promotionTrack || '', employee.trainingHistory || '', employee.examHistory || '',
    employee.pensionOptOut ? 1 : 0, employee.loyaltyStatus || 'New'
  ]);
  resetDbCache();
  return result.lastID;
}

export async function updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(updates);
  if (fields.length === 0) return;

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => f === 'skills' ? JSON.stringify(updates[f]) : (updates as any)[f]);
  
  await db.run(`UPDATE employees SET ${setClause} WHERE employeeId = ?`, [...values, employeeId]);
  resetDbCache();
}

// --- Operation Rates ---

export async function getOperationRates(): Promise<OperationRate[]> {
  const db = await getDb();
  return await db.all('SELECT * FROM operation_rates ORDER BY opCode ASC');
}

// --- Assignments ---

export async function assignOperator(assignment: Omit<EmployeeAssignment, 'id' | 'assignedAt' | 'status'>): Promise<number> {
  const db = await getDb();
  const result = await db.run(`
    INSERT INTO employee_assignments (employeeId, orderId, opCode, componentName, machineId)
    VALUES (?, ?, ?, ?, ?)
  `, [assignment.employeeId, assignment.orderId, assignment.opCode, assignment.componentName, assignment.machineId]);

  // --- Smart Skill Matrix Integration ---
  // When an operator is assigned to a task, automatically register it in their skill profile
  try {
    const op = await db.get('SELECT opName, jobCenter FROM operation_rates WHERE opCode = ?', [assignment.opCode]);
    const opName = op ? op.opName : (assignment.componentName ? `${assignment.componentName} (${assignment.opCode})` : assignment.opCode);

    const employee = await db.get('SELECT skills FROM employees WHERE employeeId = ?', [assignment.employeeId]);
    if (employee) {
      const skills = employee.skills ? JSON.parse(employee.skills) : [];
      const existingSkill = skills.find((s: any) => s.operation === opName || s.opCode === assignment.opCode);

      if (!existingSkill) {
        skills.push({
          operation: opName,
          opCode: assignment.opCode,
          level: 1, // Default to level 1 (Learning/Assigned)
          category: op?.jobCenter || 'Production',
          lastAssigned: new Date().toISOString().split('T')[0],
          isAutoRegistered: true
        });
      } else {
        existingSkill.lastAssigned = new Date().toISOString().split('T')[0];
      }

      await db.run('UPDATE employees SET skills = ? WHERE employeeId = ?', [JSON.stringify(skills), assignment.employeeId]);
    }
  } catch (error) {
    console.error("Smart Skill Matrix auto-update failed:", error);
  }

  resetDbCache();
  return result.lastID;
}

export async function getAssignmentsForOrder(orderId: string): Promise<EmployeeAssignment[]> {
  const db = await getDb();
  return await db.all('SELECT * FROM employee_assignments WHERE orderId = ?', [orderId]);
}

// --- Production Logs ---

export async function logProduction(log: Omit<ProductionLog, 'id' | 'timestamp'>): Promise<number> {
  const db = await getDb();
  const result = await db.run(`
    INSERT INTO daily_production_logs (employeeId, orderId, opCode, unitsProduced, machineId, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [log.employeeId, log.orderId, log.opCode, log.unitsProduced, log.machineId, log.date]);

  // --- Smart Skill Matrix Integration ---
  // If they produce it, they have the skill. Mark it in the profile.
  try {
    const op = await db.get('SELECT opName, jobCenter FROM operation_rates WHERE opCode = ?', [log.opCode]);
    const opName = op ? op.opName : log.opCode;

    const employee = await db.get('SELECT skills FROM employees WHERE employeeId = ?', [log.employeeId]);
    if (employee) {
      const skills = employee.skills ? JSON.parse(employee.skills) : [];
      const existingSkill = skills.find((s: any) => s.operation === opName || s.opCode === log.opCode);

      if (!existingSkill) {
        skills.push({
          operation: opName,
          opCode: log.opCode,
          level: 1, 
          category: op?.jobCenter || 'Production',
          lastAssigned: log.date,
          totalProduced: log.unitsProduced,
          isAutoRegistered: true
        });
      } else {
        existingSkill.lastAssigned = log.date;
        existingSkill.totalProduced = (existingSkill.totalProduced || 0) + log.unitsProduced;
      }

      await db.run('UPDATE employees SET skills = ? WHERE employeeId = ?', [JSON.stringify(skills), log.employeeId]);
    }
  } catch (error) {
    console.error("Smart Skill Matrix log-update failed:", error);
  }

  resetDbCache();
  return result.lastID;
}

export async function getProductionLogs(filters: { employeeId?: string, orderId?: string, date?: string }): Promise<ProductionLog[]> {
  const db = await getDb();
  let query = 'SELECT * FROM daily_production_logs WHERE 1=1';
  const params: any[] = [];

  if (filters.employeeId) {
    query += ' AND employeeId = ?';
    params.push(filters.employeeId);
  }
  if (filters.orderId) {
    query += ' AND orderId = ?';
    params.push(filters.orderId);
  }
  if (filters.date) {
    query += ' AND date = ?';
    params.push(filters.date);
  }

  return await db.all(query, params);
}

// --- Leave Management ---

export async function getLeaves(month?: string) {
  const db = await getDb();
  let query = 'SELECT l.*, e.name as employeeName FROM leaves l JOIN employees e ON l.employeeId = e.employeeId';
  const params: any[] = [];
  
  if (month) {
    query += ' WHERE l.month = ?';
    params.push(month);
  }
  
  return await db.all(query, params);
}

export async function createLeave(leave: any) {
  const db = await getDb();
  const result = await db.run(`
    INSERT INTO leaves (employeeId, leaveType, startDate, endDate, totalDays, isPaid, month, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    leave.employeeId, leave.leaveType, leave.startDate, leave.endDate, 
    leave.totalDays, leave.isPaid ? 1 : 0, leave.month, leave.reason, leave.status || 'Approved'
  ]);
  
  // If it's a paid leave (like Annual), deduct from employee's leave balance
  if (leave.isPaid && (leave.leaveType === 'Annual' || leave.leaveType === 'Paid')) {
    await db.run('UPDATE employees SET leaveBalance = leaveBalance - ? WHERE employeeId = ?', [leave.totalDays, leave.employeeId]);
  }
  
  resetDbCache();
  return result.lastID;
}

export async function deleteLeave(id: number) {
  const db = await getDb();
  const leave = await db.get('SELECT * FROM leaves WHERE id = ?', [id]);
  if (leave && leave.isPaid) {
    await db.run('UPDATE employees SET leaveBalance = leaveBalance + ? WHERE employeeId = ?', [leave.totalDays, leave.employeeId]);
  }
  await db.run('DELETE FROM leaves WHERE id = ?', [id]);
  resetDbCache();
}

// --- Incentive Algorithm ---

const JOB_CENTER_MULTIPLIERS: Record<string, number> = {
  "Garment Production managers": 2.0,
  "Line supervisors": 1.5,
  "Mechanic": 1.5,
  "Cutting operators": 1.3,
  "Spreading operators": 1.1,
  "Printing operators": 1.0,
  "Trimers": 0.8,
  "Ironing operators": 0.8,
  "Packing operators": 0.8,
  "Sewing operator helpers": 0.7,
  "Floor cleaners": 0.6,
  "Sewing machine operator": 1.0 // Implicitly 1.0 for sewing operators
};

export async function calculateMonthlyIncentives(month: string) { // month format: YYYY-MM
  const db = await getDb();
  
  // 1. Fetch all employees
  const employees = await getEmployees();
  
  // 2. Fetch all production logs for the month
  const logs = await db.all(`
    SELECT * FROM daily_production_logs 
    WHERE date LIKE ?
  `, [`${month}-%`]);
  
  // 3. Fetch all operation rates
  const rates = await getOperationRates();
  
  const results: any[] = [];
  let totalSewingBonuses = 0;
  let sewingOperatorCount = 0;

  // Split employees into Direct (Sewing) and Indirect
  const sewingOperators = employees.filter(e => e.jobCenter === 'Sewing machine operator');
  const indirectLabor = employees.filter(e => e.jobCenter !== 'Sewing machine operator');

  // Calculate Direct Labor
  for (const operator of sewingOperators) {
    const operatorLogs = logs.filter((l: any) => l.employeeId === operator.employeeId);
    
    let monthlyBonus = operatorLogs.reduce((acc: number, log: any) => {
      const rate = rates.find(r => r.opCode === log.opCode)?.ratePerPcs || 0;
      return acc + (log.unitsProduced * rate);
    }, 0);

    // Apply Deductions
    monthlyBonus -= (operator.disciplinaryFines + operator.qualityPenalties);
    
    const finalBonus = Math.max(0, monthlyBonus);
    totalSewingBonuses += finalBonus;
    sewingOperatorCount++;

    results.push({
      employeeId: operator.employeeId,
      name: operator.name,
      jobCenter: operator.jobCenter,
      bonus: finalBonus,
      type: 'Direct'
    });
  }

  // Calculate Average Sewing Bonus
  const avgSewingBonus = sewingOperatorCount > 0 ? totalSewingBonuses / sewingOperatorCount : 0;

  // Calculate Indirect Labor
  for (const staff of indirectLabor) {
    const multiplier = JOB_CENTER_MULTIPLIERS[staff.jobCenter] || 0;
    let monthlyBonus = avgSewingBonus * multiplier;
    
    // Apply Disciplinary Deductions
    monthlyBonus -= staff.disciplinaryFines;
    
    const finalBonus = Math.max(0, monthlyBonus);
    
    results.push({
      employeeId: staff.employeeId,
      name: staff.name,
      jobCenter: staff.jobCenter,
      bonus: finalBonus,
      type: 'Indirect'
    });
  }

  return {
    month,
    avgSewingBonus,
    results
  };
}

export type PayrollRecord = {
  id: number;
  employeeId: string;
  month: string;
  baseSalary: number;
  otPay: number;
  incentiveBonus: number;
  disciplinaryFines: number;
  taxPayable: number;
  pensionEmployee: number;
  pensionEmployer: number;
  otherDeductions: number;
  netSalary: number;
  status: 'Draft' | 'Paid';
};

export type Attendance = {
  id: number;
  employeeId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Holiday';
  checkIn?: string;
  checkOut?: string;
  otHours: number;
};

// Dynamic Tax and Pension Calculation
export const HRSettings = {
  async getGlobalSettings() {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM hr_global_settings');
    const settings: Record<string, any> = {};
    rows.forEach((r: any) => {
      settings[r.settingKey] = isNaN(r.settingValue) ? r.settingValue : parseFloat(r.settingValue);
    });
    return settings;
  },

  async getTaxBrackets() {
    const db = await getDb();
    return await db.all('SELECT * FROM tax_brackets ORDER BY minSalary ASC');
  },

  async calculateTax(taxableIncome: number) {
    const brackets = await this.getTaxBrackets();
    for (const b of brackets) {
      if (taxableIncome >= b.minSalary && (b.maxSalary === null || taxableIncome <= b.maxSalary)) {
        return (taxableIncome * b.rate) - b.deduction;
      }
    }
    // Fallback to top bracket if not found (shouldn't happen with null maxSalary)
    const top = brackets[brackets.length - 1];
    return (taxableIncome * top.rate) - top.deduction;
  }
};

export async function generateMonthlyPayroll(month: string) {
  const db = await getDb();
  const employees = await getEmployees();
  
  // 1. Get Global Settings
  const settings = await HRSettings.getGlobalSettings();
  const pensionEmpPct = settings.pension_employee_pct || 0.07;
  const pensionEmployerPct = settings.pension_employer_pct || 0.11;
  const workingDays = settings.working_days_per_month || 26;

  // 2. Get Incentive Data
  const incentiveData = await calculateMonthlyIncentives(month);
  
  // 3. Get Attendance/OT Data
  const attendance = await db.all(`SELECT * FROM attendance WHERE date LIKE ?`, [`${month}-%`]);
  
  // 4. Get Leaves Data
  const leaves = await getLeaves(month);

  // 5. Get Leave Configs
  const leaveConfigs = await db.all('SELECT * FROM leave_configs');
  
  const payrolls: any[] = [];

  for (const emp of employees) {
    const empAttendance = attendance.filter((a: any) => a.employeeId === emp.employeeId);
    const totalOtHours = empAttendance.reduce((acc: number, curr: any) => acc + (curr.otHours || 0), 0);
    const otPay = (emp.baseSalary / 208) * 1.5 * totalOtHours; 
    
    const bonusData = incentiveData.results.find(r => r.employeeId === emp.employeeId);
    let incentive = bonusData?.bonus || 0;

    // Calculate Leave Deductions based on Configs
    const empLeaves = leaves.filter((l: any) => l.employeeId === emp.employeeId);
    let leaveDeduction = 0;
    
    empLeaves.forEach((l: any) => {
      const config = leaveConfigs.find((c: any) => c.leaveType === l.leaveType);
      const factor = config ? config.deductionFactor : (l.isPaid ? 0 : 1);
      leaveDeduction += (emp.baseSalary / workingDays) * (l.totalDays * factor);
    });

    // Loyalty Reward: If zero warnings/fines in a year (simplified to this month for demo)
    if (emp.loyaltyStatus === 'Good' && emp.disciplinaryFines === 0) {
      // Add a small loyalty bump if preferred or as per manual (e.g., avg bonus)
      // incentive += incentiveData.avgSewingBonus * 0.1; 
    }

    const grossTaxable = (emp.baseSalary - leaveDeduction) + otPay + incentive;
    const pensionEmployee = emp.baseSalary * pensionEmpPct;
    const pensionEmployer = emp.baseSalary * pensionEmployerPct;
    
    const tax = await HRSettings.calculateTax(Math.max(0, grossTaxable - pensionEmployee));
    
    const netSalary = grossTaxable - tax - pensionEmployee - emp.disciplinaryFines - emp.qualityPenalties;

    const record = {
      employeeId: emp.employeeId,
      month,
      baseSalary: emp.baseSalary,
      otPay,
      incentiveBonus: incentive,
      disciplinaryFines: emp.disciplinaryFines,
      taxPayable: tax,
      pensionEmployee,
      pensionEmployer,
      otherDeductions: emp.qualityPenalties,
      netSalary: Math.max(0, netSalary),
      status: 'Draft'
    };

    payrolls.push(record);
    
    // Save to DB
    await db.run(`
      INSERT OR REPLACE INTO payroll_records (
        employeeId, month, baseSalary, otPay, incentiveBonus, 
        disciplinaryFines, taxPayable, pensionEmployee, pensionEmployer, 
        otherDeductions, netSalary, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.employeeId, record.month, record.baseSalary, record.otPay, record.incentiveBonus,
      record.disciplinaryFines, record.taxPayable, record.pensionEmployee, record.pensionEmployer,
      record.otherDeductions, record.netSalary, record.status
    ]);
  }

  return payrolls;
}

// --- Skill Matrix & Reassignment ---

export async function suggestOperatorForOperation(opCodeOrName: string) {
  const employees = await getEmployees();
  
  // Score employees based on multiple factors:
  // 1. Skill level in that operation (from skill matrix)
  // 2. Training history mentions
  // 3. Exam history scores
  // 4. Past performance (A-grade output) - implicitly in skill level for now
  
  const suggestions = employees.map(emp => {
    const skills = emp.skills || [];
    const skillLevel = skills.find((s: any) => s.operation === opCodeOrName)?.level || 0;
    
    // Search training/exam history for keyword matches
    const trainingScore = (emp.trainingHistory || '').toLowerCase().includes(opCodeOrName.toLowerCase()) ? 1 : 0;
    const examScore = (emp.examHistory || '').toLowerCase().includes(opCodeOrName.toLowerCase()) ? 1 : 0;
    
    const totalScore = (skillLevel * 2) + trainingScore + examScore;
    
    return {
      ...emp,
      relevanceScore: totalScore
    };
  });

  return suggestions
    .filter(s => s.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

// --- Salary Increment & History ---

export async function addSalaryHistory(record: any) {
  const db = await getDb();
  await db.run(`
    INSERT INTO salary_history (employeeId, oldSalary, newSalary, changeType, effectiveDate, basis, reason, executedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    record.employeeId, record.oldSalary, record.newSalary, 
    record.changeType, record.effectiveDate, record.basis, record.reason, record.executedBy
  ]);
  
  // Update the current salary in employees table
  await db.run('UPDATE employees SET baseSalary = ? WHERE employeeId = ?', [record.newSalary, record.employeeId]);
  resetDbCache();
}

export async function getSalaryHistory(employeeId?: string) {
  const db = await getDb();
  if (employeeId) {
    return await db.all('SELECT * FROM salary_history WHERE employeeId = ? ORDER BY createdAt DESC', [employeeId]);
  }
  return await db.all('SELECT h.*, e.name as employeeName FROM salary_history h JOIN employees e ON h.employeeId = e.employeeId ORDER BY h.createdAt DESC');
}

export async function updateHRSettings(key: string, value: string) {
  const db = await getDb();
  await db.run('INSERT OR REPLACE INTO hr_global_settings (settingKey, settingValue) VALUES (?, ?)', [key, value]);
  resetDbCache();
}

export async function updateTaxBracket(id: number, updates: any) {
  const db = await getDb();
  const fields = Object.keys(updates);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  await db.run(`UPDATE tax_brackets SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
  resetDbCache();
}

export async function getLeaveConfigs() {
  const db = await getDb();
  return await db.all('SELECT * FROM leave_configs');
}

export async function updateLeaveConfig(leaveType: string, updates: any) {
  const db = await getDb();
  const fields = Object.keys(updates);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  await db.run(`UPDATE leave_configs SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE leaveType = ?`, [...values, leaveType]);
  resetDbCache();
}

// --- Employee Actions & Discipline ---

export async function getEmployeeActions(employeeId?: string) {
  const db = await getDb();
  if (employeeId) {
    return await db.all('SELECT * FROM employee_actions WHERE employeeId = ? ORDER BY createdAt DESC', [employeeId]);
  }
  return await db.all('SELECT a.*, e.name as employeeName, e.jobCenter as currentPosition FROM employee_actions a JOIN employees e ON a.employeeId = e.employeeId ORDER BY a.createdAt DESC');
}

export async function createEmployeeAction(action: any) {
  const db = await getDb();
  const result = await db.run(`
    INSERT INTO employee_actions (
      employeeId, actionType, title, description, 
      oldPosition, newPosition, oldSalary, newSalary, 
      effectiveDate, issuedBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    action.employeeId, action.actionType, action.title, action.description,
    action.oldPosition, action.newPosition, action.oldSalary, action.newSalary,
    action.effectiveDate, action.issuedBy
  ]);

  // If promotion or demotion, update the employee's position and salary
  if (action.actionType === 'Promotion' || action.actionType === 'Demotion') {
    if (action.newPosition) {
      await db.run('UPDATE employees SET jobCenter = ? WHERE employeeId = ?', [action.newPosition, action.employeeId]);
    }
    if (action.newSalary) {
      // Also log in salary history for consistency
      await addSalaryHistory({
        employeeId: action.employeeId,
        oldSalary: action.oldSalary,
        newSalary: action.newSalary,
        changeType: action.actionType,
        effectiveDate: action.effectiveDate,
        basis: 'Gross',
        reason: action.title + ': ' + action.description,
        executedBy: action.issuedBy
      });
    }
  }

  resetDbCache();
  return result.lastID;
}

// --- Training & Exams ---

export async function getTrainingModules() {
  const db = await getDb();
  return await db.all('SELECT * FROM training_modules ORDER BY title ASC');
}

export async function getEmployeeTraining(employeeId?: string) {
  const db = await getDb();
  let query = `
    SELECT et.*, tm.title as moduleTitle, tm.category, tm.department, e.name as employeeName 
    FROM employee_training et
    JOIN training_modules tm ON et.moduleId = tm.id
    JOIN employees e ON et.employeeId = e.employeeId
  `;
  if (employeeId) {
    query += ' WHERE et.employeeId = ? ORDER BY et.completionDate DESC';
    return await db.all(query, [employeeId]);
  }
  query += ' ORDER BY et.startDate DESC';
  return await db.all(query);
}

export async function enrollEmployeeTraining(data: any) {
  const db = await getDb();
  await db.run(`
    INSERT INTO employee_training (employeeId, moduleId, status, startDate, instructor)
    VALUES (?, ?, ?, ?, ?)
  `, [data.employeeId, data.moduleId, 'Enrolled', data.startDate, data.instructor]);
  resetDbCache();
}

export async function updateTrainingStatus(id: number, updates: any) {
  const db = await getDb();
  const fields = Object.keys(updates);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  await db.run(`UPDATE employee_training SET ${setClause} WHERE id = ?`, [...values, id]);
  resetDbCache();
}

export async function getExams() {
  const db = await getDb();
  return await db.all('SELECT * FROM exams ORDER BY title ASC');
}

export async function getEmployeeExams(employeeId?: string) {
  const db = await getDb();
  let query = `
    SELECT ee.*, ex.title as examTitle, ex.examType, e.name as employeeName 
    FROM employee_exams ee
    JOIN exams ex ON ee.examId = ex.id
    JOIN employees e ON ee.employeeId = e.employeeId
  `;
  if (employeeId) {
    query += ' WHERE ee.employeeId = ? ORDER BY ee.examDate DESC';
    return await db.all(query, [employeeId]);
  }
  query += ' ORDER BY ee.examDate DESC';
  return await db.all(query);
}

export async function recordExamResult(result: any) {
  const db = await getDb();
  // Calculate result based on passing score
  const exam = await db.get('SELECT * FROM exams WHERE id = ?', [result.examId]);
  const status = result.score >= exam.passingScore ? 'Pass' : 'Fail';
  
  let expiryDate = null;
  if (status === 'Pass' && exam.validityMonths) {
    const d = new Date(result.examDate);
    d.setMonth(d.getMonth() + exam.validityMonths);
    expiryDate = d.toISOString().split('T')[0];
  }

  await db.run(`
    INSERT INTO employee_exams (employeeId, examId, examDate, score, result, expiryDate, certificateUrl)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    result.employeeId, result.examId, result.examDate, 
    result.score, status, expiryDate, result.certificateUrl
  ]);
  resetDbCache();
}
