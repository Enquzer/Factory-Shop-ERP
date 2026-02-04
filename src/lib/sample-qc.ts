
import { getDb, resetDbCache } from './db';
import { createNotification } from './notifications';
import { getStyleById, Style, Measurement, BOMItem } from './styles-sqlite';

export type SampleInspectionStatus = 'Pending' | 'In Progress' | 'Passed' | 'Failed';
export type SampleMeasurementStatus = 'Pass' | 'Within Tolerance' | 'Fail';

export type SampleInspection = {
  id: string;
  productId: string;
  styleId?: string;
  sampleType: 'Size Set' | 'Counter';
  status: SampleInspectionStatus;
  requestDate: string;
  inspectionDate?: string;
  inspectorId?: number;
  physicalPictures: string[];
  comments: string;
  pdfReportUrl?: string;
  fullBOMJson?: string;
  techpackUrl?: string;
};

export type SampleMeasurement = {
  id: string;
  inspectionId: string;
  pom: string;
  designerMeasurement: number;
  tolerance: number;
  actualMeasurement?: number;
  variance?: number;
  status?: SampleMeasurementStatus;
};

export async function requestSampleQC(productId: string, sampleType: 'Size Set' | 'Counter', styleId?: string) {
  const db = await getDb();
  const id = `QC-${Date.now()}`;
  
  // Try to find the style if not provided
  let style: Style | null = null;
  if (!styleId) {
    // Attempt to match style by product code (number)
    const product = await db.get('SELECT productCode FROM products WHERE id = ?', [productId]);
    if (product) {
      style = await db.get('SELECT * FROM styles WHERE number = ?', [product.productCode]);
      if (style) {
          style = await getStyleById(style.id);
      }
    }
  } else {
    style = await getStyleById(styleId);
  }

  const bomJson = style?.bom ? JSON.stringify(style.bom) : null;
  
  await db.run(`
    INSERT INTO sample_inspections (id, productId, styleId, sampleType, status, fullBOMJson)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, productId, style?.id || null, sampleType, 'Pending', bomJson]);

  // Migrate measurements
  if (style?.measurements) {
    for (const m of style.measurements) {
      // For size set/counter, we usually check one core size or all. 
      // User says "system will migrate a Quality measurement list". 
      // We'll take the first size available or a default (e.g. 'M')
      const sizes = Object.keys(m.sizeValues);
      const targetSize = sizes.includes('M') ? 'M' : sizes[0];
      const designerMeasurement = targetSize ? m.sizeValues[targetSize] : 0;
      
      const measId = `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await db.run(`
        INSERT INTO sample_measurements (id, inspectionId, pom, designerMeasurement, tolerance)
        VALUES (?, ?, ?, ?, ?)
      `, [measId, id, m.pom, designerMeasurement, m.tolerance || 0]);
    }
  }

  // Notify quality users
  await createNotification({
    userType: 'quality_inspection',
    title: 'New QC Request',
    description: `Upcoming ${sampleType} sample check for product ${productId}`,
    href: `/quality/sample-inspection/${id}`
  });

  return id;
}

export async function getSampleInspections(productId?: string) {
  const db = await getDb();
  let query = 'SELECT si.*, p.name as productName, p.productCode FROM sample_inspections si JOIN products p ON si.productId = p.id';
  const params = [];
  
  if (productId) {
    query += ' WHERE si.productId = ?';
    params.push(productId);
  }
  
  query += ' ORDER BY si.requestDate DESC';
  
  const rows = await db.all(query, params);
  return rows.map((r: any) => ({
    ...r,
    physicalPictures: r.physicalPictures ? JSON.parse(r.physicalPictures) : []
  }));
}

export async function getSampleInspectionById(id: string) {
  const db = await getDb();
  const inspection = await db.get(`
    SELECT si.*, p.name as productName, p.productCode 
    FROM sample_inspections si 
    JOIN products p ON si.productId = p.id 
    WHERE si.id = ?
  `, [id]);
  
  if (!inspection) return null;

  const measurements = await db.all('SELECT * FROM sample_measurements WHERE inspectionId = ?', [id]);
  
  // Fetch How to Measure Image (Canvas > Style Image)
  let howToMeasureImage = null;
  let annotations = [];
  if (inspection.styleId) {
      const canvas = await db.get('SELECT canvasImageUrl, annotationsJson FROM style_canvases WHERE styleId = ?', [inspection.styleId]);
      if (canvas && canvas.canvasImageUrl) {
          howToMeasureImage = canvas.canvasImageUrl;
          if (canvas.annotationsJson) {
              try {
                  const parsed = JSON.parse(canvas.annotationsJson);
                  // Fabric.js objects to simple overlay points:
                  // We need to map Fabric objects (lines/arrows) to a simplified renderable format or just pass them raw if frontend can handle.
                  // For now, let's pass the raw list of objects if it exists in 'objects' key, or the array itself.
                  annotations = parsed.objects || parsed;
              } catch (e) {
                  console.error('Error parsing annotations', e);
              }
          }
      } else {
          const style = await db.get('SELECT imageUrl FROM styles WHERE id = ?', [inspection.styleId]);
          if (style) howToMeasureImage = style.imageUrl;
      }
  }

  return {
    ...inspection,
    physicalPictures: inspection.physicalPictures ? JSON.parse(inspection.physicalPictures) : [],
    measurements,
    howToMeasureImage,
    howToMeasureAnnotations: annotations
  };
}

export async function updateSampleInspection(id: string, data: Partial<SampleInspection>) {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.inspectionDate !== undefined) { fields.push('inspectionDate = ?'); values.push(data.inspectionDate); }
  if (data.inspectorId !== undefined) { fields.push('inspectorId = ?'); values.push(data.inspectorId); }
  if (data.physicalPictures !== undefined) { fields.push('physicalPictures = ?'); values.push(JSON.stringify(data.physicalPictures)); }
  if (data.comments !== undefined) { fields.push('comments = ?'); values.push(data.comments); }
  if (data.pdfReportUrl !== undefined) { fields.push('pdfReportUrl = ?'); values.push(data.pdfReportUrl); }

  if (fields.length === 0) return false;

  values.push(id);
  await db.run(`UPDATE sample_inspections SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

export async function updateSampleMeasurement(id: string, actualMeasurement: number) {
  const db = await getDb();
  const meas = await db.get('SELECT * FROM sample_measurements WHERE id = ?', [id]);
  if (!meas) return false;

  const variance = actualMeasurement - meas.designerMeasurement;
  const absVariance = Math.abs(variance);
  let status: SampleMeasurementStatus = 'Pass';
  
  if (absVariance > meas.tolerance) {
    status = 'Fail';
  } else if (absVariance > 0) {
    status = 'Within Tolerance';
  }

  await db.run(`
    UPDATE sample_measurements 
    SET actualMeasurement = ?, variance = ?, status = ? 
    WHERE id = ?
  `, [actualMeasurement, variance, status, id]);
  
  return true;
}
