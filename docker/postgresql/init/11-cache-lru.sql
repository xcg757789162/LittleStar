-- ============================================================
-- 11-cache-lru.sql — LRU eviction support for classroom_cache
--
-- 1. Add last_accessed_at for LRU tracking
-- 2. Create function for capacity-based eviction
-- 3. Create function for atomic mastery_records update (E1)
-- ============================================================

-- 1. Add LRU tracking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'api' AND table_name = 'classroom_cache' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE api.classroom_cache ADD COLUMN last_accessed_at TIMESTAMPTZ DEFAULT NOW();
    UPDATE api.classroom_cache SET last_accessed_at = cached_at WHERE last_accessed_at IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classroom_cache_lru
  ON api.classroom_cache (child_id, last_accessed_at ASC);

-- 2. Function to evict oldest cache entries when capacity exceeded.
-- Called after inserting a new cache entry.
-- Keeps at most `max_entries` per child, deleting the least recently accessed.
CREATE OR REPLACE FUNCTION api.evict_classroom_cache(
  p_child_id INTEGER,
  p_max_entries INTEGER DEFAULT 20
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_deleted INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM api.classroom_cache
  WHERE child_id = p_child_id;

  IF v_count > p_max_entries THEN
    DELETE FROM api.classroom_cache
    WHERE id IN (
      SELECT id FROM api.classroom_cache
      WHERE child_id = p_child_id
      ORDER BY last_accessed_at ASC
      LIMIT (v_count - p_max_entries)
    );
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- 3. Atomic mastery_records upsert — avoids frontend read-modify-write race.
-- Computes new mastery level, next review date, and cumulative stats in one call.
CREATE OR REPLACE FUNCTION api.update_mastery(
  p_child_id INTEGER,
  p_knowledge_node_id VARCHAR,
  p_delta INTEGER,
  p_questions INTEGER,
  p_correct INTEGER
) RETURNS TABLE(new_mastery_level INTEGER, new_next_review_date TIMESTAMPTZ) AS $$
DECLARE
  v_mastery INTEGER;
  v_review_days INTEGER;
BEGIN
  INSERT INTO api.mastery_records (
    child_id, knowledge_node_id, mastery_level,
    last_practiced, next_review_date,
    consecutive_correct, total_attempts, total_correct
  )
  VALUES (
    p_child_id, p_knowledge_node_id, GREATEST(0, LEAST(100, 50 + p_delta)),
    NOW(), NOW() + INTERVAL '1 day' * CASE
      WHEN GREATEST(0, LEAST(100, 50 + p_delta)) >= 80 THEN 7
      WHEN GREATEST(0, LEAST(100, 50 + p_delta)) >= 60 THEN 3
      ELSE 1
    END,
    CASE WHEN p_questions > 0 AND p_correct::numeric / p_questions >= 0.8 THEN p_correct ELSE 0 END,
    p_questions,
    p_correct
  )
  ON CONFLICT (child_id, knowledge_node_id) DO UPDATE SET
    mastery_level = GREATEST(0, LEAST(100, mastery_records.mastery_level + p_delta)),
    last_practiced = NOW(),
    next_review_date = NOW() + INTERVAL '1 day' * CASE
      WHEN GREATEST(0, LEAST(100, mastery_records.mastery_level + p_delta)) >= 80 THEN 7
      WHEN GREATEST(0, LEAST(100, mastery_records.mastery_level + p_delta)) >= 60 THEN 3
      ELSE 1
    END,
    consecutive_correct = CASE
      WHEN p_questions > 0 AND p_correct::numeric / p_questions >= 0.8 THEN p_correct
      ELSE 0
    END,
    total_attempts = mastery_records.total_attempts + p_questions,
    total_correct = mastery_records.total_correct + p_correct
  RETURNING mastery_records.mastery_level, mastery_records.next_review_date
  INTO v_mastery, new_next_review_date;

  new_mastery_level := v_mastery;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION api.evict_classroom_cache(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION api.update_mastery(INTEGER, VARCHAR, INTEGER, INTEGER, INTEGER) TO authenticated;
