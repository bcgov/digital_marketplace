import { ENV } from 'back-end/config';
import { makeDomainLogger } from 'back-end/lib/logger';
import { console as consoleAdapter } from 'back-end/lib/logger/adapters';
import hashPassword from 'scripts/bin/hash-password';
import { Script } from 'scripts/lib/types';
import { argv } from 'yargs';

const scripts: Record<string, Script> = {
  hashPassword
};

const scriptName = argv._[0];

const logger = makeDomainLogger(consoleAdapter, scriptName, ENV);

const script = scripts[scriptName];

(async () => {
  if (script) {
    logger.debug('script found');
    return await script({ logger, argv });
  } else {
    logger.error('script not found');
    return false;
  }
})()
  .then(result => process.exit(result ? 0 : 1));
