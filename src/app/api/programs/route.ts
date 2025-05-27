import { NextResponse } from 'next/server';
const { getProgramsData } = require('@/lib/api/dataAccess');
import type { ProgramsJSON, Program } from '@/types/program';

export const revalidate = 3600; // Revalidate every hour

interface ProgramResponse {
  programs: Program[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search'); // Search by name or project code
    const projectCode = searchParams.get('projectCode'); // Get specific program

    console.log('Program API request:', { page, limit, search, projectCode });

    // Load programs data
    const programsData = await getProgramsData() as ProgramsJSON;

    if (!programsData || !programsData.programs) {
      return NextResponse.json(
        { error: 'Programs data not available' },
        { status: 500 }
      );
    }

    // If requesting specific program by project code
    if (projectCode) {
      const program = programsData.programs.find(p => p.projectCode === projectCode);
      
      if (!program) {
        return NextResponse.json(
          { error: 'Program not found' },
          { status: 404 }
        );
      }

      console.log('Program API - found program:', { projectCode, name: program.name, descriptionsCount: program.programDescriptions.length });

      return NextResponse.json(program, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      });
    }

    // Filter programs if search query provided
    let filteredPrograms = programsData.programs;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredPrograms = programsData.programs.filter(program => 
        program.projectCode.toLowerCase().includes(searchLower) ||
        (program.name && program.name.toLowerCase().includes(searchLower)) ||
        program.programDescriptions.some(desc => 
          desc.description.toLowerCase().includes(searchLower)
        )
      );
    }

    // Calculate pagination
    const totalItems = filteredPrograms.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Get paginated programs
    const paginatedPrograms = filteredPrograms.slice(startIndex, endIndex);

    const response: ProgramResponse = {
      programs: paginatedPrograms,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    console.log('Program API response summary:', {
      totalPrograms: totalItems,
      paginatedCount: paginatedPrograms.length,
      search: search || 'none'
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });

  } catch (error) {
    console.error('Error in Program API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch programs data',
        programs: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 50,
          hasNextPage: false,
          hasPrevPage: false
        }
      },
      { status: 500 }
    );
  }
} 