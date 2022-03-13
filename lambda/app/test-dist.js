const app = require('./dist/index.js');

async function main() {
  console.log(await app.handler(null, null, (a, b) => console.log(a, b)));
}

main();
