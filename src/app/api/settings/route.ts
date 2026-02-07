
import { NextResponse } from 'next/server';
import { dbUtils } from '@/lib/db';
import { ensureSettingsTable } from '@/lib/db-init';

export async function GET() {
  try {
    await ensureSettingsTable();
    
    // Fetch all settings
    const keys = ['companyName', 'logo', 'primaryColor', 'secondaryColor'];
    const settings: Record<string, string> = {};
    
    for (const key of keys) {
      const value = await dbUtils.getSetting(key);
      if (value) {
        settings[key] = value;
      }
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await ensureSettingsTable();
    
    const { companyName, logo, primaryColor, secondaryColor } = body;
    
    if (companyName) await dbUtils.setSetting('companyName', companyName);
    if (logo) await dbUtils.setSetting('logo', logo);
    if (primaryColor) await dbUtils.setSetting('primaryColor', primaryColor);
    if (secondaryColor) await dbUtils.setSetting('secondaryColor', secondaryColor);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
