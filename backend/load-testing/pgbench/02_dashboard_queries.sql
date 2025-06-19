-- Enhanced pgbench script for dashboard query patterns
-- Tests real dashboard scenarios with varied complexity

\set user_id '''b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'''::uuid
\set days_back random(7, 90)
\set query_type random(1, 5)

-- Query 1: Real-time user stats (35% of queries)
\if :query_type == 1
  SELECT 
    c.id,
    c.title,
    c.description,
    c.color,
    c.created_at,
    COUNT(DISTINCT m.id) as module_count,
    COUNT(DISTINCT fc.id) as file_count,
    COUNT(DISTINCT CASE WHEN fc.status = 'completed' THEN fc.id END) as processed_files,
    COALESCE(AVG(
      CASE WHEN fc.status = 'completed' 
      THEN EXTRACT(EPOCH FROM fc.updated_at - fc.created_at) / 60 
      END
    ), 0) as avg_processing_minutes
  FROM courses c
  LEFT JOIN modules m ON c.id = m.course_id
  LEFT JOIN course_files fc ON m.id = fc.module_id
  WHERE c.user_id = :user_id
    AND c.is_archived = false
  GROUP BY c.id, c.title, c.description, c.color, c.created_at
  ORDER BY c.updated_at DESC;
\fi

-- Query 2: Activity timeline with persona context (25% of queries)
\if :query_type == 2
  WITH user_persona AS (
    SELECT 
      learning_style,
      content_preferences,
      communication_tone
    FROM personas 
    WHERE user_id = :user_id
  )
  SELECT 
    'file_upload' as activity_type,
    fc.id as item_id,
    fc.name as item_name,
    fc.created_at as activity_time,
    fc.status,
    fc.size_bytes,
    m.title as module_name,
    c.title as course_name,
    up.learning_style ->> 'pace' as learning_pace
  FROM course_files fc
  JOIN modules m ON fc.module_id = m.id
  JOIN courses c ON m.course_id = c.id
  CROSS JOIN user_persona up
  WHERE c.user_id = :user_id
    AND fc.created_at >= NOW() - INTERVAL ':days_back days'
  ORDER BY fc.created_at DESC
  LIMIT 20;
\fi

-- Query 3: Vector search analytics (20% of queries)
\if :query_type == 3
  SELECT 
    c.title as course_name,
    COUNT(fc.id) as total_chunks,
    COUNT(CASE WHEN fe.chunk_id IS NOT NULL THEN 1 END) as embedded_chunks,
    COUNT(CASE WHEN fc.importance = 'high' THEN 1 END) as high_importance_chunks,
    AVG(LENGTH(fc.content)) as avg_chunk_length,
    COUNT(CASE WHEN fc.chunk_type = 'summary' THEN 1 END) as summary_chunks,
    MAX(fc.updated_at) as last_processed
  FROM courses c
  JOIN modules m ON c.id = m.course_id
  JOIN course_files cf ON m.id = cf.module_id
  JOIN file_chunks fc ON cf.id = fc.file_id
  LEFT JOIN file_embeddings fe ON fc.id = fe.chunk_id
  WHERE c.user_id = :user_id
    AND cf.status = 'completed'
  GROUP BY c.id, c.title
  HAVING COUNT(fc.id) > 0
  ORDER BY embedded_chunks DESC;
\fi

-- Query 4: Performance monitoring (15% of queries)
\if :query_type == 4
  WITH processing_stats AS (
    SELECT 
      cf.id,
      cf.status,
      cf.created_at,
      cf.updated_at,
      EXTRACT(EPOCH FROM cf.updated_at - cf.created_at) / 60 as processing_minutes,
      cf.size_bytes,
      COUNT(fc.id) as chunk_count
    FROM course_files cf
    JOIN modules m ON cf.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    LEFT JOIN file_chunks fc ON cf.id = fc.file_id
    WHERE c.user_id = :user_id
      AND cf.created_at >= NOW() - INTERVAL ':days_back days'
    GROUP BY cf.id, cf.status, cf.created_at, cf.updated_at, cf.size_bytes
  )
  SELECT 
    status,
    COUNT(*) as file_count,
    AVG(processing_minutes) as avg_processing_minutes,
    MAX(processing_minutes) as max_processing_minutes,
    AVG(size_bytes) as avg_file_size,
    AVG(chunk_count) as avg_chunks_per_file,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_minutes) as p95_processing_time
  FROM processing_stats
  GROUP BY status
  ORDER BY 
    CASE status 
      WHEN 'processing' THEN 1 
      WHEN 'completed' THEN 2 
      WHEN 'failed' THEN 3 
      ELSE 4 
    END;
\fi

-- Query 5: User engagement patterns (5% of queries)
\if :query_type == 5
  WITH daily_activity AS (
    SELECT 
      DATE(created_at) as activity_date,
      COUNT(*) as files_uploaded,
      SUM(size_bytes) as total_bytes
    FROM course_files cf
    JOIN modules m ON cf.module_id = m.id
    JOIN courses c ON m.course_id = c.id
    WHERE c.user_id = :user_id
      AND cf.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  )
  SELECT 
    activity_date,
    files_uploaded,
    total_bytes,
    LAG(files_uploaded) OVER (ORDER BY activity_date) as prev_day_files,
    CASE 
      WHEN LAG(files_uploaded) OVER (ORDER BY activity_date) IS NOT NULL 
      THEN files_uploaded - LAG(files_uploaded) OVER (ORDER BY activity_date)
      ELSE 0 
    END as daily_change
  FROM daily_activity
  ORDER BY activity_date DESC
  LIMIT 30;
\fi