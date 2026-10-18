import { spawnSync } from 'node:child_process';

// Container/CI installs must not change the developer checkout's hook configuration.
if (
  process.env.HUSKY !== '0' &&
  process.env.CI !== 'true' &&
  process.env.NODE_ENV !== 'production'
) {
  const { default: husky } = await import('husky');
  const error = husky();
  if (error) {
    console.error(`Hook installation failed: ${error}`);
    process.exitCode = 1;
  } else {
    const check = spawnSync(
      process.execPath,
      ['.husky/commit-message.cjs', 'doctor'],
      { stdio: 'inherit' },
    );
    if (check.error) throw check.error;
    process.exitCode = check.status ?? 1;
  }
}
