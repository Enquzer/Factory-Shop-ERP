import { getDb } from './db';

export type FactoryProfile = {
  id: number;
  name: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  email: string;
  updatedAt?: string;
};

export async function getFactoryProfile(): Promise<FactoryProfile | null> {
  try {
    const db = await getDb();
    const profile = await db.get('SELECT * FROM factory_profile WHERE id = 1');
    return profile || null;
  } catch (error) {
    console.error('Error fetching factory profile:', error);
    return null;
  }
}

export async function updateFactoryProfile(profile: Partial<FactoryProfile>): Promise<boolean> {
  try {
    const db = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (profile.name !== undefined) {
      fields.push('name = ?');
      values.push(profile.name);
    }
    if (profile.address !== undefined) {
      fields.push('address = ?');
      values.push(profile.address);
    }
    if (profile.contactPerson !== undefined) {
      fields.push('contactPerson = ?');
      values.push(profile.contactPerson);
    }
    if (profile.contactPhone !== undefined) {
      fields.push('contactPhone = ?');
      values.push(profile.contactPhone);
    }
    if (profile.email !== undefined) {
      fields.push('email = ?');
      values.push(profile.email);
    }

    if (fields.length === 0) return true;

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    
    const query = `UPDATE factory_profile SET ${fields.join(', ')} WHERE id = 1`;
    const result = await db.run(query, ...values);
    
    return (result.changes || 0) > 0;
  } catch (error) {
    console.error('Error updating factory profile:', error);
    return false;
  }
}
