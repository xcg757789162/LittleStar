-- ============================================================
-- 12-migrate-audio-to-files.sql — Migration support
--
-- Provides a function to strip audioBase64 from existing classroom JSON
-- after the external audio files have been written by the migration script.
--
-- Usage (after running the Node.js migration):
--   SELECT api.strip_audio_base64_from_cache();
--   SELECT api.strip_audio_base64_from_snapshots();
-- ============================================================

-- Strip audioBase64 from all speech actions in classroom_cache.classroom_data
-- This is safe to run after the Node.js migration script has externalized audio files.
CREATE OR REPLACE FUNCTION api.strip_audio_base64_from_cache() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
  v_data JSONB;
  v_scenes JSONB;
  v_modified BOOLEAN;
BEGIN
  FOR v_row IN SELECT id, classroom_data FROM api.classroom_cache LOOP
    v_data := v_row.classroom_data;
    v_scenes := v_data->'scenes';
    v_modified := FALSE;

    IF v_scenes IS NOT NULL AND jsonb_typeof(v_scenes) = 'array' THEN
      FOR i IN 0..jsonb_array_length(v_scenes) - 1 LOOP
        DECLARE
          v_actions JSONB := v_scenes->i->'actions';
        BEGIN
          IF v_actions IS NOT NULL AND jsonb_typeof(v_actions) = 'array' THEN
            FOR j IN 0..jsonb_array_length(v_actions) - 1 LOOP
              IF v_actions->j->>'audioBase64' IS NOT NULL THEN
                v_actions := jsonb_set(v_actions, ARRAY[j::text], (v_actions->j) - 'audioBase64');
                v_modified := TRUE;
              END IF;
            END LOOP;
            IF v_modified THEN
              v_scenes := jsonb_set(v_scenes, ARRAY[i::text, 'actions'], v_actions);
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;

    IF v_modified THEN
      v_data := jsonb_set(v_data, '{scenes}', v_scenes);
      UPDATE api.classroom_cache SET classroom_data = v_data WHERE id = v_row.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Same for classroom_snapshots
CREATE OR REPLACE FUNCTION api.strip_audio_base64_from_snapshots() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
  v_data JSONB;
  v_scenes JSONB;
  v_modified BOOLEAN;
BEGIN
  FOR v_row IN SELECT id, classroom_data FROM api.classroom_snapshots LOOP
    v_data := v_row.classroom_data;
    v_scenes := v_data->'scenes';
    v_modified := FALSE;

    IF v_scenes IS NOT NULL AND jsonb_typeof(v_scenes) = 'array' THEN
      FOR i IN 0..jsonb_array_length(v_scenes) - 1 LOOP
        DECLARE
          v_actions JSONB := v_scenes->i->'actions';
        BEGIN
          IF v_actions IS NOT NULL AND jsonb_typeof(v_actions) = 'array' THEN
            FOR j IN 0..jsonb_array_length(v_actions) - 1 LOOP
              IF v_actions->j->>'audioBase64' IS NOT NULL THEN
                v_actions := jsonb_set(v_actions, ARRAY[j::text], (v_actions->j) - 'audioBase64');
                v_modified := TRUE;
              END IF;
            END LOOP;
            IF v_modified THEN
              v_scenes := jsonb_set(v_scenes, ARRAY[i::text, 'actions'], v_actions);
            END IF;
          END IF;
        END;
      END LOOP;
    END IF;

    IF v_modified THEN
      v_data := jsonb_set(v_data, '{scenes}', v_scenes);
      UPDATE api.classroom_snapshots SET classroom_data = v_data WHERE id = v_row.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
