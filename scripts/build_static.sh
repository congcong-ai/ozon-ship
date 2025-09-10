#!/usr/bin/env bash
set -euo pipefail

# 构建纯静态站点（out/），自动临时禁用 app/api 目录以兼容 Next export
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
API_DIR="$ROOT_DIR/app/api"
TMP_DIR="$ROOT_DIR/.api.disabled"

pushd "$ROOT_DIR" >/dev/null

# 临时禁用 API（Route Handlers 与 output:export 不兼容）
if [ -d "$API_DIR" ]; then
  mv "$API_DIR" "$TMP_DIR"
  TRASH_API=1
else
  TRASH_API=0
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

popd >/dev/null

echo "静态构建完成：$(realpath "$ROOT_DIR/out")"
