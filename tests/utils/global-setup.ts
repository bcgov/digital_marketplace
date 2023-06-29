import { spawnSync } from "child_process";

export default function () {
  process.env.POSTGRES_URL = `postgresql://digmkt-test:digmkt-test@localhost:5433/digmkt-test`;

  const dockerComposeUp = spawnSync(
    "docker",
    ["compose", "up", "-d", "test-db"],
    {
      stdio: "inherit"
    }
  );
  if (dockerComposeUp.error) {
    console.error(
      "Failed to start the Docker Compose services:",
      dockerComposeUp.error
    );
    process.exit(1);
  }

  console.log("Waiting for the Docker Compose services to be ready...");
  const dockerComposeWait = spawnSync("docker", [
    "compose",
    "exec",
    "test-db",
    "pg_isready",
    "-U",
    "digmkt-test"
  ]);
  if (dockerComposeWait.error) {
    console.error(
      "Failed to check the Docker Compose services readiness:",
      dockerComposeWait.error
    );
    process.exit(1);
  }

  if (dockerComposeWait.status !== 0) {
    console.error("The Docker Compose services are not ready. Exiting...");
    process.exit(1);
  }

  const migrations = spawnSync("yarn", ["migrations:latest"], {
    stdio: "inherit"
  });

  if (migrations.error) {
    console.error("Error running database migrations:", migrations.error);
    process.exit(1);
  }

  if (migrations.status !== 0) {
    console.error("Failed to run database migrations.");
    if (migrations.stderr) {
      console.error("Migration error:", migrations.stderr.toString());
    }
    process.exit(1);
  }

  console.log("The Docker Compose services are ready.");
}
