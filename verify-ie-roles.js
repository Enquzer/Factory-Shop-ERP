const { getDb } = require('./src/lib/db');

async function verifyIERoles() {
  try {
    const db = await getDb();
    const roles = await db.all("SELECT name, displayName, description FROM roles WHERE name LIKE '%ie%'");
    console.log('IE Roles in database:');
    roles.forEach(role => {
      console.log(`- ${role.name}: ${role.displayName} - ${role.description}`);
    });
    
    // Check if IE roles are in the auth types
    const fs = require('fs');
    const path = require('path');
    const authFilePath = path.join(process.cwd(), 'src', 'lib', 'auth.ts');
    const content = fs.readFileSync(authFilePath, 'utf8');
    
    if (content.includes('ie_admin') && content.includes('ie_user')) {
      console.log('✓ IE roles found in auth.ts type definitions');
    } else {
      console.log('✗ IE roles NOT found in auth.ts type definitions');
    }
    
    // Check auth middleware helpers
    const authMiddlewarePath = path.join(process.cwd(), 'src', 'lib', 'auth-middleware.ts');
    const middlewareContent = fs.readFileSync(authMiddlewarePath, 'utf8');
    
    if (middlewareContent.includes('isIEUser') && middlewareContent.includes('isIEAdmin')) {
      console.log('✓ IE helper functions found in auth-middleware.ts');
    } else {
      console.log('✗ IE helper functions NOT found in auth-middleware.ts');
    }
    
    await db.close();
    
  } catch (error) {
    console.error('Error verifying IE roles:', error);
  }
}

verifyIERoles();