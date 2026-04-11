# ============================================================
# Nginx Gateway Dockerfile
# ============================================================
FROM nginx:1.27-alpine

# 移除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义配置
COPY nginx.conf /etc/nginx/conf.d/littlestar.conf

# 复制 iframe 桥接脚本（通过 sub_filter 注入到 OpenMAIC iframe 页面）
COPY iframe-bridge.js /etc/nginx/iframe-bridge.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
