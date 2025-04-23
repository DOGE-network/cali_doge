import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { VendorDepartmentFile } from '@/types/vendor';

export async function GET(request: Request) {
  try {
    // Get pagination parameters from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const year = searchParams.get('year');
    const department = searchParams.get('department');

    // Read and parse the data file
    const filePath = path.join(process.cwd(), 'src/data/vendors_department.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents) as VendorDepartmentFile;

    // Filter vendors by department if specified
    let filteredVendors = department
      ? data.vendors.filter(vendor =>
          vendor.fiscalYear?.some(fy =>
            fy.data?.some(d => d.name === department)
          )
        )
      : data.vendors;

    // Sort vendors by amount for the specified year
    const sortedVendors = filteredVendors.sort((a, b) => {
      const aFiscalYear = year 
        ? a.fiscalYear?.find(fy => fy.year === year)
        : a.fiscalYear?.[a.fiscalYear.length - 1];
      const bFiscalYear = year 
        ? b.fiscalYear?.find(fy => fy.year === year)
        : b.fiscalYear?.[b.fiscalYear.length - 1];

      const aAmount = aFiscalYear?.data?.reduce((sum, d) => {
        if (department && d.name !== department) return sum;
        return sum + (d.amount || 0);
      }, 0) || 0;

      const bAmount = bFiscalYear?.data?.reduce((sum, d) => {
        if (department && d.name !== department) return sum;
        return sum + (d.amount || 0);
      }, 0) || 0;

      return bAmount - aAmount;
    });

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const totalItems = sortedVendors.length;
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated vendors
    const paginatedVendors = sortedVendors.slice(startIndex, endIndex);

    return NextResponse.json({
      vendors: paginatedVendors,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error reading vendor departments:', error);
    return NextResponse.json({ 
      vendors: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPrevPage: false
      }
    }, { status: 500 });
  }
} 