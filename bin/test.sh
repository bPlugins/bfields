#!/usr/bin/env bash
#
# bfields — run every suite.
#
# The PHP suites need a WordPress install with Codestar, because they compare
# bfields against REAL Codestar and against the real registered field sets
# rather than a hand-written copy of them (plan 8.2). Point WP_PATH at it.
#
#   WP_PATH=/path/to/wordpress ./bin/test.sh
#   WP_PATH=/path/to/wordpress ./bin/test.sh --php-only   # CI's WordPress job
#
# WP_USER (default 1) must be an administrator: Codestar verifies nonces.
# BFIELDS_SCHEMA_SOURCE=inventory takes the field sets from
# tests/php/fixtures/schema-inventory.json instead of the live registry (CI,
# where 3D Viewer is not installed).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WP_PATH="${WP_PATH:-}"
WP_USER="${WP_USER:-1}"
PHP_ONLY=0

[ "${1:-}" = '--php-only' ] && PHP_ONLY=1

fail=0

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

step 'PHP syntax'
find "$ROOT/php" "$ROOT/tests/php" -name '*.php' -print0 | xargs -0 -n1 php -l > /dev/null
echo 'ok'

if [ "$PHP_ONLY" -eq 0 ]; then
	step 'TypeScript types'
	( cd "$ROOT" && npx tsc -p tsconfig.json --noEmit )
	echo 'ok'

	step 'TypeScript unit (dependency engines vs PHP and vs Codestar)'
	( cd "$ROOT" && npx jest --config jest.config.cjs ) || fail=1

	step 'Bundle dependencies exist on the WordPress floor'
	php "$ROOT/tests/php/asset-deps.php" || fail=1

	step 'PHP engine replays the dependency fixtures'
	php "$ROOT/tests/php/dependency-replay.php" || fail=1
fi

if [ -z "$WP_PATH" ]; then
	printf '\n\033[33mWP_PATH not set — skipping the PHP data suites.\033[0m\n'
	printf 'They need a real install: WP_PATH=/path/to/wordpress ./bin/test.sh\n'
	exit "$fail"
fi

# 3D Viewer registers its Codestar screens only in wp-admin (is_admin()), and
# the product box only on a product edit request
# (ProductMetaPro::isProductEditRequest()). A plain `wp eval-file` has neither,
# so every field set would be missing — which the suites now report as a
# failure rather than a PASS on 0 records (review 3.1).
WP_CONTEXT='define("WP_ADMIN", true); $_SERVER["PHP_SELF"] = "/wp-admin/post.php"; $_GET["post_type"] = "product";'

suite() {
	( cd "$WP_PATH" && BFIELDS_ROOT="$ROOT" wp --user="$WP_USER" --exec="$WP_CONTEXT" eval-file "$ROOT/tests/php/$1" )
}

step 'PHP golden round-trip (stored data must not change: codec and storage)'
suite roundtrip.php || fail=1

step 'PHP seeding parity with real Codestar'
suite seeding.php || fail=1

step 'PHP save parity with real Codestar (rows, validation, hooks)'
suite save-parity.php || fail=1

step 'PHP choices route (option sources: scope and permissions)'
suite choices.php || fail=1

step 'PHP schema defaults (select missing-key value, unit lists)'
suite schema.php || fail=1

step 'PHP field_group storage neutrality (grouped screen stores what the flat one does)'
suite field-group.php || fail=1

step 'PHP update in place (payload, outcomes, nonce refresh; leaves its scratch posts)'
suite update-in-place.php || fail=1

# Needs this checkout's own demo (bfields-3dv-demo.php, the bfields-demo-viewer
# screens design-parity.mjs opens) active, and playwright resolvable; skipped
# rather than failed when it is not, so the data suites still gate on their
# own. NOT the separate, older bfields-demo plugin: gating on that folder ran
# or skipped this check for a demo it never looks at.
DEMO_SLUG="$(basename "$ROOT")"
if [ "$PHP_ONLY" -eq 0 ] && ( cd "$WP_PATH" && wp plugin is-active "$DEMO_SLUG" ) 2>/dev/null; then
	step 'Design parity (rendered screen vs the design repo)'
	( cd "$ROOT" && WP_PATH="$WP_PATH" node tests/e2e/design-parity.mjs ) || fail=1

	step 'Framework meta box saved end to end (demo Postbox screen)'
	( cd "$ROOT" && WP_PATH="$WP_PATH" node tests/e2e/metabox-save.mjs ) || fail=1
elif [ "$PHP_ONLY" -eq 0 ]; then
	printf '\n\033[33mThe %s demo (bfields-3dv-demo.php) is not active — skipping the design parity check.\033[0m\n' "$DEMO_SLUG"
fi

if [ "$fail" -ne 0 ]; then
	printf '\n\033[31mFAILED\033[0m\n'
	exit 1
fi

printf '\n\033[32mAll suites green.\033[0m\n'
