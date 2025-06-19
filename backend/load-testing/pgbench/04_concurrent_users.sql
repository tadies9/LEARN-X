-- pgbench script for concurrent user scenarios
-- Simulates multiple users accessing the system simultaneously

-- Random user selection from a pool
\set user_pool 10
\set user_idx random(1, :user_pool)

-- Generate dynamic user ID (in real scenario, use actual user IDs)
\set user_id '''b2ce911b-ae6a-46b5-9eaa-''' || lpad(:user_idx::text, 12, '0') || '''::uuid'

-- Query 1: User login - fetch user data and permissions
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.updated_at,
  COUNT(DISTINCT c.id) as course_count,
  COUNT(DISTINCT p.id) as persona_count
FROM users u
LEFT JOIN courses c ON u.id = c.user_id
LEFT JOIN personas p ON u.id = p.user_id
WHERE u.id = :user_id
GROUP BY u.id, u.email, u.created_at, u.updated_at;

-- Query 2: Load user's recent activity
SELECT 
  'course' as activity_type,
  c.id as item_id,
  c.name as item_name,
  c.updated_at as activity_time
FROM courses c
WHERE c.user_id = :user_id
UNION ALL
SELECT 
  'session' as activity_type,
  ls.id as item_id,
  cf.name as item_name,
  ls.start_time as activity_time
FROM learning_sessions ls
JOIN course_files cf ON ls.file_id = cf.id
WHERE ls.user_id = :user_id
ORDER BY activity_time DESC
LIMIT 20;

-- Query 3: Create a new learning session
INSERT INTO learning_sessions (
  id,
  user_id,
  file_id,
  start_time,
  last_accessed
) VALUES (
  gen_random_uuid(),
  :user_id,
  (SELECT id FROM course_files 
   WHERE module_id IN (
     SELECT m.id FROM modules m 
     JOIN courses c ON m.course_id = c.id 
     WHERE c.user_id = :user_id
   )
   ORDER BY RANDOM() 
   LIMIT 1
  ),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;