const Sequencer = require('@jest/test-sequencer').default;

// The default order, except that the audit coverage check reads what every other file recorded, so it
// always runs last.
class CustomSequencer extends Sequencer {
  sort(tests) {
    const last = (test) => (test.path.endsWith('zz.audit-coverage.test.ts') ? 1 : 0);
    return Array.from(super.sort(tests)).sort((testA, testB) => last(testA) - last(testB));
  }
}

module.exports = CustomSequencer;
