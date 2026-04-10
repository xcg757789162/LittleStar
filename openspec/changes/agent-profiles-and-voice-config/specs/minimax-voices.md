# MiniMax TTS 音色规格

## 数据来源

所有音色 voice_id 来自 MiniMax 官方系统音色列表：
- 文档地址：https://platform.minimaxi.com/docs/faq/system-voice-id
- 查询时间：2026-04-10

## 音色列表定义

### TypeScript 接口

```typescript
interface MiniMaxVoice {
  /** MiniMax 官方 voice_id */
  id: string
  /** 中文显示名 */
  label: string
  /** 性别分类 */
  gender: 'male' | 'female' | 'boy' | 'girl'
}
```

### 完整音色列表

| # | voice_id | 显示名 | gender | MiniMax 官方名称 | 适用角色 |
|---|----------|--------|--------|-----------------|---------|
| 1 | `female-tianmei` | 甜美女声 | female | 甜美女性音色 | 教师默认 |
| 2 | `female-chengshu` | 成熟女声 | female | 成熟女性音色 | 教师/助教 |
| 3 | `female-shaonv` | 少女音色 | female | 少女音色 | 学生角色 |
| 4 | `female-yujie` | 知性女声 | female | 御姐音色 | 教师 |
| 5 | `male-qn-qingse` | 青涩青年 | male | 青涩青年音色 | 教师 |
| 6 | `male-qn-jingying` | 精英青年 | male | 精英青年音色 | 助教 |
| 7 | `male-qn-daxuesheng` | 大学生音色 | male | 大学生音色 | 学生角色 |
| 8 | `clever_boy` | 聪明男童 | boy | 聪明男童 | 学生角色 |
| 9 | `cute_boy` | 可爱男童 | boy | 可爱男童 | 学生角色 |
| 10 | `lovely_girl` | 萌萌女童 | girl | 萌萌女童 | 学生角色 |
| 11 | `Chinese (Mandarin)_Gentleman` | 温润男声 | male | 温润绅士 | 思考者 |
| 12 | `Chinese (Mandarin)_Sweet_Lady` | 甜美淑女 | female | 甜美淑女 | 教师 |

### 筛选标准

1. **语言**：中文普通话（Mandarin Chinese）系统音色
2. **风格**：温和、亲切、不恐怖、不成人化
3. **多样性**：覆盖男声（3）、女声（5）、男童（2）、女童（1），共 12 个
4. **稳定性**：仅选用官方系统音色，不使用自定义音色或第三方音色

### 分组建议（UI 下拉用）

```
👧 女声
  - 甜美女声 (female-tianmei)
  - 成熟女声 (female-chengshu)
  - 少女音色 (female-shaonv)
  - 知性女声 (female-yujie)
  - 甜美淑女 (Chinese (Mandarin)_Sweet_Lady)

👦 男声
  - 青涩青年 (male-qn-qingse)
  - 精英青年 (male-qn-jingying)
  - 大学生音色 (male-qn-daxuesheng)
  - 温润男声 (Chinese (Mandarin)_Gentleman)

🧒 童声
  - 聪明男童 (clever_boy)
  - 可爱男童 (cute_boy)
  - 萌萌女童 (lovely_girl)
```

## 注意事项

- `Chinese (Mandarin)_Gentleman` 和 `Chinese (Mandarin)_Sweet_Lady` 的 voice_id 包含空格和括号，使用时需注意 URL 编码
- MiniMax TTS 调用时音色参数名为 `voice_setting.voice_id`，但在 OpenMAIC 中通过 `x-tts-voice` Header 传递，由后端转换为 MiniMax API 参数
- 所有音色均支持中英混读，适合英语教学场景
