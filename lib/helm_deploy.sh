
#!/bin/bash

set -euxo pipefail

echo "Creating Helm installation $*"

cd helm
helm dep up
helm upgrade --install --atomic -f ./values.yaml "$@" digital-marketplace . \
  --debug --timeout=8m0s
