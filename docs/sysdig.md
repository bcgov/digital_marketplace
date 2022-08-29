The [sysdig template](../openshift/templates/monitoring/sysdig.yaml) is how sysdig users are added and removed from the project.  Note this cannot be done through the Sysdig GUI.

## Add a user

1. Create two lines in the sysdig template under spec.team.users:
```
    - name: first.last@gov.bc.ca
      role: ROLE_TEAM_READ
```

2. Apply the updated template in the tools namespace

`oc -n ccc866-tools apply -f openshift/templates/monitoring/sysdig.yaml`

### Reference

[Reference Documentation](https://developer.gov.bc.ca/Set-up-a-team-in-Sysdig-Monitor)

Further help can be found on the Rocket Chat channel `#devops-sysdig`.
