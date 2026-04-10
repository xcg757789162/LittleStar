# Spec: Nginx SPA Fallback 路由

## 概述

修改 `docker/deploy/nginx-app.conf`，将默认 location `/` 从返回 404 改为服务前端 SPA 静态文件，同时确保 API 和 OpenMAIC 路由不受影响。

## 当前配置（需修改）

```nginx
# 当前：返回 404
location / {
    default_type application/json;
    return 404 '{"error":"not_found","message":"Route not found"}';
}
```

## 改造后配置

```nginx
# ============================================================
# 前端静态资源 (Vite 构建产物)
# assets/ 目录下的文件带 content hash，可长期缓存
# ============================================================
location /assets/ {
    alias /app/frontend/assets/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# ============================================================
# 默认: LittleStar 前端 SPA (React Router)
# 所有未匹配的路径都 fallback 到 index.html
# ============================================================
location / {
    root /app/frontend;
    index index.html;
    try_files $uri $uri/ /index.html;
    
    # index.html 本身不缓存（每次获取最新版）
    add_header Cache-Control "no-cache";
}
```

## 路由优先级验证清单

确保以下路由**不会被 SPA fallback 拦截**：

| 路由 | 目标 | 验证方法 |
|------|------|---------|
| `/api/auth/login` | Auth Service :3001 | `curl -X POST` |
| `/api/rest/children` | PostgREST :3000 | `curl -H "Authorization: Bearer ..."` |
| `/openmaic/classroom/xxx` | OpenMAIC :3002 | iframe 加载 |
| `/_next/static/xxx.js` | OpenMAIC :3002 | 浏览器 DevTools |
| `/assets/index-abc123.js` | `/app/frontend/assets/` | 浏览器加载 |
| `/health` | 200 JSON | `curl localhost/health` |
| `/media/xxx.mp3` | `/data/media/` | 浏览器播放 |
| `/login` (SPA 路由) | `/app/frontend/index.html` | 浏览器访问 |
| `/parent/dashboard` (SPA 路由) | `/app/frontend/index.html` | 浏览器访问 |

## 要点

1. **`location /assets/`** 必须在 `location /` 之前或与其并列（Nginx 自动按最长前缀匹配）
2. **`try_files`** 的 fallback 路径 `/index.html` 是相对于 `root` 的
3. **CORS headers**：前端静态文件无需 CORS（同域），但 API 路由保留 CORS headers
4. **Content-Type**：Nginx 根据文件扩展名自动设置，无需额外配置
