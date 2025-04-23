import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ProgramVendorFile } from '@/types/vendor';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/vendor_programs.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents) as ProgramVendorFile;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading program vendors:', error);
    return NextResponse.json({ programs: [] }, { status: 500 });
  }
} 