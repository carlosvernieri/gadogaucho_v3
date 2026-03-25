import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { safeJsonStringify } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: user, error } = await (supabaseAdmin
      .from('users') as any)
      .select('id, name, email, city, verified, is_admin')
      .eq('id', id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await (supabaseAdmin
      .from('users') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Supabase error deleting user:', safeJsonStringify(error, 2));
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const { data: updatedUser, error } = await (supabaseAdmin
      .from('users') as any)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Supabase error updating user:', safeJsonStringify(error, 2));
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
