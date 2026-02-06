const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', '..', 'carement.db');

async function createMachineTables() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        reject(err);
        return;
      }
      console.log('✅ Connected to database');
    });

    // Create Machines table
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS tbl_IE_Machines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          machineCode TEXT UNIQUE NOT NULL,
          machineName TEXT NOT NULL,
          machineType TEXT NOT NULL,
          category TEXT NOT NULL,
          brand TEXT,
          model TEXT,
          capacity REAL DEFAULT 0,
          unit TEXT,
          powerRating TEXT,
          dimensions TEXT,
          weight REAL,
          installationArea TEXT,
          maintenanceSchedule TEXT,
          status TEXT DEFAULT 'active',
          department TEXT,
          lineSection TEXT,
          createdBy TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating machines table:', err);
          reject(err);
        } else {
          console.log('✅ tbl_IE_Machines table created');
        }
      });

      // Create Machine Layouts table
      db.run(`
        CREATE TABLE IF NOT EXISTS tbl_IE_Machine_Layouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          layoutName TEXT NOT NULL,
          orderId TEXT,
          productCode TEXT,
          section TEXT,
          machinePositions TEXT,
          createdBy TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating layouts table:', err);
          reject(err);
        } else {
          console.log('✅ tbl_IE_Machine_Layouts table created');
        }
      });

      // Create Operator Assignments table
      db.run(`
        CREATE TABLE IF NOT EXISTS tbl_IE_Operator_Assignments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          orderId TEXT NOT NULL,
          machineId INTEGER NOT NULL,
          operatorId TEXT NOT NULL,
          operationCode TEXT NOT NULL,
          startDate DATETIME NOT NULL,
          endDate DATETIME,
          status TEXT DEFAULT 'active',
          efficiencyRating REAL DEFAULT 0,
          createdBy TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (machineId) REFERENCES tbl_IE_Machines (id),
          FOREIGN KEY (operatorId) REFERENCES employees (employeeId)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating assignments table:', err);
          reject(err);
        } else {
          console.log('✅ tbl_IE_Operator_Assignments table created');
        }
      });

      // Create indexes
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_machines_category ON tbl_IE_Machines (category);
        CREATE INDEX IF NOT EXISTS idx_machines_status ON tbl_IE_Machines (status);
        CREATE INDEX IF NOT EXISTS idx_machines_section ON tbl_IE_Machines (lineSection);
        CREATE INDEX IF NOT EXISTS idx_layouts_order ON tbl_IE_Machine_Layouts (orderId);
        CREATE INDEX IF NOT EXISTS idx_layouts_section ON tbl_IE_Machine_Layouts (section);
        CREATE INDEX IF NOT EXISTS idx_assignments_order ON tbl_IE_Operator_Assignments (orderId);
        CREATE INDEX IF NOT EXISTS idx_assignments_machine ON tbl_IE_Operator_Assignments (machineId);
        CREATE INDEX IF NOT EXISTS idx_assignments_operator ON tbl_IE_Operator_Assignments (operatorId);
        CREATE INDEX IF NOT EXISTS idx_assignments_status ON tbl_IE_Operator_Assignments (status);
      `, (err) => {
        if (err) {
          console.error('❌ Error creating indexes:', err);
          reject(err);
        } else {
          console.log('✅ Indexes created');
        }
      });

      // Seed initial machine data
      seedMachines(db)
        .then(() => {
          console.log('✅ Machine database setup completed successfully!');
          db.close();
          resolve();
        })
        .catch((error) => {
          console.error('❌ Error seeding machines:', error);
          db.close();
          reject(error);
        });
    });
  });
}

function seedMachines(db) {
  return new Promise((resolve, reject) => {
    // Check if machines already exist
    db.get('SELECT COUNT(*) as count FROM tbl_IE_Machines', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count > 0) {
        console.log(' Machines already seeded, skipping...');
        resolve();
        return;
      }

      const machines = [
        // Cutting Machines
        {
          machineCode: 'CUT-001',
          machineName: 'Straight Knife Cutter',
          machineType: 'Manual Cutting',
          category: 'Cutting',
          brand: 'Gerber',
          model: 'GT-150',
          capacity: 1200,
          unit: 'meters/hour',
          powerRating: '2.2kW',
          dimensions: '2000x1000x1200mm',
          weight: 150,
          installationArea: 'Cutting Section A',
          maintenanceSchedule: 'Monthly',
          status: 'active',
          department: 'cutting',
          lineSection: 'Cutting'
        },
        {
          machineCode: 'CUT-002',
          machineName: 'Band Knife Cutter',
          machineType: 'Manual Cutting',
          category: 'Cutting',
          brand: 'SAP',
          model: 'BK-200',
          capacity: 800,
          unit: 'meters/hour',
          powerRating: '1.5kW',
          dimensions: '1800x800x1000mm',
          weight: 120,
          installationArea: 'Cutting Section B',
          maintenanceSchedule: 'Monthly',
          status: 'active',
          department: 'cutting',
          lineSection: 'Cutting'
        },
        {
          machineCode: 'CUT-003',
          machineName: 'Electric Cutting Machine',
          machineType: 'Electric Cutting',
          category: 'Cutting',
          brand: 'Shangyi',
          model: 'EC-300',
          capacity: 1500,
          unit: 'meters/hour',
          powerRating: '3.0kW',
          dimensions: '2200x1200x1400mm',
          weight: 200,
          installationArea: 'Cutting Section C',
          maintenanceSchedule: 'Bi-weekly',
          status: 'active',
          department: 'cutting',
          lineSection: 'Cutting'
        },

        // Sewing Machines - Lock Stitch
        {
          machineCode: 'SEW-001',
          machineName: 'High Speed Lock Stitch Machine',
          machineType: 'Lock Stitch',
          category: 'Sewing',
          brand: 'Juki',
          model: 'DDL-8700',
          capacity: 5000,
          unit: 'stitches/minute',
          powerRating: '0.75kW',
          dimensions: '600x400x1200mm',
          weight: 85,
          installationArea: 'Sewing Line 1',
          maintenanceSchedule: 'Weekly',
          status: 'active',
          department: 'sewing',
          lineSection: 'Sewing'
        },
        {
          machineCode: 'SEW-002',
          machineName: 'Flatlock Sewing Machine',
          machineType: 'Flatlock',
          category: 'Sewing',
          brand: 'Brother',
          model: 'S-7000X',
          capacity: 3500,
          unit: 'stitches/minute',
          powerRating: '0.5kW',
          dimensions: '550x350x1100mm',
          weight: 70,
          installationArea: 'Sewing Line 2',
          maintenanceSchedule: 'Weekly',
          status: 'active',
          department: 'sewing',
          lineSection: 'Sewing'
        },
        {
          machineCode: 'SEW-003',
          machineName: 'Overlock Machine',
          machineType: 'Overlock',
          category: 'Sewing',
          brand: 'Juki',
          model: 'MO-654DE',
          capacity: 6000,
          unit: 'stitches/minute',
          powerRating: '0.8kW',
          dimensions: '700x450x1300mm',
          weight: 95,
          installationArea: 'Sewing Line 3',
          maintenanceSchedule: 'Weekly',
          status: 'active',
          department: 'sewing',
          lineSection: 'Sewing'
        },
        {
          machineCode: 'SEW-004',
          machineName: 'Cover Stitch Machine',
          machineType: 'Cover Stitch',
          category: 'Sewing',
          brand: 'Singer',
          model: 'CS-2000',
          capacity: 3000,
          unit: 'stitches/minute',
          powerRating: '0.6kW',
          dimensions: '650x400x1250mm',
          weight: 80,
          installationArea: 'Sewing Line 4',
          maintenanceSchedule: 'Weekly',
          status: 'active',
          department: 'sewing',
          lineSection: 'Sewing'
        },

        // Finishing Machines
        {
          machineCode: 'FIN-001',
          machineName: 'Steam Press Machine',
          machineType: 'Pressing',
          category: 'Finishing',
          brand: 'Pegasus',
          model: 'SP-500',
          capacity: 200,
          unit: 'pieces/hour',
          powerRating: '4.0kW',
          dimensions: '1200x800x1800mm',
          weight: 250,
          installationArea: 'Finishing Station 1',
          maintenanceSchedule: 'Bi-weekly',
          status: 'active',
          department: 'finishing',
          lineSection: 'Finishing'
        },
        {
          machineCode: 'FIN-002',
          machineName: 'Button Attachment Machine',
          machineType: 'Button Attaching',
          category: 'Finishing',
          brand: 'Durkopp',
          model: 'BA-300',
          capacity: 1000,
          unit: 'buttons/minute',
          powerRating: '1.1kW',
          dimensions: '800x600x1400mm',
          weight: 120,
          installationArea: 'Finishing Station 2',
          maintenanceSchedule: 'Weekly',
          status: 'active',
          department: 'finishing',
          lineSection: 'Finishing'
        },
        {
          machineCode: 'FIN-003',
          machineName: 'Snap Fastener Machine',
          machineType: 'Snap Fastener',
          category: 'Finishing',
          brand: 'Mauboussin',
          model: 'SF-200',
          capacity: 800,
          unit: 'fasteners/minute',
          powerRating: '0.9kW',
          dimensions: '750x550x1300mm',
          weight: 100,
          installationArea: 'Finishing Station 3',
          maintenanceSchedule: 'Weekly',
          status: 'active',
          department: 'finishing',
          lineSection: 'Finishing'
        },

        // Packing Machines
        {
          machineCode: 'PKG-001',
          machineName: 'Automatic Folding Machine',
          machineType: 'Folding',
          category: 'Packing',
          brand: 'Lorenzetti',
          model: 'AF-800',
          capacity: 1500,
          unit: 'pieces/hour',
          powerRating: '2.5kW',
          dimensions: '2000x1200x1600mm',
          weight: 180,
          installationArea: 'Packing Line 1',
          maintenanceSchedule: 'Monthly',
          status: 'active',
          department: 'packing',
          lineSection: 'Packing'
        },
        {
          machineCode: 'PKG-002',
          machineName: 'Vacuum Packaging Machine',
          machineType: 'Vacuum Packaging',
          category: 'Packing',
          brand: 'Isla',
          model: 'VP-300',
          capacity: 100,
          unit: 'packages/hour',
          powerRating: '3.7kW',
          dimensions: '1500x1000x1800mm',
          weight: 220,
          installationArea: 'Packing Line 2',
          maintenanceSchedule: 'Bi-weekly',
          status: 'active',
          department: 'packing',
          lineSection: 'Packing'
        }
      ];

      let inserted = 0;
      machines.forEach((machine) => {
        db.run(
          `INSERT INTO tbl_IE_Machines 
           (machineCode, machineName, machineType, category, brand, model, capacity, unit,
            powerRating, dimensions, weight, installationArea, maintenanceSchedule,
            status, department, lineSection, createdBy)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            machine.machineCode,
            machine.machineName,
            machine.machineType,
            machine.category,
            machine.brand,
            machine.model,
            machine.capacity,
            machine.unit,
            machine.powerRating,
            machine.dimensions,
            machine.weight,
            machine.installationArea,
            machine.maintenanceSchedule,
            machine.status,
            machine.department,
            machine.lineSection,
            'system'
          ],
          (err) => {
            if (err) {
              console.error('❌ Error inserting machine:', machine.machineCode, err);
            } else {
              inserted++;
              if (inserted === machines.length) {
                console.log('✅ Sample machines seeded successfully');
                resolve();
              }
            }
          }
        );
      });
    });
  });
}

// Run the setup
createMachineTables()
  .then(() => {
    console.log('✅ Machine database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Machine database setup failed:', error);
    process.exit(1);
  });