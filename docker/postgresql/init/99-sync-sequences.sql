-- =============================================================
-- 99-sync-sequences.sql
--
-- Docker 初始化脚本按字母序执行，这个文件放在最后（99-），确保在
-- 所有 seed 脚本（用显式 id 写入的表）执行完后，把对应的序列推进到
-- MAX(id)，避免后续 INSERT 用 nextval 拿到一个已经被占用的 id
-- 导致 "duplicate key value violates unique constraint xxx_pkey"。
--
-- 这个脚本幂等，任何时候重跑都安全。
-- =============================================================

DO $$
DECLARE
  seq_row RECORD;
  tbl_name TEXT;
  max_id BIGINT;
BEGIN
  FOR seq_row IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'api' AND sequence_name LIKE '%_id_seq'
  LOOP
    -- 从序列名推回表名：<table>_id_seq → <table>
    tbl_name := regexp_replace(seq_row.sequence_name, '_id_seq$', '');

    BEGIN
      EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM api.%I', tbl_name) INTO max_id;
    EXCEPTION
      WHEN undefined_table OR undefined_column THEN
        RAISE NOTICE 'skip api.%: 表或 id 列不存在', tbl_name;
        CONTINUE;
    END;

    IF max_id > 0 THEN
      EXECUTE format('SELECT setval(''api.%I'', %s)', seq_row.sequence_name, max_id);
      RAISE NOTICE '✓ api.% synced to %', seq_row.sequence_name, max_id;
    END IF;
  END LOOP;
END $$;
