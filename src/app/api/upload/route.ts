import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check if the request has a body
    if (!request.body) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Ensure the public/uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
      return NextResponse.json({ error: 'Failed to create uploads directory' }, { status: 500 });
    }
    
    // Convert the file to a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Validate filename
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }
    
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Save the file to the public/uploads directory
    const filePath = join(uploadsDir, sanitizedFilename);
    await writeFile(filePath, buffer);
    
    // Return the URL path that can be used to access the image
    const imageUrl = `/uploads/${sanitizedFilename}`;
    
    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    // Return a more specific error message based on the error type
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to upload file: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}