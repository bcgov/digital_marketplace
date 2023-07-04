import { spawnSync } from "child_process";

export default function () {
  const dockerComposeDown = spawnSync(
    "docker",
    ["compose", "rm", "-s", "-v", "-f", "test-db"],
    { stdio: "inherit" }
  );
  if (dockerComposeDown.error) {
    console.error(
      "Failed to stop the Docker Compose services:",
      dockerComposeDown.error
    );
    process.exit(1);
  }
  console.log("The Docker Compose services have been stopped.");
}
