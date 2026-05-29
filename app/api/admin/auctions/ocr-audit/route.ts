import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outputsDir = path.join(process.cwd(), 'auction_ocr_poc', 'outputs');
    const auditRecords: any[] = [];

    if (fs.existsSync(outputsDir)) {
      const folders = fs.readdirSync(outputsDir);
      for (const folder of folders) {
        const folderPath = path.join(outputsDir, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          const auditFilePath = path.join(folderPath, 'audit_rejected.json');
          if (fs.existsSync(auditFilePath)) {
            try {
              const content = fs.readFileSync(auditFilePath, 'utf-8');
              const items = JSON.parse(content);
              
              // Try to parse clean details from the folder name: leilao_{plaza}_{yyyy_mm_dd}_{auctionId}
              const parts = folder.split('_');
              const auctionId = parts[parts.length - 1];
              const dateStr = parts.slice(parts.length - 4, parts.length - 1).join('/');
              const plaza = parts.slice(1, parts.length - 4).join(' ');

              auditRecords.push({
                folder: folder,
                date: dateStr || '---',
                plaza: plaza ? plaza.toUpperCase() : 'SANTA URSULA',
                auctionId: auctionId,
                items: items
              });
            } catch (parseError) {
              console.error(`Error parsing audit file for folder ${folder}:`, parseError);
            }
          }
        }
      }
    }

    return NextResponse.json(auditRecords);
  } catch (error: any) {
    console.error('Error fetching OCR audit files:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
