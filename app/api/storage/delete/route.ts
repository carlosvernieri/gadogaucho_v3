import { NextResponse } from 'next/server';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    // Filtra apenas URLs que pertencem ao nosso domínio do R2
    const keysToRemove = urls
      .filter((url: string) => url && url.includes('media.gadogaucho.com'))
      .map((url: string) => url.split('media.gadogaucho.com/')[1])
      .filter(Boolean)
      .map((key: string) => ({ Key: key }));

    if (keysToRemove.length === 0) {
      return NextResponse.json({ success: true, removed: 0 });
    }

    // Deleta os objetos do bucket R2 utilizando o SDK S3
    const command = new DeleteObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      Delete: {
        Objects: keysToRemove,
        Quiet: true,
      },
    });

    await r2Client.send(command);

    console.log(`Successfully deleted ${keysToRemove.length} files from R2 storage:`, keysToRemove);
    return NextResponse.json({ success: true, removed: keysToRemove.length });
  } catch (error: any) {
    console.error('Error in storage delete API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
