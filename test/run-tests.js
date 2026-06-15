const tests = [
  require('./metadata-store.test'),
  require('./locator.test'),
  require('./package-json.test'),
  require('./patch-engine.test'),
];

(async () => {
  let passed = 0;
  for (const suite of tests) {
    for (const test of suite.tests) {
      const name = `${suite.name} - ${test.name}`;
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
  console.log(`PASS ${passed} tests`);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
