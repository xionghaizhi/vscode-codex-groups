const { cleanupTemporaryPaths } = require('./test-utils');

runTests();

async function runTests() {
  try {
    await runSelectedTests();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  } finally {
    try {
      cleanupTemporaryPaths();
    } catch (error) {
      console.error(error && error.stack ? error.stack : error);
      process.exitCode = 1;
    }
  }
}

async function runSelectedTests() {
  const grepText = grepArgument(process.argv.slice(2));
  const grep = grepText ? new RegExp(grepText) : null;
  let passed = 0;
  let matched = 0;
  for (const suite of testSuites()) {
    for (const test of suite.tests) {
      const name = `${suite.name} - ${test.name}`;
      if (grep && !grep.test(name)) continue;
      matched += 1;
      try {
        await test.run();
        console.log(`PASS ${name}`);
        passed += 1;
      } catch (error) {
        console.error(`FAIL ${name}`);
        throw error;
      }
    }
  }
  if (grep && matched === 0) {
    console.error(`No tests matched: ${grepText}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${passed} tests`);
}

function testSuites() {
  return [
    require('./metadata-store.test'), require('./codex-config.test'),
    require('./locator.test'), require('./package-json.test'),
    require('./extension.test'), require('./patch-engine.test'),
    require('./scripts.test'), require('./upgrade-workspace.test'),
    require('./run-tests-runner.test'),
  ];
}

function grepArgument(args) {
  const index = args.indexOf('--grep');
  if (index >= 0) {
    return args[index + 1] || '';
  }
  const inline = args.find((arg) => arg.startsWith('--grep='));
  return inline ? inline.slice('--grep='.length) : '';
}
