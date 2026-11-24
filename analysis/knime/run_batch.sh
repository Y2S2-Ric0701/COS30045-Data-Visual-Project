#!/usr/bin/env bash
# Run the road_crash_site_data KNIME workflow headless and rebuild the CSVs in src/data/q*/.
# It runs the exported workflow analysis/road_crash_site_data.knwf, so re-export that file
# from KNIME (File → Export) after editing the workflow.
#
# Needs: KNIME Analytics Platform + the free "NodePit Batch" extension
#   (install once: $KNIME -nosplash -application org.eclipse.equinox.p2.director \
#      -repository https://download.nodepit.com/5.12 -installIUs com.nodepit.batch.feature.feature.group)
#
# Usage: analysis/knime/run_batch.sh            (KNIME in ~/knime_5.12.0)
#        KNIME=/path/to/knime analysis/knime/run_batch.sh
set -euo pipefail

KNIME="${KNIME:-$HOME/knime_5.12.0/knime}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
KNWF="$REPO/analysis/road_crash_site_data.knwf"

# Unpack the workflow into a temporary folder. The batch runner treats that folder as the
# workspace, and the workflow's paths start with "COS30045-Data-Visual-Project/", so the
# repo is linked in under that name.
RUN="$(mktemp -d)"
trap 'rm -rf "$RUN"' EXIT
unzip -q "$KNWF" -d "$RUN"
ln -s "$REPO" "$RUN/COS30045-Data-Visual-Project"

set +e
"$KNIME" -nosplash -consoleLog \
  -application com.nodepit.batch.application.NodePitBatchExecutor \
  --reset --no-save "$RUN/road_crash_site_data" 2>&1 \
  | grep -E "ERROR|Execute failed"
status=${PIPESTATUS[0]}
set -e

if [ "$status" -eq 0 ]; then
  echo "OK: src/data/q*/ CSVs rebuilt by KNIME. Check with: git status src/data"
else
  echo "KNIME batch run failed (exit $status: 20 = could not load, 30 = a node failed)." >&2
fi
exit "$status"
