#!/bin/sh
# ── Working-tree snapshot: the safety net under git ─────────────────────
# Zips the ENTIRE working tree (uncommitted changes included) into a dated,
# never-overwritten archive in ../evcrm-backups/, alongside a full-history
# git bundle. Run it before any risky git operation (checkout/reset/revert),
# before handing off between agents, and on every deploy.
#
#   sh scripts/snapshot.sh "label-for-this-snapshot"
#
# Restore a tree snapshot : unzip into an empty folder — done.
# Restore from a bundle   : git clone evcrm-YYYY-MM-DD.bundle restored/
set -e
cd "$(dirname "$0")/.."

LABEL="${1:-manual}"
LABEL=$(echo "$LABEL" | tr ' /\\:' '----')
STAMP=$(date +%Y-%m-%d_%H%M%S)
DEST="../evcrm-backups"
mkdir -p "$DEST"

# 1. Working tree (code + docs + data), excluding rebuildable/heavy dirs.
TREE="$DEST/tree-$STAMP-$LABEL.zip"
if command -v zip >/dev/null 2>&1; then
  zip -rq "$TREE" . -x "node_modules/*" ".next/*" ".firebase/*" ".git/*"
else
  tar --exclude=node_modules --exclude=.next --exclude=.firebase --exclude=.git \
      -czf "${TREE%.zip}.tgz" .
  TREE="${TREE%.zip}.tgz"
fi

# 2. Full git history bundle (all branches/tags), only if repo has commits.
BUNDLE="$DEST/evcrm-$STAMP.bundle"
git bundle create "$BUNDLE" --all >/dev/null 2>&1 || BUNDLE="(skipped)"

echo "Snapshot complete:"
echo "  tree   : $TREE"
echo "  bundle : $BUNDLE"
