import { NextRequest, NextResponse } from 'next/server';
import { deleteImage } from '@/lib/cloudinary';
import { requireAdminApi } from '@/lib/auth/api';

/**
 * Remove a photograph from Cloudinary.
 *
 * **This route had no authentication**, and it takes an arbitrary `publicId`.
 * Anyone who could guess or read a public id — they appear in every image URL
 * the site serves — could delete any asset in the shop's Cloudinary account,
 * including every product photograph. It was the most dangerous endpoint in the
 * app and it was open to the internet.
 *
 * Two guards now: the caller must be an admin, and the id must sit inside the
 * shop's own folder. The second matters because one Cloudinary account can hold
 * more than one project, and nothing else here should be reachable through a
 * bug in this shop's admin.
 */
const FOLDER_PREFIX = 'ramazah/';

export async function POST(request: NextRequest) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { publicId } = await request.json();

    if (!publicId || typeof publicId !== 'string') {
      return NextResponse.json({ error: 'No public ID provided' }, { status: 400 });
    }

    // `..` cannot escape a Cloudinary folder, but refusing it costs nothing and
    // keeps the prefix check meaning what it looks like it means.
    if (!publicId.startsWith(FOLDER_PREFIX) || publicId.includes('..')) {
      return NextResponse.json(
        { error: 'That image does not belong to this shop.' },
        { status: 403 }
      );
    }

    await deleteImage(publicId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Image delete error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
