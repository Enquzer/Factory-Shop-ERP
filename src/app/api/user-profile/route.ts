import { NextResponse } from 'next/server';
import { updateUserProfilePicture } from '@/lib/auth-sqlite';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { stat } from 'fs/promises';

export async function POST(request: Request) {
  try {
    // Get the user from the request (you might want to implement proper authentication here)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filename = `profile_${userId}_${timestamp}.${fileExtension}`;
    
    // Save file to public/uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    
    // Ensure uploads directory exists
    try {
      await stat(uploadsDir);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(uploadsDir, { recursive: true });
    }
    
    // Write file to disk
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);
    
    // Create URL for the uploaded file
    const fileUrl = `/uploads/${filename}`;
    
    // Update user profile picture in database
    const success = await updateUserProfilePicture(parseInt(userId), fileUrl);
    
    if (!success) {
      // Delete the file if database update failed
      try {
        await unlink(filepath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
      return NextResponse.json(
        { error: 'Failed to update profile picture' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      profilePictureUrl: fileUrl
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}