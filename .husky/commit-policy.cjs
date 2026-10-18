const icons = Object.freeze({
  feat: '✨',
  fix: '🐛',
  docs: '📝',
  style: '🎨',
  refactor: '♻️',
  perf: '⚡',
  test: '✅',
  chore: '🧹',
  ci: '⚙️',
  build: '🏗️',
  revert: '⏪',
});
const aliases = Object.freeze({
  feature: 'feat',
  bug: 'fix',
  bugfix: 'fix',
  hotfix: 'fix',
  doc: 'docs',
  documentation: 'docs',
  performance: 'perf',
  tests: 'test',
  maintenance: 'chore',
});
const conventional =
  /^([a-z][a-z0-9-]*)(?:\(([^()\r\n]+)\))?(!)?:[ \t]*(\S.*)$/i;
const emojiPrefix =
  /^(?:(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|:[a-z0-9_+-]+:)[ \t]*)+/u;

function canonicalType(value) {
  const lower = value.toLowerCase();
  const type = Object.hasOwn(aliases, lower) ? aliases[lower] : lower;
  return Object.hasOwn(icons, type) ? type : null;
}

function isGitMessage(header) {
  return (
    /^(?:fixup|squash|amend)! /.test(header) ||
    /^Merge (?:branch |remote-tracking branch |tag |commit |pull request #)/.test(
      header,
    )
  );
}

function headerLocation(message, comment = '#') {
  let offset = 0;
  for (const line of message.split(/(?<=\n)/)) {
    const text = line.replace(/\r?\n$/, '').replace(/^\uFEFF/, '');
    if (
      text === `${comment} ------------------------ >8 ------------------------`
    )
      return null;
    if (text.trim() && !text.startsWith(comment)) {
      return {
        offset,
        length: line.replace(/\r?\n$/, '').length,
        header: text,
      };
    }
    offset += line.length;
  }
  return null;
}

function normalizeMessage(message, { branch = '', comment = '#' } = {}) {
  const location = headerLocation(message, comment);
  if (!location || isGitMessage(location.header)) return message;
  const header = location.header.trim().replace(emojiPrefix, '');
  let match = conventional.exec(header);
  if (!match && /^Revert ".+"$/.test(header)) {
    match = [
      header,
      'revert',
      undefined,
      undefined,
      `revert ${header.slice(7)}`,
    ];
  }
  let type;
  let scope;
  let breaking;
  let subject;
  if (match) {
    type = canonicalType(match[1]);
    // Unknown explicit types must fail validation, never become a different branch-inferred type.
    if (!type) return message;
    scope = match[2]?.toLowerCase();
    breaking = match[3] ?? '';
    subject = match[4].trimEnd();
  } else {
    // Preserve branch fallback, but do not invent a scope from truncated branch text.
    type = canonicalType(branch.match(/^([a-z]+)[/-]/i)?.[1] ?? '');
    if (!type || /^[a-z][a-z0-9-]*(?:\([^\r\n]*\))?!?:/i.test(header))
      return message;
    breaking = '';
    subject = header;
  }
  const normalized = `${icons[type]} ${type}${scope ? `(${scope})` : ''}${breaking}: ${subject}`;
  return (
    message.slice(0, location.offset) +
    normalized +
    message.slice(location.offset + location.length)
  );
}

function hasCanonicalIcon(header) {
  const match = /^(\S+) ([a-z]+)(?:\([^()\r\n]+\))?!?: \S.*$/.exec(
    header ?? '',
  );
  return Boolean(
    match && Object.hasOwn(icons, match[2]) && icons[match[2]] === match[1],
  );
}

function validateHeader(header) {
  if (isGitMessage(header ?? '')) return [true, ''];
  if (!hasCanonicalIcon(header))
    return [
      false,
      'write a type and summary, e.g. feat(auth): add login; the hook adds its matching icon automatically',
    ];
  const match = /^(\S+) ([a-z]+)(?:\(([^()\r\n]+)\))?!?: (\S.*)$/.exec(header);
  if (match[3] && match[3] !== match[3].toLowerCase())
    return [false, 'scope must be lowercase'];
  if (header !== header.trim())
    return [false, 'header must not have leading or trailing whitespace'];
  if (match[4].endsWith('.'))
    return [false, 'summary must not end with a period'];
  return [true, ''];
}

function commitlintConfig() {
  return {
    extends: ['@commitlint/config-conventional'],
    defaultIgnores: false,
    ignores: [(message) => isGitMessage(message.split(/\r?\n/, 1)[0])],
    parserPreset: {
      parserOpts: {
        headerPattern: /^(?:\S+ )?([a-z]+)(?:\(([^()]+)\))?!?: (.+)$/,
        headerCorrespondence: ['type', 'scope', 'subject'],
        breakingHeaderPattern: /^(?:\S+ )?([a-z]+)(?:\(([^()]+)\))?!: (.+)$/,
      },
    },
    plugins: [
      {
        rules: {
          'canonical-icon': (parsed) => validateHeader(parsed.header),
        },
      },
    ],
    rules: {
      'canonical-icon': [2, 'always'],
      'type-enum': [2, 'always', Object.keys(icons)],
      'type-case': [2, 'always', 'lower-case'],
      'type-empty': [2, 'never'],
      'scope-case': [2, 'always', 'lower-case'],
      'subject-empty': [2, 'never'],
      // Preserve Copilot/user acronyms and code identifiers rather than changing the subject.
      'subject-case': [0],
      'subject-full-stop': [2, 'never', '.'],
      'header-max-length': [0],
      'body-max-line-length': [0],
      'footer-max-line-length': [0],
    },
  };
}

module.exports = {
  icons,
  headerLocation,
  normalizeMessage,
  hasCanonicalIcon,
  validateHeader,
  isGitMessage,
  commitlintConfig,
};
