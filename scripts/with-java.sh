#!/bin/sh
# Runs a command with a Java runtime on PATH (Firebase emulators need Java 21+).
if ! java -version >/dev/null 2>&1; then
  for dir in /opt/homebrew/opt/openjdk@21/bin /usr/local/opt/openjdk@21/bin; do
    [ -x "$dir/java" ] && PATH="$dir:$PATH" && break
  done
fi
export PATH
exec "$@"
