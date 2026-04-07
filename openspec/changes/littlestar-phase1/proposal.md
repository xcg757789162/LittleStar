# Proposal: LittleStar Phase 1 — 幼儿AI自适应学习平台

## Summary

构建 LittleStar（小星辰）幼儿 AI 自适应学习平台的完整 Phase 1，面向幼儿园中班（4-5岁）和大班（5-6岁），涵盖数学、语文、英语三个科目。平台采用 PWA 架构，集成通义千问 AI 作为智能教师，支持自适应学习、手写识别、语音交互、成就系统和家长管理功能。

## Motivation

- 幼儿教育市场缺乏真正个性化的 AI 学习工具
- 现有产品多为固定题库，无法根据孩子的实际掌握程度动态调整
- 家长缺乏有效的学习进度追踪和报告工具
- 需要一个安全、有趣、科学的学习环境，让 4-6 岁儿童能自主学习

## Scope

### In Scope (Phase 1, W1-W12)

- 项目基础设施：React + TypeScript + Vite + Zustand + Dexie.js
- 数据模型与本地存储（IndexedDB）
- 自适应学习引擎：规则引擎、掌握率计算、复习调度器、知识图谱
- 学习界面：闪卡、选择题、手写/涂鸦板、语音互动
- AI 教师集成：通义千问（Qwen）对话、错误分析、鼓励系统
- TTS/STT：CosyVoice + Paraformer
- 家长功能：仪表盘、学习报告、PIN 码验证
- 成就系统：星球收集、连续学习奖励
- PWA + 离线支持（Service Worker）
- 多科目：数学 + 语文 + 英语（幼儿园适龄内容）
- AI 自动出题模板系统（为后续年级扩展预留架构）
- 种子数据/Mock 数据生成

### Out of Scope

- iOS/Android 原生包装（Capacitor，Phase 2）
- 小学年级内容（通过 AI 出题系统自动扩展，Phase 2）
- 后端服务器/云同步（Phase 2）
- 支付系统
- 多用户/教师端

## Impact

- **用户**：幼儿园中班+大班的孩子及其家长
- **文件变更**：全新项目，预计 200+ 文件
- **依赖**：React, TypeScript, Vite, Zustand, Dexie.js, 通义千问 API, CosyVoice, Paraformer
- **风险**：AI API 延迟可能影响交互体验（缓解：本地缓存 + 预加载策略）

## Decision Log

| 决策 | 选项 | 结论 | 原因 |
|------|------|------|------|
| AI 服务 | 千问 vs 豆包 | 千问 | 多模态（手写识别）+ CosyVoice + 教育场景优化 |
| 部署方式 | PWA vs 原生 | PWA | Phase 1 快速验证，原生留 Phase 2 |
| 目标用户 | 5-12岁 vs 4-6岁 | 4-6岁（幼儿园中班+大班） | 用户明确需求 |
| TTS | 浏览器 API vs CosyVoice | CosyVoice | 音色自然，支持儿童友好声音 |
| 内容策略 | 静态题库 vs AI 生成 | 混合（种子+AI 扩展+实时生成） | 种子保质量，AI 扩展可无限扩展 |
| 状态管理 | Redux vs Zustand | Zustand | 轻量、TypeScript 友好 |
| 本地存储 | localStorage vs IndexedDB | Dexie.js (IndexedDB) | 结构化数据、大容量、异步 |
