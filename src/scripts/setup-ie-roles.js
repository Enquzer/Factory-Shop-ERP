const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function createIERoles() {
  try {
    const db = await open({
      filename: path.join(process.cwd(), 'db', 'carement.db'),
      driver: sqlite3.Database
    });

    console.log('Creating IE user roles...');

    // Add IE roles to the roles table
    const ieRoles = [
      {
        name: 'ie_admin',
        displayName: 'IE Administrator',
        description: 'Industrial Engineering administrator with full IE module access',
        permissions: JSON.stringify({
          dashboard: true,
          ie: true,
          ob_builder: true,
          line_balancing: true,
          efficiency_monitoring: true,
          operation_library: true,
          resource_planning: true,
          reports: true,
          costing_approval: true, // Can approve costing changes
          settings: true
        })
      },
      {
        name: 'ie_user',
        displayName: 'IE User',
        description: 'Industrial Engineering user with standard IE module access',
        permissions: JSON.stringify({
          dashboard: true,
          ie: true,
          ob_builder: true,
          line_balancing: true,
          efficiency_monitoring: true,
          operation_library: true,
          resource_planning: true,
          reports: true,
          costing_approval: false, // Cannot approve costing changes
          settings: false
        })
      }
    ];

    for (const role of ieRoles) {
      await db.run(
        'INSERT OR IGNORE INTO roles (name, displayName, description, permissions) VALUES (?, ?, ?, ?)',
        [role.name, role.displayName, role.description, role.permissions]
      );
      console.log(`Created role: ${role.displayName}`);
    }

    // Update auth.ts to include IE roles
    console.log('Updating authentication types...');
    
    // We'll need to update the User type in src/lib/auth.ts
    // This will be done manually or through a separate script
    
    console.log('IE roles created successfully');
    await db.close();

  } catch (error) {
    console.error('Error creating IE roles:', error);
    throw error;
  }
}

// Update the User type in auth.ts to include IE roles
async function updateAuthTypes() {
  const fs = require('fs');
  const path = require('path');
  
  const authFilePath = path.join(process.cwd(), 'src', 'lib', 'auth.ts');
  
  try {
    let content = fs.readFileSync(authFilePath, 'utf8');
    
    // Add IE roles to the User type
    const ieRoleType = "'ie_admin' | 'ie_user'";
    
    // Find the role type definition and add IE roles
    if (content.includes("role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin' | 'designer' | 'customer' | 'hr' | 'ecommerce';")) {
      const updatedContent = content.replace(
        "role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin' | 'designer' | 'customer' | 'hr' | 'ecommerce';",
        `role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin' | 'designer' | 'customer' | 'hr' | 'ecommerce' | ${ieRoleType};`
      );
      
      fs.writeFileSync(authFilePath, updatedContent, 'utf8');
      console.log('Updated auth.ts with IE role types');
    } else {
      console.log('IE roles already present in auth.ts or format changed');
    }
    
    // Update registerUser function parameters
    if (content.includes("role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin'")) {
      const updatedRegisterContent = content.replace(
        "role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin'",
        `role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'marketing' | 'admin' | ${ieRoleType}`
      );
      
      fs.writeFileSync(authFilePath, updatedRegisterContent, 'utf8');
      console.log('Updated registerUser function with IE role types');
    }
    
    // Update auth-sqlite registerUser function parameters
    const authSqlitePath = path.join(process.cwd(), 'src', 'lib', 'auth-sqlite.ts');
    if (fs.existsSync(authSqlitePath)) {
      let authSqliteContent = fs.readFileSync(authSqlitePath, 'utf8');
      
      if (authSqliteContent.includes("role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'customer' | 'hr' | 'ecommerce'")) {
        const updatedAuthSqliteContent = authSqliteContent.replace(
          "role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'customer' | 'hr' | 'ecommerce'",
          `role: 'factory' | 'shop' | 'store' | 'finance' | 'planning' | 'sample_maker' | 'cutting' | 'sewing' | 'finishing' | 'packing' | 'quality_inspection' | 'customer' | 'hr' | 'ecommerce' | ${ieRoleType}`
        );
        
        fs.writeFileSync(authSqlitePath, updatedAuthSqliteContent, 'utf8');
        console.log('Updated auth-sqlite.ts with IE role types');
      }
    }

  } catch (error) {
    console.error('Error updating auth types:', error);
  }
}

// Create IE helper functions for authentication middleware
async function createIEAuthHelpers() {
  const fs = require('fs');
  const path = require('path');
  
  const authMiddlewarePath = path.join(process.cwd(), 'src', 'lib', 'auth-middleware.ts');
  
  try {
    let content = fs.readFileSync(authMiddlewarePath, 'utf8');
    
    // Add IE role helper functions if they don't exist
    if (!content.includes('isIEUser')) {
      const ieHelpers = `
// Helper function to check if user is IE admin
export function isIEAdmin(user: AuthenticatedUser | null): boolean {
  return user?.role === 'ie_admin';
}

// Helper function to check if user is IE user
export function isIEUser(user: AuthenticatedUser | null): boolean {
  return user?.role === 'ie_user' || user?.role === 'ie_admin';
}

// Helper function to check if user has IE module access
export function hasIEAccess(user: AuthenticatedUser | null): boolean {
  return user?.hasRole(['ie_admin', 'ie_user']) || false;
}
`;
      
      // Insert before the closing of the file or before export statements
      const insertPosition = content.lastIndexOf('export function');
      if (insertPosition !== -1) {
        const beforeExport = content.substring(0, insertPosition);
        const afterExport = content.substring(insertPosition);
        content = beforeExport + ieHelpers + '\n' + afterExport;
      } else {
        content += '\n' + ieHelpers;
      }
      
      fs.writeFileSync(authMiddlewarePath, content, 'utf8');
      console.log('Added IE authentication helper functions');
    } else {
      console.log('IE helper functions already exist');
    }

  } catch (error) {
    console.error('Error creating IE auth helpers:', error);
  }
}

// Run the complete IE role setup
async function setupIERoles() {
  try {
    await createIERoles();
    await updateAuthTypes();
    await createIEAuthHelpers();
    console.log('IE role setup completed successfully');
  } catch (error) {
    console.error('Failed to setup IE roles:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupIERoles()
    .then(() => {
      console.log('IE roles setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to setup IE roles:', error);
      process.exit(1);
    });
}

module.exports = { createIERoles, updateAuthTypes, createIEAuthHelpers, setupIERoles };