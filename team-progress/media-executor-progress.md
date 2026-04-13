# media-executor progress

- 状态: ✅ 完成
- 负责任务: P0 课堂媒体兼容修复（legacy cache + classroom bridge + TTS 播放字段 + 占位媒体恢复链）
- 工作区: `/Users/chenguoxie/CodeBuddy/OpenMAIC`

## TODO
- [x] 复核课堂媒体断链根因与现有测试
- [x] 修复 legacy classroom 被 cache 误放行的问题
- [x] 修复 `classroom-bridge` 将旧课降成空舞台的问题
- [x] 修复前后端 Pipeline 仅写 `audioBase64` 导致播放器失声的问题
- [x] 补充/更新 cache、bridge、pipeline 回归测试
- [x] 同步 `.codebuddy/project-index.md` 与 `team-progress.md`

## 本次修改
- `src/services/openmaic/cache.ts`
  - 只把 native `scene.content/actions` 可渲染课堂视为有效。
  - `getClassroom()` / `listCachedClassrooms()` / `getCacheSize()` 会自动清理纯 legacy `scene.slides[]` 课堂。
- `src/stores/openmaic/classroom-bridge.ts`
  - 检测到 legacy `scene.slides / imageUrl / audioUrl` 直接报错。
  - 加载失败时主动 `clearStore()`，避免保留上一节课的舞台残影。
- `src/services/openmaic/pipeline-types.ts`
  - 新增 `attachGeneratedSpeechAudio()` 与音频 data URI 规范化工具。
- `src/services/openmaic/pipeline-client.ts`
  - TTS 完成后同步补齐 `audioId/audioUrl`。
- `src/server/services/pipeline-executor.ts`
  - 后端缓存写出前同步补齐 `audioId/audioUrl`。
- 测试
  - `src/services/openmaic/__tests__/cache.test.ts`
  - `src/services/openmaic/__tests__/pipeline-client.test.ts`
  - `src/server/services/__tests__/pipeline-executor.test.ts`
  - `src/stores/openmaic/__tests__/classroom-bridge.test.ts`

## 验证
```bash
python3 -c "import os,subprocess,sys; env=os.environ.copy(); env['PATH']='/Users/chenguoxie/.workbuddy/binaries/node/versions/20.18.0/bin:/usr/local/bin:' + env.get('PATH',''); cmd=['npx','vitest','run','--watch=false','--environment','node','src/services/openmaic/__tests__/cache.test.ts','src/services/openmaic/__tests__/pipeline-client.test.ts','src/server/services/__tests__/pipeline-executor.test.ts','src/stores/openmaic/__tests__/classroom-bridge.test.ts']; p=subprocess.run(cmd,cwd='/Users/chenguoxie/CodeBuddy/OpenMAIC',env=env,capture_output=True,text=True,timeout=180); sys.stdout.write(p.stdout); sys.stderr.write(p.stderr); raise SystemExit(p.returncode)"
```

- 结果：✅ 4 个测试文件、40 条用例全部通过。

## 剩余 blocker
- 无代码 blocker。
- 备注：项目默认 jsdom 依赖链在当前环境会触发 `html-encoding-sniffer -> @exodus/bytes` 的 `ERR_REQUIRE_ESM`，因此本次回归采用 `vitest --environment node` 执行目标单测。该问题属于测试环境依赖噪音，不影响本次修复逻辑通过。 
