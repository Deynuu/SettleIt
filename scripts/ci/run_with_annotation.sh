#!/usr/bin/env bash
# Run a command; on failure surface the tail of its output as a GitHub annotation
# (annotations are readable via the API even when job logs are not).
title="$1"; shift
out=$("$@" 2>&1); rc=$?
echo "$out"
if [ $rc -ne 0 ]; then
  msg=$(echo "$out" | tail -60 | cut -c1-300 | sed -e 's/%/%25/g' -e ':a;N;$!ba;s/\n/%0A/g')
  echo "::error title=${title} failed (exit ${rc})::${msg}"
fi
exit $rc
