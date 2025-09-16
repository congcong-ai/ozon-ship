#!/usr/bin/env bash
set -euo pipefail

# 构建纯静态站点（out/），自动临时禁用 app/api 目录以兼容 Next export
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
API_DIR="$ROOT_DIR/app/api"
TMP_DIR="$ROOT_DIR/.api.disabled"
ROUTES_DIR1="$ROOT_DIR/app/ozon/carrier"
ROUTES_DIR2="$ROOT_DIR/app/partner-logistics/carrier"
TMP_ROUTES="$ROOT_DIR/.routes.disabled"

pushd "$ROOT_DIR" >/dev/null

# 临时禁用 API（Route Handlers 与 output:export 不兼容）
if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$TMP_DIR"
  TRASH_API=1
else
  TRASH_API=0
fi

# 临时禁用动态路由（静态导出不支持动态段）
TRASH_ROUTES1=0
TRASH_ROUTES2=0
mkdir -p "$TMP_ROUTES"
if [ -d "$ROUTES_DIR1" ]; then
  mv "$ROUTES_DIR1" "$TMP_ROUTES/ozon_carrier"
  TRASH_ROUTES1=1
fi
if [ -d "$ROUTES_DIR2" ]; then
  mv "$ROUTES_DIR2" "$TMP_ROUTES/partner_carrier"
  TRASH_ROUTES2=1
fi

export NEXT_PUBLIC_USE_STATIC_DATA=true
export NEXT_EXPORT=true

# 安装依赖（确保本地可构建）
if command -v pnpm >/dev/null 2>&1; then
  pnpm i || true
elif command -v yarn >/dev/null 2>&1; then
  yarn || true
else
  npm i || true
fi

# 构建（next.config.mjs 已按 NEXT_EXPORT 输出到 out/）
npx next build

# 还原 API 目录
if [ "$TRASH_API" -eq 1 ]; then
  mv "$TMP_DIR" "$API_DIR"
fi

# 还原动态路由目录
if [ "$TRASH_ROUTES1" -eq 1 ]; then
  mv "$TMP_ROUTES/ozon_carrier" "$ROUTES_DIR1"
fi
if [ "$TRASH_ROUTES2" -eq 1 ]; then
  mv "$TMP_ROUTES/partner_carrier" "$ROUTES_DIR2"
fi
# 清理临时目录（若为空）
rmdir "$TMP_ROUTES" 2>/dev/null || true

popd >/dev/null

echo "静态构建完成：$(realpath "$ROOT_DIR/out")"
