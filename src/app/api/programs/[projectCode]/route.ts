import { NextResponse } from 'next/server';
const { getProgramsData } = require('@/lib/api/dataAccess');
import type { ProgramsJSON } from '@/types/program';

export const revalidate = 3600; // Revalidate every hour

export async function GET(
  request: Request,
  { params }: { params: { projectCode: string } }
) {
  try {
    const { projectCode } = params;

    console.log('Program API - individual program request:', { projectCode });

    // Load programs data
    const programsData = await getProgramsData() as ProgramsJSON;

    if (!programsData || !programsData.programs) {
      return NextResponse.json(
        { error: 'Programs data not available' },
        { status: 500 }
      );
    }

    // Find the specific program
    const program = programsData.programs.find(p => p.projectCode === projectCode);

    if (!program) {
      return NextResponse.json(
        { error: 'Program not found', projectCode },
        { status: 404 }
      );
    }

    console.log('Program API - found program:', { 
      projectCode, 
      name: program.name, 
      descriptionsCount: program.programDescriptions.length 
    });

    return NextResponse.json(program, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });

  } catch (error) {
    console.error('Error in Program API (individual):', error);
    return NextResponse.json(
      { error: 'Failed to fetch program data' },
      { status: 500 }
    );
  }
} 