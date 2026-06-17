import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, MEDIA_DOMAIN } from '@/lib/r2';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Parâmetros filename e contentType são obrigatórios' }, { status: 400 });
    }

    // A chave (caminho) do arquivo no R2 bucket
    const key = filename;

    // Comando do S3 para fazer o upload
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Gera a URL assinada válida por 15 minutos (900 segundos)
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
    const publicUrl = `${MEDIA_DOMAIN}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error: any) {
    console.error('Erro ao gerar URL assinada no R2:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar URL de upload' }, { status: 500 });
  }
}
