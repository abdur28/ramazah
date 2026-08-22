import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleImages } from '@/lib/cloudinary';
import { requireAdminApi } from '@/lib/auth/api';

/**
 * Upload product and collection photographs to Cloudinary.
 *
 * **This route had no authentication.** It is a public POST endpoint that puts
 * files into the shop's Cloudinary account, so before this guard anyone on the
 * internet could fill that account with whatever they liked, burn the plan's
 * quota, and have it served from the shop's own domain. Harmless only for as
 * long as no credentials were configured.
 *
 * Type and size are checked here as well as in the browser, because a check that
 * only runs in the browser is a hint, not a limit.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export async function POST(request: NextRequest) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const formData = await request.formData();
    const files = formData.getAll('files').filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `At most ${MAX_FILES} images at a time.` },
        { status: 400 }
      );
    }

    const wrongType = files.filter((file) => !ALLOWED.includes(file.type));
    if (wrongType.length > 0) {
      return NextResponse.json(
        { error: `Not an image: ${wrongType.map((f) => f.name).join(', ')}` },
        { status: 415 }
      );
    }

    // `uploadImage` compresses anything over the limit rather than refusing it,
    // but an unbounded body should not reach sharp in the first place.
    const tooBig = files.filter((file) => file.size > MAX_BYTES * 4);
    if (tooBig.length > 0) {
      return NextResponse.json(
        { error: `Too large: ${tooBig.map((f) => f.name).join(', ')}` },
        { status: 413 }
      );
    }

    const images = await uploadMultipleImages(files, 'ramazah/products');
    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}
