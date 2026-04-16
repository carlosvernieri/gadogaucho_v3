import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { safeJsonStringify } from '@/lib/utils';
import { getSession } from '@/lib/auth';

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
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    if (String(session.id) !== String(id) && !session.is_admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const session = await getSession();
    if (!session || !session.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    if (String(session.id) !== String(id) && !session.is_admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    const allowedUpdates: any = {};
    if (data.name !== undefined) allowedUpdates.name = data.name;
    if (data.phone !== undefined) allowedUpdates.phone = data.phone;
    if (data.city !== undefined) allowedUpdates.city = data.city;
    if (data.email !== undefined) allowedUpdates.email = data.email;
    
    if (session.is_admin && data.verified !== undefined) {
        allowedUpdates.verified = data.verified;
    }

    const { data: updatedUser, error } = await (supabaseAdmin
      .from('users') as any)
      .update(allowedUpdates)
      .eq('id', id)
      .select('id, name, email, phone, city, is_admin, verified')
      .single();

    if (error) throw error;

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Supabase error updating user:', safeJsonStringify(error, 2));
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
