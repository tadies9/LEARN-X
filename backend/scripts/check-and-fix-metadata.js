const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixMetadata() {
  console.log('🔍 Checking course_files table schema...');
  
  try {
    // Check if metadata column exists
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', {
        table_name: 'course_files',
        schema_name: 'public'
      });

    if (columnsError) {
      console.log('⚠️  Could not check columns, trying direct query...');
      
      // Try a simple query to see if metadata exists
      const { data, error } = await supabase
        .from('course_files')
        .select('id, metadata')
        .limit(1);
      
      if (error && error.message.includes('metadata')) {
        console.log('❌ Metadata column is missing');
        console.log('\n📝 To fix this issue, run this SQL in your Supabase dashboard:\n');
        console.log(`-- Add metadata column to course_files table
ALTER TABLE course_files 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN course_files.metadata IS 'Stores file processing metadata including chunk_count, word_count, processing details, etc.';

-- Create index for common metadata queries
CREATE INDEX IF NOT EXISTS idx_course_files_metadata ON course_files USING GIN (metadata);`);
        console.log('\n✅ After running this SQL, your file uploads should process successfully!');
      } else {
        console.log('✅ Metadata column exists');
        
        // Check for stuck files
        const { data: pendingFiles, error: pendingError } = await supabase
          .from('course_files')
          .select('id, name, status, created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        
        if (pendingFiles && pendingFiles.length > 0) {
          console.log(`\n⚠️  Found ${pendingFiles.length} files stuck in pending status:`);
          pendingFiles.forEach(file => {
            console.log(`  - ${file.name} (${file.id}) - Created: ${new Date(file.created_at).toLocaleString()}`);
          });
          
          console.log('\n💡 These files will automatically reprocess once the worker retries them.');
          console.log('   You can also manually trigger reprocessing from the UI.');
        } else {
          console.log('✅ No files stuck in pending status');
        }
      }
    } else {
      const hasMetadata = columns?.some(col => col.column_name === 'metadata');
      if (hasMetadata) {
        console.log('✅ Metadata column exists');
      } else {
        console.log('❌ Metadata column is missing');
      }
    }
    
    // Check PGMQ status
    console.log('\n🔍 Checking PGMQ queues...');
    const { data: queues, error: queuesError } = await supabase
      .rpc('pgmq.list_queues');
    
    if (queuesError) {
      console.log('⚠️  Could not check PGMQ queues:', queuesError.message);
    } else {
      console.log('✅ PGMQ queues found:', queues?.map(q => q.queue_name).join(', '));
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkAndFixMetadata();