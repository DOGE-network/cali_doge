import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { AccountVendorFile } from '@/types/vendor';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/vendor_accounts.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents) as AccountVendorFile;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading account vendors:', error);
    return NextResponse.json({ accounts: [] }, { status: 500 });
  }
} 