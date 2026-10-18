const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const {
  icons,
  normalizeMessage,
  hasCanonicalIcon,
  validateHeader,
} = require('./commit-policy.cjs');
const root = path.resolve(__dirname, '..');

for (const [type, icon] of Object.entries(icons)) {
  test(`${type}: canonical icon, correction and idempotence`, () => {
    const message = `${type}(api)!: Add API support\r\n\r\nBody stays exactly as written.\r\n\r\nBREAKING CHANGE: old API removed\r\nSigned-off-by: Fixture <fixture@example.invalid>\r\n`;
    const expected = `${icon} ${message}`;
    assert.equal(
      normalizeMessage(message, { branch: 'fix/unrelated' }),
      expected,
    );
    assert.equal(normalizeMessage(`🚧 🐛 ${message}`), expected);
    assert.equal(normalizeMessage(`:sparkles: ${message}`), expected);
    assert.equal(normalizeMessage(expected), expected);
    assert.equal(hasCanonicalIcon(expected.split('\r\n')[0]), true);
  });
}

test('draft comments, BOM, CRLF and verbose scissors preserve body bytes', () => {
  const body =
    '\r\n\r\nKeep body: feat: literal text\r\n\r\n# ------------------------ >8 ------------------------\r\ndiff --git a/a b/a\r\n';
  assert.equal(
    normalizeMessage(`\uFEFF# template\r\n\r\nFIX(Auth): repair flow${body}`),
    `\uFEFF# template\r\n\r\n🐛 fix(auth): repair flow${body}`,
  );
  assert.equal(
    normalizeMessage(
      '# ------------------------ >8 ------------------------\ndiff --git a/a b/a',
      { branch: 'feat/test' },
    ),
    '# ------------------------ >8 ------------------------\ndiff --git a/a b/a',
  );
  assert.equal(
    normalizeMessage('; template\nfix: repair flow\n', { comment: ';' }),
    '; template\n🐛 fix: repair flow\n',
  );
});

test('branch fallback is bounded; explicit metadata wins and unknown types are not relabeled', () => {
  assert.equal(
    normalizeMessage('repair flow\n', { branch: 'hotfix/issue-42' }),
    '🐛 fix: repair flow\n',
  );
  assert.equal(
    normalizeMessage('add flow\n', { branch: 'feature/auth/login' }),
    '✨ feat: add flow\n',
  );
  assert.equal(
    normalizeMessage('docs: explain hooks', { branch: 'feature/auth' }),
    '📝 docs: explain hooks',
  );
  for (const branch of [
    'main',
    'master',
    'release/1.0',
    '',
    'unknown/branch',
  ]) {
    assert.equal(
      normalizeMessage('unclear purpose', { branch }),
      'unclear purpose',
    );
  }
  for (const message of ['unknown: explain change', 'feat:', 'fix(auth):']) {
    assert.equal(
      normalizeMessage(message, { branch: 'feature/auth' }),
      message,
    );
  }
});

test('Git-generated autosquash/merge messages stay intact; native reverts receive the revert icon', () => {
  for (const message of [
    "Merge branch 'feature/hooks'",
    'Merge pull request #42 from org/branch',
    'fixup! feat: original',
    'squash! 🐛 fix: original',
    'amend! feat: original',
  ]) {
    assert.equal(normalizeMessage(message), message);
  }
  assert.equal(
    normalizeMessage(
      'Revert "✨ feat: original"\n\nThis reverts commit abc.\n',
    ),
    '⏪ revert: revert "✨ feat: original"\n\nThis reverts commit abc.\n',
  );
});

test('real commitlint accepts valid contracts and rejects missing, wrong, duplicate or arbitrary icons', async () => {
  const load = (await import('@commitlint/load')).default;
  const lint = (await import('@commitlint/lint')).default;
  const config = await load({}, { cwd: root });
  const validate = (message) =>
    lint(message, config.rules, {
      parserOpts: config.parserPreset.parserOpts,
      plugins: config.plugins,
      ignores: config.ignores,
      defaultIgnores: config.defaultIgnores,
    });
  for (const [type, icon] of Object.entries(icons)) {
    const result = await validate(
      `${icon} ${type}(api)!: Add API support\n\nBREAKING CHANGE: old API removed`,
    );
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    assert.equal(
      validateHeader(`${icon} ${type}(api)!: Add API support`)[0],
      result.valid,
    );
  }
  for (const message of [
    'feat: add flow',
    '🐛 feat: add flow',
    'hello feat: add flow',
    '✨ ✨ feat: add flow',
    '✨ feat:',
    '✨ unknown: add flow',
    'v1.0.0',
    'untyped change',
  ]) {
    assert.equal((await validate(message)).valid, false, message);
    assert.equal(validateHeader(message)[0], false, message);
  }
  for (const message of [
    "Merge branch 'feature/hooks'",
    'fixup! ✨ feat: original',
  ]) {
    assert.equal((await validate(message)).valid, true, message);
  }
  const parse = (await import('@commitlint/parse')).default;
  const parsed = await parse(
    '✨ feat(api)!: Change API\n\nBREAKING CHANGE: old API removed',
    undefined,
    config.parserPreset.parserOpts,
  );
  assert.equal(parsed.type, 'feat');
  assert.equal(parsed.scope, 'api');
  assert.equal(parsed.subject, 'Change API');
  assert.equal(parsed.notes[0].title, 'BREAKING CHANGE');
  const headerOnly = await parse(
    '✨ feat(api)!: Change API',
    undefined,
    config.parserPreset.parserOpts,
  );
  assert.equal(headerOnly.notes[0].text, 'Change API');
  assert.equal(
    (await validate('✨ feat(auth,notifications): Add API support')).valid,
    true,
  );
});

