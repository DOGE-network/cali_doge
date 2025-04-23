import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { DepartmentVendorFile } from '@/types/vendor';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/department_vendors.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents) as DepartmentVendorFile;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading department vendors:', error);
    return NextResponse.json({ departments: [] }, { status: 500 });
  }
} 