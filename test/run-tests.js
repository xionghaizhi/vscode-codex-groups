const tests = [
  require('./metadata-store.test'),
  require('./locator.test'),
  require('./package-json.test'),
  require('./extension.test'),
  require('./patch-engine.test'),
  require('./scripts.test'),
  require('./run-tests-runner.test'),
];
const grepText = grepArgument(process.argv.slice(2));
const grep = grepText ? new RegExp(grepText) : null;

(async () => {
  let passed = 0;
  let matched = 0;
  for (const suite of tests) {
    for (const test of suite.tests) {
      const name = `${suite.name} - ${test.name}`;
      if (grep && !grep.test(name)) {
        continue;
      }
      matched += 1;
      try {
        await test.run();
        console.log(`PASS ${name}`);
        passed += 1;
      } catch (error) {
        console.error(`FAIL ${name}`);
        console.error(error && error.stack ? error.stack : error);
        process.exitCode = 1;
        return;
      }
    }
  }
  if (grep && matched === 0) {
    console.error(`No tests matched: ${grepText}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${passed} tests`);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});

function grepArgument(args) {
  const index = args.indexOf('--grep');
  if (index >= 0) {
    return args[index + 1] || '';
  }
  const inline = args.find((arg) => arg.startsWith('--grep='));
  return inline ? inline.slice('--grep='.length) : '';
}
