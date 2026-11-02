const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// A fresh audit-coverage record for this run (see src/tests/helpers/audit-coverage.ts). A run limited to some test
// files cannot exercise every route, so it is marked partial and only the static checks apply.
module.exports = async (globalConfig) => {
  const file = path.join(os.tmpdir(), `sso-requests-api-audit-coverage-${process.pid}.jsonl`);
  fs.writeFileSync(file, '');
  process.env.AUDIT_COVERAGE_FILE = file;
  const filtered =
    (globalConfig.testPathPatterns?.patterns?.length ?? 0) > 0 ||
    (globalConfig.nonFlagArgs?.length ?? 0) > 0 ||
    Boolean(globalConfig.testNamePattern) ||
    Boolean(globalConfig.onlyChanged) ||
    Boolean(globalConfig.findRelatedTests);
  process.env.AUDIT_COVERAGE_PARTIAL = filtered ? 'true' : '';
};
