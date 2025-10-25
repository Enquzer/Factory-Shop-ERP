import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { updateUserProfilePicture } from '@/lib/auth-sqlite';

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
    const fs = require('fs');
    const path = require('path');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write file to disk
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    // Create URL for the uploaded file
    const fileUrl = `/uploads/${filename}`;
    
    // Update user profile picture in database
    const success = await updateUserProfilePicture(parseInt(userId), fileUrl);
    
    if (!success) {
      // Delete the file if database update failed
      fs.unlinkSync(filepath);
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