function shellQuote(value) {
  return `'${value.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`;
}

test('Git + Husky lifecycle in an isolated gitfile checkout with spaces', async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow commit hooks-'));
  const cwd = path.join(temp, 'checkout');
  fs.mkdirSync(path.join(cwd, '.husky'), { recursive: true });
  const modules = path.join(cwd, 'node_modules');
  const env = {
    ...process.env,
    HUSKY: '',
    CI: '',
    NODE_ENV: 'development',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(temp, 'global-config'),
    GIT_TERMINAL_PROMPT: '0',
  };
  for (const key of [
    'GIT_DIR',
    'GIT_COMMON_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_CONFIG_COUNT',
    'GIT_EDITOR',
    'GIT_SEQUENCE_EDITOR',
  ])
    delete env[key];
  function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
      cwd,
      env,
      encoding: 'utf8',
      ...options,
    });
    if (result.error) throw result.error;
    if (!options.allowFailure)
      assert.equal(
        result.status,
        0,
        `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`,
      );
    return result;
  }
  const git = (...args) => run('git', args).stdout.trimEnd();
  const message = () => git('log', '-1', '--format=%B');
  try {
    fs.writeFileSync(env.GIT_CONFIG_GLOBAL, '');
    for (const file of [
      'prepare-commit-msg',
      'commit-msg',
      'commit-policy.cjs',
      'commit-message.cjs',
      'install.mjs',
    ]) {
      fs.copyFileSync(
        path.join(__dirname, file),
        path.join(cwd, '.husky', file),
      );
    }
    fs.copyFileSync(
      path.join(root, 'commitlint.config.cjs'),
      path.join(cwd, 'commitlint.config.cjs'),
    );
    fs.writeFileSync(path.join(cwd, 'package.json'), '{"private":true}\n');
    fs.symlinkSync(
      path.join(root, 'node_modules'),
      modules,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    git(
      'init',
      '--initial-branch=main',
      `--separate-git-dir=${path.join(temp, 'metadata')}`,
    );
    git('config', 'user.name', 'Hook Fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    assert.equal(fs.lstatSync(path.join(cwd, '.git')).isFile(), true);
    run(process.execPath, ['.husky/install.mjs'], {
      env: { ...env, HUSKY: '0' },
    });
    assert.notEqual(
      run('git', ['config', '--get', 'core.hooksPath'], { allowFailure: true })
        .status,
      0,
    );
    run(process.execPath, ['.husky/install.mjs']);
    assert.equal(git('config', '--get', 'core.hooksPath'), '.husky/_');

    await t.test(
      'VS Code/Copilot-style file message retains body and trailers',
      () => {
        const draft = path.join(cwd, 'message with spaces.txt');
        fs.writeFileSync(
          draft,
          'feat(auth): Add login\n\n- preserve Copilot body\n\nSigned-off-by: Fixture <fixture@example.invalid>\n',
        );
        git('commit', '--allow-empty', '--file', draft);
        assert.equal(
          message(),
          '✨ feat(auth): Add login\n\n- preserve Copilot body\n\nSigned-off-by: Fixture <fixture@example.invalid>',
        );
      },
    );
    await t.test(
      'editor-written message is normalized after prepare hook',
      () => {
        const editor = path.join(cwd, 'fixture editor.cjs');
        fs.writeFileSync(
          editor,
          `require('node:fs').writeFileSync(process.argv[2], ${JSON.stringify('fix(hooks): repair editor flow\n\nKeep editor body.\n')});\n`,
        );
        git('config', 'core.editor', `node ${shellQuote(editor)}`);
        git('commit', '--allow-empty');
        assert.equal(
          message(),
          '🐛 fix(hooks): repair editor flow\n\nKeep editor body.',
        );
      },
    );
    await t.test(
      'amend is idempotent and incorrect/multiple icons are corrected',
      () => {
        git('commit', '--amend', '--allow-empty', '--no-edit');
        assert.equal(message().startsWith('🐛 fix(hooks):'), true);
        git(
          'commit',
          '--allow-empty',
          '-m',
          '🚀 🐛 feat(api)!: Change API',
          '-m',
          'BREAKING CHANGE: old API removed',
        );
        assert.equal(
          message(),
          '✨ feat(api)!: Change API\n\nBREAKING CHANGE: old API removed',
        );
      },
    );
    await t.test(
      'ambiguous main-branch messages fail without creating a commit',
      () => {
        const before = git('rev-parse', 'HEAD');
        const rejected = run(
          'git',
          ['commit', '--allow-empty', '-m', 'unclear purpose'],
          { allowFailure: true },
        );
        assert.notEqual(rejected.status, 0);
        assert.equal(git('rev-parse', 'HEAD'), before);
        const empty = run(
          'git',
          ['commit', '--allow-empty', '--allow-empty-message', '-m', ''],
          { allowFailure: true },
        );
        assert.notEqual(empty.status, 0);
        assert.equal(git('rev-parse', 'HEAD'), before);
      },
    );
    await t.test('branch fallback and prepare hook with --no-verify', () => {
      git('switch', '-c', 'fix/hook-runtime');
      git('commit', '--allow-empty', '-m', 'repair normalization');
      assert.equal(message(), '🐛 fix: repair normalization');
      git('commit', '--allow-empty', '--no-verify', '-m', 'docs: explain flow');
      assert.equal(message(), '📝 docs: explain flow');
    });
    await t.test(
      'native revert and autosquash markers preserve Git workflows',
      () => {
        fs.writeFileSync(path.join(cwd, 'tracked.txt'), 'fixture\n');
        git('add', 'tracked.txt');
        git('commit', '-m', 'feat: add fixture');
        git('revert', '--no-edit', 'HEAD');
        assert.equal(
          message().startsWith('⏪ revert: revert "✨ feat: add fixture"'),
          true,
        );
        git('commit', '--allow-empty', '--fixup', 'HEAD');
        assert.equal(message().startsWith('fixup! ⏪ revert:'), true);
      },
    );
    await t.test('native merge messages retain Git format', () => {
      git('switch', 'main');
      git(
        'merge',
        '--no-ff',
        'fix/hook-runtime',
        '-m',
        "Merge branch 'fix/hook-runtime'",
      );
      assert.equal(message(), "Merge branch 'fix/hook-runtime'");
    });
    await t.test('CI range validator accepts canonical new commits', () => {
      const base = git('rev-parse', 'HEAD');
      git('commit', '--allow-empty', '-m', 'ci: verify new commit range');
      const head = git('rev-parse', 'HEAD');
      run(process.execPath, ['.husky/commit-message.cjs', 'range'], {
        env: { ...env, COMMIT_BASE: base, COMMIT_HEAD: head },
      });
      run(process.execPath, ['.husky/commit-message.cjs', 'range'], {
        env: { ...env, COMMIT_BASE: '', COMMIT_HEAD: head },
      });
    });
    await t.test(
      'CI range validator rejects bypassed invalid commits without rewriting history',
      () => {
        const base = git('rev-parse', 'HEAD');
        run('git', [
          '-c',
          'core.hooksPath=',
          'commit',
          '--allow-empty',
          '-m',
          'feat: bypassed icon',
        ]);
        const head = git('rev-parse', 'HEAD');
        const rejected = run(
          process.execPath,
          ['.husky/commit-message.cjs', 'range'],
          {
            env: { ...env, COMMIT_BASE: base, COMMIT_HEAD: head },
            allowFailure: true,
          },
        );
        assert.notEqual(rejected.status, 0);
        assert.equal(git('rev-parse', 'HEAD'), head);
        assert.equal(message(), 'feat: bypassed icon');
        run('git', [
          '-c',
          'core.hooksPath=',
          'commit',
          '--allow-empty',
          '--allow-empty-message',
          '-m',
          '',
        ]);
        const emptyHead = git('rev-parse', 'HEAD');
        const empty = run(
          process.execPath,
          ['.husky/commit-message.cjs', 'range'],
          {
            env: { ...env, COMMIT_BASE: head, COMMIT_HEAD: emptyHead },
            allowFailure: true,
          },
        );
        assert.notEqual(empty.status, 0);
      },
    );
  } finally {
    if (fs.existsSync(modules)) fs.unlinkSync(modules);
    const resolved = fs.realpathSync(temp);
    if (
      resolved !== path.resolve(temp) ||
      !resolved.startsWith(fs.realpathSync(os.tmpdir()) + path.sep)
    )
      throw new Error('Refusing fixture cleanup outside temporary directory');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
