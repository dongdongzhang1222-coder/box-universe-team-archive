#!/bin/zsh
set -e
cd "${0:A:h}"
./启动中国网络版.command &
SERVER_PID=$!
sleep 1
open "http://127.0.0.1:${PORT:-8767}/"
wait "$SERVER_PID"
