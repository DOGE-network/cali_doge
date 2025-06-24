import { NextResponse } from 'next/server';
import { programs } from '@/lib/api/dataAccess';
import type { Program } from '@/types/program';
import type { Database } from '@/types/supabase';

export const runtime = 'edge';
export const revalidate = 3600; // Revalidate every hour

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectCode: string }> }
) {
  try {
    const resolvedParams = await params;
    const { projectCode } = resolvedParams;

    console.log('Program API - individual program request:', { projectCode });

    try {
      const program = await programs.getProgramByCode(projectCode) as Database['public']['Tables']['programs']['Row'];

      if (!program) {
        return NextResponse.json(
          { error: 'Program not found', projectCode },
          { status: 404 }
        );
      }

      console.log('Program API - found program:', { 
        projectCode, 
        name: program.name 
      });

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
        { error: 'Program not found', projectCode },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error in Program API (individual):', error);
    return NextResponse.json(
      { error: 'Failed to fetch program data' },
      { status: 500 }
    );
  }
} 