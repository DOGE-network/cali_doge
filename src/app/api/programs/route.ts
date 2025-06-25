import { NextResponse } from 'next/server';
import { programs } from '@/lib/api/dataAccess';
import type { Program } from '@/types/program';
import type { Database } from '@/types/supabase';

export const runtime = 'edge';
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
    const url = new URL(request.url || '', 'http://localhost');
    const searchParams = url.searchParams;
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search'); // Search by name or project code
    const projectCode = searchParams.get('projectCode'); // Get specific program
    const departmentCode = searchParams.get('departmentCode'); // Filter by department

    console.log('Program API request:', { page, limit, search, projectCode, departmentCode });

    // If requesting specific program by project code
    if (projectCode) {
      try {
        const program = await programs.getProgramByCode(projectCode) as Database['public']['Tables']['programs']['Row'];
        
        console.log('Program API - found program:', { projectCode, name: program.name });

        // Map database fields to API response format
        const apiProgram: Program = {
          id: program.id,
          project_code: program.project_code,
          name: program.name,
          description: program.description,
          sources: program.sources,
          created_at: program.created_at,
          updated_at: program.updated_at,
          
          // Add legacy fields for backward compatibility
          projectCode: program.project_code,
          programDescriptions: program.description ? [
            { description: program.description, source: 'Database' }
          ] : []
        };

        return NextResponse.json(apiProgram, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
          }
        });
      } catch (error) {
        console.log('Program not found:', projectCode);
        return NextResponse.json(
          { error: 'Program not found' },
          { status: 404 }
        );
      }
    }

    // Get all programs, filtered by department if specified
    const programsData = await programs.getPrograms({
      departmentCode: departmentCode || undefined
    }) as Database['public']['Tables']['programs']['Row'][];

    // Filter programs if search query provided
    let filteredPrograms = programsData;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredPrograms = programsData.filter((program) => 
        program.project_code.toLowerCase().includes(searchLower) ||
        (program.name && program.name.toLowerCase().includes(searchLower)) ||
        (program.description && program.description.toLowerCase().includes(searchLower))
      );
    }

    // Calculate pagination
    const totalItems = filteredPrograms.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Get paginated programs
    const paginatedPrograms = filteredPrograms.slice(startIndex, endIndex);

    // Map database programs to API response format
    const apiPrograms: Program[] = paginatedPrograms.map(program => ({
      id: program.id,
      project_code: program.project_code,
      name: program.name,
      description: program.description,
      sources: program.sources,
      created_at: program.created_at,
      updated_at: program.updated_at,
      
      // Add legacy fields for backward compatibility
      projectCode: program.project_code,
      programDescriptions: program.description ? [
        { description: program.description, source: 'Database' }
      ] : []
    }));

    const response: ProgramResponse = {
      programs: apiPrograms,
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