import { NextResponse } from 'next/server';
import { 
  createTrackedDeveloper, 
  getAllTrackedDevelopers,
  getTrackedDeveloperByUsername,
  deleteTrackedDeveloper
} from '@/src/tasks/database.task';
import { z } from 'zod';

// Validation schema for POST request
const createDeveloperSchema = z.object({
  username: z.string().min(1).max(255),
});

// Validation schema for DELETE request
const deleteDeveloperSchema = z.object({
  username: z.string().min(1).max(255),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createDeveloperSchema.parse(body);
    
    // Check if developer already exists
    const existingDeveloper = await getTrackedDeveloperByUsername(validatedData.username);
    if (existingDeveloper) {
      return NextResponse.json(
        { error: 'Developer already exists' },
        { status: 409 }
      );
    }
    
    // Create new developer
    const developer = await createTrackedDeveloper({
      username: validatedData.username,
    });
    
    return NextResponse.json(developer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating developer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const developers = await getAllTrackedDevelopers();
    return NextResponse.json(developers);
  } catch (error) {
    console.error('Error fetching developers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username
    const validatedData = deleteDeveloperSchema.parse({ username });

    // Find developer by username
    const developer = await getTrackedDeveloperByUsername(validatedData.username);
    if (!developer) {
      return NextResponse.json(
        { error: 'Developer not found' },
        { status: 404 }
      );
    }

    // Delete developer
    await deleteTrackedDeveloper(developer.id);
    
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid username', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error deleting developer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 