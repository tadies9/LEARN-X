import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

// Create a service role client for debugging
const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function debugFileStorage(fileId: string) {
  console.log('=== STORAGE DEBUG FOR FILE:', fileId, '===');

  try {
    // 1. Check if file exists in database
    console.log('=== CHECKING FILE IN DATABASE ===');
    const { data: dbFile, error: dbError } = await supabase
      .from('course_files')
      .select(
        `
        *,
        modules!inner(
          id,
          courses!inner(
            id,
            user_id
          )
        )
      `
      )
      .eq('id', fileId)
      .single();

    if (dbError || !dbFile) {
      console.log('❌ File not found in database:', dbError);
      return;
    }

    console.log('✅ File found in database');
    console.log('📄 File details:', {
      id: dbFile.id,
      filename: dbFile.filename,
      storage_path: dbFile.storage_path,
      owner_user_id: (dbFile as any).modules.courses.user_id,
    });

    console.log('  - ID:', dbFile.id);
    console.log('  - Name:', dbFile.name);
    console.log('  - Storage Path:', dbFile.storage_path);
    console.log('  - Status:', dbFile.status);
    console.log('  - Size:', dbFile.size_bytes);
    console.log('  - Created:', dbFile.created_at);

    // 2. Check if file exists in storage
    console.log('\n--- Checking storage existence ---');

    const bucketName = 'course-files';
    const storagePath = dbFile.storage_path;

    // Try to get file info from storage
    const { data: storageInfo, error: storageError } = await supabaseServiceRole.storage
      .from(bucketName)
      .list(storagePath.substring(0, storagePath.lastIndexOf('/')), {
        search: storagePath.substring(storagePath.lastIndexOf('/') + 1),
      });

    if (storageError) {
      console.log('❌ Storage list error:', storageError);
    } else {
      console.log('✅ Storage list result:', storageInfo);
    }

    // 3. Try to create signed URL with service role
    console.log('\n--- Testing signed URL creation ---');

    const { data: signedUrlData, error: signedUrlError } = await supabaseServiceRole.storage
      .from(bucketName)
      .createSignedUrl(storagePath, 3600);

    if (signedUrlError) {
      console.log('❌ Signed URL error:', signedUrlError);
    } else {
      console.log('✅ Signed URL created:', signedUrlData?.signedUrl);
    }

    // 4. Try to get public URL
    console.log('\n--- Testing public URL ---');

    const { data: publicUrlData } = supabaseServiceRole.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    console.log('📄 Public URL:', publicUrlData.publicUrl);

    // 5. List all files in the directory
    console.log('\n--- Listing directory contents ---');

    const dirPath = storagePath.substring(0, storagePath.lastIndexOf('/'));
    const { data: dirContents, error: dirError } = await supabaseServiceRole.storage
      .from(bucketName)
      .list(dirPath);

    if (dirError) {
      console.log('❌ Directory list error:', dirError);
    } else {
      console.log(
        '📁 Directory contents:',
        dirContents?.map((f) => f.name)
      );
    }

    // 6. Check bucket policies
    console.log('\n--- Checking bucket info ---');

    const { data: buckets, error: bucketsError } = await supabaseServiceRole.storage.listBuckets();

    if (bucketsError) {
      console.log('❌ Buckets list error:', bucketsError);
    } else {
      const courseBucket = buckets?.find((b) => b.name === bucketName);
      console.log('🪣 Course files bucket:', courseBucket);
    }
  } catch (error) {
    console.error('❌ Debug function error:', error);
  }

  console.log('=== END STORAGE DEBUG ===\n');
}

export async function listAllFilesInBucket() {
  console.log('=== LISTING ALL FILES IN BUCKET ===');

  try {
    const bucketName = 'course-files';

    // List all files recursively
    const { data: files, error } = await supabaseServiceRole.storage.from(bucketName).list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.log('❌ Error listing files:', error);
      return;
    }

    console.log('📁 Root level files/folders:', files?.length || 0);
    files?.forEach((file) => {
      console.log(`  - ${file.name} (${file.metadata?.size || 'unknown size'})`);
    });
  } catch (error) {
    console.error('❌ List files error:', error);
  }

  console.log('=== END BUCKET LISTING ===\n');
}
