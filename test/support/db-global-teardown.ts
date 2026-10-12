import { execFileSync } from 'child_process';

export default function teardown() {
  const container = process.env.TEST_DB_CONTAINER;
  if (container) {
    execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
  }
}
