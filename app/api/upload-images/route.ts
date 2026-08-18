import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleImages } from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    // Upload to Cloudinary
    const uploadResults = await uploadMultipleImages(files, 'ramazah/products');
    
    return NextResponse.json({
      success: true,
      images: uploadResults
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}