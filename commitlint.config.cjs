// Conventional Commits con los tipos permitidos de la Parte 6, sección 8
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'style', 'perf'],
    ],
    'subject-case': [0],
  },
};
