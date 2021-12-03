import initExpresss from './express-server';
import createServer from './create-server';

async function main() {
  const expressServer = await initExpresss();
  createServer(expressServer);
}

main();
