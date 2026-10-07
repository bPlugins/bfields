#!/usr/bin/env bash
#
# bfields — build the runtime artifact.
#
# dist/bfields.zip is what a host unzips into lib/bfields/ and commits (plan
# 4.1). It carries php/, build/ and languages/ ONLY: no ui/ sources, no tests,
# no node_modules, no golden fixtures (those contain real site data).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(sed -n "s/.*\$bfields_this_version = '\([^']*\)'.*/\1/p" php/bootstrap.php | head -1)"
LOADER_VERSION="$(sed -n "s/.*const VERSION = '\([^']*\)'.*/\1/p" php/includes/load.php | head -1)"

if [ "$VERSION" != "$LOADER_VERSION" ]; then
	echo "Version mismatch: bootstrap.php says $VERSION, load.php says $LOADER_VERSION."
	echo "They must match, or arbitration will load a copy that reports the wrong version."
	exit 1
fi

echo "Packaging bfields $VERSION"

npm run build

rm -rf dist
mkdir -p dist/bfields

cp -R php dist/bfields/php
cp -R build dist/bfields/build
cp -R languages dist/bfields/languages
cp README.md LICENSE composer.json dist/bfields/

find dist -name '.DS_Store' -delete

( cd dist && zip -rq "bfields.zip" bfields )
rm -rf dist/bfields

# The demo is a development harness, not part of the library (see
# bfields-3dv-demo.php). It is excluded by the copy list above rather than by a
# filter, so this is a tripwire, not the mechanism: if a future edit adds demo/
# or the demo plugin file to what gets packaged, the release stops here instead
# of shipping a plugin header and a second React root into every host.
if unzip -l dist/bfields.zip | grep -qE 'bfields/demo/|bfields-3dv-demo\.php'; then
	echo "The demo leaked into dist/bfields.zip. It must never ship inside a host plugin."
	exit 1
fi

echo "Wrote dist/bfields.zip ($(du -h dist/bfields.zip | cut -f1))"
