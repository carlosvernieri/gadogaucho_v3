const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function fixUserConflict() {
  const conflictingEmail = 'adriano.prog@gmail.com';
  const targetPassword = 'Py150587!!';
  const adminId = '8af27169-1141-460f-8b24-d8a2956a578b';
  const oldAuthUserId = '6253fe09-4659-405c-a957-57019287c92d';

  console.log(`1. Deleting conflicting user ${oldAuthUserId} from auth.users...`);
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(oldAuthUserId);
  if (deleteError) {
    console.warn(`Could not delete conflicting user (might already be deleted): ${deleteError.message}`);
  } else {
    console.log('Conflicting user deleted successfully from auth.');
  }

  console.log(`2. Updating email and password for admin account ${adminId} in auth.users...`);
  const { data: updatedAuthUser, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(adminId, {
    email: conflictingEmail,
    password: targetPassword,
    email_confirm: true,
    user_metadata: {
      name: 'Carlos Adriano Vernieri da Silva',
      city: 'Mariana Pimentel',
      phone: '(51) 9819 26800',
      is_admin: true
    }
  });

  if (updateAuthError) {
    console.error('Failed to update admin in auth.users:', updateAuthError.message);
    return;
  }
  console.log('Successfully updated admin account in auth.users to:', updatedAuthUser.email);

  console.log(`3. Updating public.users row for ${adminId}...`);
  const { data: updatedPublicUser, error: updatePublicError } = await supabaseAdmin
    .from('users')
    .update({
      email: conflictingEmail,
      name: 'Carlos Adriano Vernieri da Silva',
      password: targetPassword // or you can keep this plain/bcrypt, but let's keep it as the new password plain for legacy fallback check
    })
    .eq('id', adminId)
    .select();

  if (updatePublicError) {
    console.error('Failed to update public.users:', updatePublicError);
  } else {
    console.log('Successfully updated public.users:', updatedPublicUser);
  }

  console.log('4. Verification: testing login with the new credentials...');
  const anonClient = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const loginRes = await anonClient.auth.signInWithPassword({
    email: conflictingEmail,
    password: targetPassword
  });

  if (loginRes.error) {
    console.error('VERIFICATION FAILED:', loginRes.error.message);
  } else {
    console.log('VERIFICATION SUCCEEDED! Logged in as:', loginRes.data.user.email, 'ID:', loginRes.data.user.id);
  }
}

fixUserConflict().catch(console.error);
