import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { logToDatabase } from '@/lib/logger';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    await logToDatabase('error', 'DELETE /api/simulations/[id]', 'Supabase is not configured');
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  let userId: string | null = null;
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || !session.id) {
      await logToDatabase('warn', 'DELETE /api/simulations/[id]', 'Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = session.id;

    await logToDatabase('info', 'DELETE /api/simulations/[id]', 'Attempting to delete simulation', { userId, id });

    const { data, error } = await supabaseAdmin
      .from('saved_simulations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      await logToDatabase('error', 'DELETE /api/simulations/[id]', 'Supabase error deleting simulation', { userId, id, error });
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Simulation not found or unauthorized' }, { status: 404 });
    }

    await logToDatabase('info', 'DELETE /api/simulations/[id]', 'Successfully deleted simulation', { userId, id, data });
    return NextResponse.json({ message: 'Simulation deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting simulation:', error);
    await logToDatabase('error', 'DELETE /api/simulations/[id]', 'Exception deleting simulation', { userId, id, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    await logToDatabase('error', 'PUT /api/simulations/[id]', 'Supabase is not configured');
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  let userId: string | null = null;
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || !session.id) {
      await logToDatabase('warn', 'PUT /api/simulations/[id]', 'Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = session.id;

    const body = await request.json();
    const { name, inputs } = body;

    await logToDatabase('info', 'PUT /api/simulations/[id]', 'Attempting to update simulation', { userId, id, name });

    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    if (name !== undefined) updateData.name = name;
    if (inputs !== undefined) updateData.inputs = inputs;

    const { data, error } = await supabaseAdmin
      .from('saved_simulations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) {
      await logToDatabase('error', 'PUT /api/simulations/[id]', 'Supabase error updating simulation', { userId, id, error });
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Simulation not found or unauthorized' }, { status: 404 });
    }

    await logToDatabase('info', 'PUT /api/simulations/[id]', 'Successfully updated simulation', { userId, id, data });
    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error('Error updating simulation:', error);
    await logToDatabase('error', 'PUT /api/simulations/[id]', 'Exception updating simulation', { userId, id, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
