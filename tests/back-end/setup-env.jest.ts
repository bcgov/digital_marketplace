const dbPort = String(5432 + Number(process.env.JEST_WORKER_ID));

process.env = {
  ...process.env,
  CONTAINER_NAME: `dm_test_db_${process.env.JEST_WORKER_ID}`,
  DB_PORT: dbPort,
  POSTGRES_URL: `postgresql://digmkt-test:digmkt-test@localhost:${dbPort}/digmkt-test`
};
