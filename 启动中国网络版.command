#!/bin/zsh
cd "${0:A:h}" || exit 1
NODE_BIN="/Users/zhangyudong/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [ ! -x "$NODE_BIN" ]; then NODE_BIN="$(command -v node)"; fi
if [ -z "$NODE_BIN" ]; then
  echo "未找到 Node.js，请先安装 Node.js 20 或更新 Codex。"
  read -k 1
  exit 1
fi
"$NODE_BIN" server.js
