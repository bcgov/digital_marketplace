Install chromadb into Openshift with:

helm repo add chroma https://amikos-tech.github.io/chromadb-chart/
helm repo update
helm search repo chroma/

helm install chroma chroma/chromadb -f values.yaml
