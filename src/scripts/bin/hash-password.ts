import { hashPassword } from 'back-end/lib/security';
import { Script } from 'scripts/lib/types';

const main: Script = async ({ logger, argv }) => {
  const pw = String(argv.password || argv.p || '');
  if (!pw) {
    logger.error('invalid password');
    return false;
  }
  const hash = await hashPassword(pw);
  logger.info(hash);
  return true;
};

export default main;
