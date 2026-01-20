
import { getDb, resetDbCache } from './db';

// --- Types ---

export type StyleStatus = 'Development' | 'Quotation' | 'Size Set' | 'Counter Sample' | 'Factory Handover' | 'Approved';

export type Style = {
  id: string;
  name: string;
  number: string;
  version: number;
  season?: string;
  category?: string;
  status: StyleStatus;
  isActive: number;
  imageUrl?: string;
  description?: string;
  sampleApproved: number;
  sampleApprovedDate?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Loaded via separate queries if needed
  bom?: BOMItem[];
  measurements?: Measurement[];
  attachments?: Attachment[];
  canvas?: Canvas;
};

export type BOMItem = {
  id: string;
  styleId: string;
  type: 'Fabric' | 'Trim' | 'Finishing' | 'Packaging' | 'Other';
  itemName: string;
  itemCode?: string;
  supplier?: string;
  consumption?: number;
  unit?: string;
  cost?: number;
  currency: string;
  comments?: string;
};

export type Measurement = {
  id: string;
  styleId: string;
  pom: string; // Point of Measure (e.g., "Full Length")
  tolerance?: number;
  sizeValues: Record<string, number>; // e.g., { "S": 70, "M": 72 }
};

export type Attachment = {
  id: string;
  styleId: string;
  fileUrl: string;
  fileType: 'PDF' | 'DXF' | 'Image' | 'Other';
  name: string;
  createdAt: Date;
};

export type Canvas = {
  id: string;
  styleId: string;
  canvasImageUrl?: string;
  annotationsJson: string; // JSON string
};

// --- Styles CRUD ---

export async function getStyles(): Promise<Style[]> {
  try {
    const db = await getDb();
    const styles = await db.all(`
      SELECT * FROM styles WHERE isActive = 1 ORDER BY updated_at DESC
    `);
    
    return styles.map((s: any) => ({
      ...s,
      isActive: s.isActive === 1,
      sampleApproved: s.sampleApproved === 1,
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at)
    }));
  } catch (error) {
    console.error('Error fetching styles:', error);
    return [];
  }
}

export async function getStyleById(id: string): Promise<Style | null> {
  try {
    const db = await getDb();
    const style = await db.get(`SELECT * FROM styles WHERE id = ?`, [id]);
    
    if (!style) return null;

    // Fetch related data
    const bom = await getStyleBOM(id);
    const measurements = await getMeasurements(id);
    const attachments = await getAttachments(id);
    const canvas = await getCanvas(id);

    return {
      ...style,
      isActive: style.isActive === 1,
      sampleApproved: style.sampleApproved === 1,
      createdAt: new Date(style.created_at),
      updatedAt: new Date(style.updated_at),
      bom,
      measurements,
      attachments,
      canvas
    };
  } catch (error) {
    console.error('Error fetching style by ID:', error);
    return null;
  }
}

