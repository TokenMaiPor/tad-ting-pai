import { execSync } from 'node:child_process';

// Always test the current source: build the extension before the smoke tests run.
export default function globalSetup() {
  execSync('npx wxt build', { stdio: 'inherit' });
}
