#!/usr/bin/env node
// Privacy audit for the built extension (.output/chrome-mv3).
// Fails (exit 1) if the bundle can talk to the network or asks for more than it needs.
//   node scripts/audit-network.mjs            (run `npm run build` first)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2] ?? '.output/chrome-mv3');
const ALLOWED_PERMISSIONS = ['storage'];
const ALLOWED_MATCHES = [
  'https://chatgpt.com/*',
  'https://chat.openai.com/*',
  'https://claude.ai/*',
  'https://gemini.google.com/*',
];

// Network-capable APIs. Any hit in the shipped JavaScript is a failure.
const NETWORK_PATTERNS = [
  { name: 'fetch()', re: /\bfetch\s*\(/ },
  { name: 'XMLHttpRequest', re: /\bXMLHttpRequest\b/ },
  { name: 'WebSocket', re: /\bWebSocket\b/ },
  { name: 'EventSource', re: /\bEventSource\b/ },
  { name: 'sendBeacon', re: /\bsendBeacon\b/ },
  { name: 'RTCPeerConnection', re: /\bRTCPeerConnection\b/ },
  { name: 'importScripts', re: /\bimportScripts\s*\(/ },
];

// URL literals that are not network requests (XML namespaces, docs links in comments).
const HARMLESS_URL = /^https?:\/\/(www\.w3\.org\/|wxt\.dev\/|github\.com\/)/;

const failures = [];
const notes = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let files;
try {
  files = walk(OUT);
} catch {
  console.error(`No build found at ${OUT}. Run "npm run build" first.`);
  process.exit(1);
}

for (const file of files.filter((f) => /\.(m?js|html)$/.test(f))) {
  const rel = path.relative(OUT, file);
  const text = readFileSync(file, 'utf8');
  for (const { name, re } of NETWORK_PATTERNS) {
    if (re.test(text)) failures.push(`${rel}: uses ${name}`);
  }
  for (const url of text.match(/https?:\/\/[^\s"'`)<>\\]+/g) ?? []) {
    if (HARMLESS_URL.test(url)) continue;
    // Match patterns for the supported chat sites are expected in the content script.
    if (ALLOWED_MATCHES.some((m) => url.startsWith(m.replace('/*', '')))) continue;
    notes.push(`${rel}: URL literal ${url}`);
  }
  if (/<script[^>]+src=["']https?:/i.test(text)) failures.push(`${rel}: loads a remote script`);
}

const manifest = JSON.parse(readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const permissions = manifest.permissions ?? [];
const extra = permissions.filter((p) => !ALLOWED_PERMISSIONS.includes(p));
if (extra.length) failures.push(`manifest: unexpected permissions ${extra.join(', ')}`);
if (manifest.host_permissions?.length)
  failures.push(`manifest: host_permissions ${manifest.host_permissions.join(', ')}`);
if (manifest.optional_permissions?.length || manifest.optional_host_permissions?.length) {
  failures.push('manifest: optional permissions requested');
}
if (manifest.externally_connectable) failures.push('manifest: externally_connectable is set');
if (manifest.content_security_policy) failures.push('manifest: custom content_security_policy');
for (const script of manifest.content_scripts ?? []) {
  for (const match of script.matches ?? []) {
    if (!ALLOWED_MATCHES.includes(match))
      failures.push(`manifest: content script matches ${match}`);
  }
}

console.log(`Audited ${files.length} files in ${path.relative(process.cwd(), OUT) || OUT}`);
console.log(
  `Permissions: ${JSON.stringify(permissions)} · host_permissions: ${JSON.stringify(manifest.host_permissions ?? [])}`,
);
console.log(
  `Content scripts: ${(manifest.content_scripts ?? []).flatMap((s) => s.matches).join(', ')}`,
);
for (const note of notes) console.log(`note  ${note}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL  ${failure}`);
  process.exit(1);
}
console.log('PASS  no network APIs, no remote code, minimal permissions');