export async function createStyle(data: Omit<Style, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isActive' | 'sampleApproved'>): Promise<Style> {
  try {
    const db = await getDb();
    const id = `STY-${Date.now()}`;
    
    await db.run(`
      INSERT INTO styles (id, name, number, season, category, status, imageUrl, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      data.name,
      data.number,
      data.season || null,
      data.category || null,
      data.status || 'Development',
      data.imageUrl || null,
      data.description || null
    ]);

    resetDbCache();
    
    // Return the newly created style object
    // Note: In a real scenario, we might want to fetch it back to be sure, but constructing it is faster
    return {
      id,
      ...data,
      version: 1,
      isActive: 1,
      sampleApproved: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating style:', error);
    throw error;
  }
}

export async function updateStyle(id: string, data: Partial<Style>): Promise<boolean> {
  try {
    const db = await getDb();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.number !== undefined) { fields.push('number = ?'); values.push(data.number); }
    if (data.season !== undefined) { fields.push('season = ?'); values.push(data.season); }
    if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.imageUrl !== undefined) { fields.push('imageUrl = ?'); values.push(data.imageUrl); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.sampleApproved !== undefined) { 
        fields.push('sampleApproved = ?'); 
        values.push(data.sampleApproved ? 1 : 0); 
        if(data.sampleApproved) {
            fields.push('sampleApprovedDate = ?');
            values.push(new Date().toISOString());
        }
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(`UPDATE styles SET ${fields.join(', ')} WHERE id = ?`, values);
    resetDbCache();
    return true;
  } catch (error) {
    console.error('Error updating style:', error);
    return false;
  }
}

// --- BOM CRUD ---

export async function getStyleBOM(styleId: string): Promise<BOMItem[]> {
  const db = await getDb();
  return db.all('SELECT * FROM style_bom WHERE styleId = ?', [styleId]);
}

export async function addBOMItem(item: Omit<BOMItem, 'id'>): Promise<BOMItem> {
  const db = await getDb();
  const id = `BOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await db.run(`
    INSERT INTO style_bom (id, styleId, type, itemName, itemCode, supplier, consumption, unit, cost, currency, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, item.styleId, item.type, item.itemName, item.itemCode, item.supplier, item.consumption, item.unit, item.cost, item.currency, item.comments]);
  
  return { id, ...item };
}

export async function updateBOMItem(id: string, item: Partial<BOMItem>): Promise<boolean> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (item.type !== undefined) { fields.push('type = ?'); values.push(item.type); }
  if (item.itemName !== undefined) { fields.push('itemName = ?'); values.push(item.itemName); }
  if (item.itemCode !== undefined) { fields.push('itemCode = ?'); values.push(item.itemCode); }
  if (item.supplier !== undefined) { fields.push('supplier = ?'); values.push(item.supplier); }
  if (item.consumption !== undefined) { fields.push('consumption = ?'); values.push(item.consumption); }
  if (item.unit !== undefined) { fields.push('unit = ?'); values.push(item.unit); }
  if (item.cost !== undefined) { fields.push('cost = ?'); values.push(item.cost); }
  if (item.currency !== undefined) { fields.push('currency = ?'); values.push(item.currency); }
  if (item.comments !== undefined) { fields.push('comments = ?'); values.push(item.comments); }

  if (fields.length === 0) return false;

  values.push(id);
  await db.run(`UPDATE style_bom SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

export async function deleteBOMItem(id: string): Promise<boolean> {
    const db = await getDb();
    await db.run('DELETE FROM style_bom WHERE id = ?', [id]);
    return true;
}

// --- Measurements ---

export async function getMeasurements(styleId: string): Promise<Measurement[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM style_measurements WHERE styleId = ?', [styleId]);
    return rows.map((r: any) => ({
        ...r,
        sizeValues: JSON.parse(r.sizeValues || '{}')
    }));
}

export async function saveMeasurements(styleId: string, measurements: Omit<Measurement, 'id' | 'styleId'>[]): Promise<boolean> {
    const db = await getDb();
    // Simplified: Delete all for style and re-insert. For "real-time" valid updates, we might want row-level updates, but this is safer for consistency.
    await db.run('DELETE FROM style_measurements WHERE styleId = ?', [styleId]);
    
    for (const m of measurements) {
        const id = `MEAS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        await db.run(`
            INSERT INTO style_measurements (id, styleId, pom, tolerance, sizeValues)
            VALUES (?, ?, ?, ?, ?)
        `, [id, styleId, m.pom, m.tolerance, JSON.stringify(m.sizeValues)]);
    }
    return true;
}

// --- Canvas ---

export async function getCanvas(styleId: string): Promise<Canvas | null> {
    const db = await getDb();
    return db.get('SELECT * FROM style_canvases WHERE styleId = ?', [styleId]);
}

export async function saveCanvas(styleId: string, data: { canvasImageUrl?: string, annotationsJson: string }): Promise<void> {
    const db = await getDb();
    const existing = await getCanvas(styleId);
    if (existing) {
        await db.run(`UPDATE style_canvases SET annotationsJson = ?, canvasImageUrl = COALESCE(?, canvasImageUrl) WHERE styleId = ?`, 
            [data.annotationsJson, data.canvasImageUrl, styleId]);
    } else {
        const id = `CNV-${Date.now()}`;
        await db.run(`INSERT INTO style_canvases (id, styleId, canvasImageUrl, annotationsJson) VALUES (?, ?, ?, ?)`,
            [id, styleId, data.canvasImageUrl, data.annotationsJson]);
    }
}

// --- Attachments ---

export async function getAttachments(styleId: string): Promise<Attachment[]> {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM style_attachments WHERE styleId = ? ORDER BY created_at DESC', [styleId]);
    return rows.map((r: any) => ({
        ...r,
        createdAt: new Date(r.created_at)
    }));
}

export async function addAttachment(att: Omit<Attachment, 'id' | 'createdAt'>): Promise<Attachment> {
    const db = await getDb();
    const id = `ATT-${Date.now()}`;
    await db.run(`
        INSERT INTO style_attachments (id, styleId, name, fileUrl, fileType)
        VALUES (?, ?, ?, ?, ?)
    `, [id, att.styleId, att.name, att.fileUrl, att.fileType]);
    
    return {
        id,
        ...att,
        createdAt: new Date()
    };
}
