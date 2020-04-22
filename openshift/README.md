1. Apply deployment configurations for Patroni HA PostgreSQL
	a. oc process -f openshift/templates/patroni-deploy-config.json | oc create -f -
2. Open up terminal in patroni master pod (use patronictl list to determine master)
	a. CREATE DATABASE digmkt;
	b. GRANT CONNECT ON DATABASE digmkt TO digmktuser;
	c. GRANT ALL PRIVILEGES ON DATABASE digmkt TO digmktuser;
3. Open up terminal in appliation pod
	a. npm run migrations:latest