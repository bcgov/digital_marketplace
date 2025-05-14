const dbPort = String(5432 + Number(import.meta.env.VITE_.JEST_WORKER_ID));

import.meta.env.VITE_ = {
  ...import.meta.env.VITE_,
  CONTAINER_NAME: `dm_test_db_${import.meta.env.VITE_.JEST_WORKER_ID}`,
  DB_PORT: dbPort,
  POSTGRES_URL: `postgresql://digmkt-test:digmkt-test@localhost:${dbPort}/digmkt-test`
};
