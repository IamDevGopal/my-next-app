const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  normalizeMessage,
  headerLocation,
  validateHeader,
} = require('./commit-policy.cjs');
const root = path.resolve(__dirname, '..');
const cli = path.join(root, 'node_modules/@commitlint/cli/cli.js');

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function lint(args, input) {
  if (!fs.existsSync(cli))
    throw new Error(
      'Local commitlint is missing. Install development dependencies with npm ci, then npm run hooks:install.',
    );
  const result = spawnSync(
    process.execPath,
    [cli, '--config', path.join(root, 'commitlint.config.cjs'), ...args],
    {
      stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'],
      input,
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

function doctor() {
  const hooksPath = git(['config', '--get', 'core.hooksPath']);
  const toplevel = git(['rev-parse', '--show-toplevel']);
  if (!hooksPath || !toplevel)
    throw new Error(
      'Git hooks are not configured. Run npm run hooks:install from this repository.',
    );
  const active = path.resolve(toplevel, hooksPath);
  if (fs.realpathSync(active) !== fs.realpathSync(path.join(root, '.husky/_')))
    throw new Error(
      `Unexpected core.hooksPath: ${hooksPath}. Run npm run hooks:install.`,
    );
  for (const hook of ['prepare-commit-msg', 'commit-msg', 'h']) {
    if (!fs.existsSync(path.join(active, hook)))
      throw new Error(
        `Missing Husky launcher: ${hook}. Run npm run hooks:install.`,
      );
  }
  if (!fs.existsSync(cli))
    throw new Error(
      'Local commitlint is missing. Run npm ci with development dependencies.',
    );
  console.log(
    'Commit hooks ready: Husky launchers, final normalization and local commitlint.',
  );
}

function assertMessage(message, comment = '#', context = 'Commit message') {
  const location = headerLocation(message, comment);
  if (!location)
    throw new Error(
      `${context} is empty. Write a type and summary, e.g. feat(auth): add login.`,
    );
  const [valid, reason] = validateHeader(location.header);
  if (!valid) throw new Error(`${context}: ${reason}`);
}

function main() {
  const [mode, file] = process.argv.slice(2);
  if (mode === 'doctor') return doctor();
  if (mode === 'range') {
    const base = process.env.COMMIT_BASE;
    const head = process.env.COMMIT_HEAD || 'HEAD';
    if (base && !/^0+$/.test(base)) {
      const revision = spawnSync('git', ['rev-list', `${base}..${head}`], {
        encoding: 'utf8',
      });
      if (revision.error) throw revision.error;
      if (revision.status !== 0)
        throw new Error(
          'Cannot resolve commit range; fetch base and head history first.',
        );
      for (const id of revision.stdout.trim().split(/\s+/).filter(Boolean)) {
        assertMessage(
          git(['show', '--no-patch', '--format=%B', id]),
          '#',
          `Commit ${id}`,
        );
      }
      return lint(['--from', base, '--to', head]);
    }
    // First branch push/manual runs validate the tip, not all pre-policy legacy history.
    const message = git(['show', '--no-patch', '--format=%B', head]);
    assertMessage(message, '#', `Commit ${head}`);
    return lint([], `${message}\n`);
  }
  if (!['prepare', 'finalize'].includes(mode) || !file)
    throw new Error(
      'Usage: commit-message.cjs prepare|finalize <message-file>, doctor, or range',
    );
  const original = fs.readFileSync(file, 'utf8');
  const comment =
    git(['config', '--get', 'core.commentString']) ||
    git(['config', '--get', 'core.commentChar']) ||
    '#';
  const normalized = normalizeMessage(original, {
    branch: git(['symbolic-ref', '--quiet', '--short', 'HEAD']),
    comment: comment === 'auto' ? '#' : comment,
  });
  if (original !== normalized) fs.writeFileSync(file, normalized, 'utf8');
  if (mode === 'finalize') {
    // Same header rule as the CI plugin, without loading commitlint on every local commit.
    assertMessage(normalized, comment === 'auto' ? '#' : comment);
  }
}

try {
  main();
} catch (error) {
  console.error(`Commit convention: ${error.message}`);
  process.exitCode = 1;
}
