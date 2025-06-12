-- Function to update file positions after deletion
CREATE OR REPLACE FUNCTION update_file_positions(
  p_module_id UUID,
  p_deleted_position INT
) RETURNS VOID AS $$
BEGIN
  UPDATE course_files
  SET position = position - 1
  WHERE module_id = p_module_id
    AND position > p_deleted_position;
END;
$$ LANGUAGE plpgsql;