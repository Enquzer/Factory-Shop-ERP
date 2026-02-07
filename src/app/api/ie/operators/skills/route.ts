import { NextResponse } from 'next/server';
import { withRoleAuth } from '@/lib/auth-middleware';
import { getDb } from '@/lib/db';

// GET /api/ie/operators/skills - Get operator skill matrix
export const GET = withRoleAuth(async (request) => {
  try {
    const db = await getDb();
    
    // Query to get operator skills joined with employee data
    const skills = await db.all(`
      SELECT 
        e.employeeId,
        e.name,
        e.department,
        os.skillId,
        os.machineTypeId,
        os.skillLevel,
        os.certifiedDate,
        os.expiryDate,
        mt.typeName as machineTypeName
      FROM employees e
      LEFT JOIN tbl_IE_Operator_Skills os ON e.employeeId = os.operatorId
      LEFT JOIN tbl_IE_Machine_Types mt ON os.machineTypeId = mt.id
      WHERE e.status = 'active'
      ORDER BY e.name, os.skillLevel DESC
    `);
    
    // Group skills by operator
    const operatorSkills = skills.reduce((acc: any, skill: any) => {
      if (!acc[skill.employeeId]) {
        acc[skill.employeeId] = {
          employeeId: skill.employeeId,
          name: skill.name,
          department: skill.department,
          skills: []
        };
      }
      
      if (skill.skillId) {
        acc[skill.employeeId].skills.push({
          skillId: skill.skillId,
          machineTypeId: skill.machineTypeId,
          machineTypeName: skill.machineTypeName,
          skillLevel: skill.skillLevel,
          certifiedDate: skill.certifiedDate,
          expiryDate: skill.expiryDate
        });
      }
      
      return acc;
    }, {});
    
    // Convert to array and add summary stats
    const result = Object.values(operatorSkills).map((operator: any) => {
      const skillLevels = operator.skills.map((s: any) => s.skillLevel);
      const highestSkill = skillLevels.includes('expert') ? 'expert' :
                          skillLevels.includes('intermediate') ? 'intermediate' :
                          skillLevels.includes('beginner') ? 'beginner' : 'untrained';
      
      return {
        ...operator,
        skillLevel: highestSkill,
        totalSkills: operator.skills.length,
        skills: operator.skills
      };
    });
    
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error fetching operator skills:', error);
    return NextResponse.json({ error: 'Failed to fetch operator skills' }, { status: 500 });
  }
}, ['ie_admin', 'ie_user', 'planning']);