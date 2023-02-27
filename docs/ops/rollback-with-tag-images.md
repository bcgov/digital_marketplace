# Rolling Back Playbook
Should you need to rollback to a previously built image.

## Concepts
- imageStreams point to built images, represented by a unique SHA
- imageStreamTags if repeatedly used (such as :latest) keep a history of the image SHAs with each new build.
- deploying a previously build image requires looking at the history of image SHAs within an imageStreamTag (such as 'latest) and assigning it a unique tag (such as v2.0.2), then re-deploying the application using that tag

### Display a list of tags
`oc -n ccc866-tools get is `

### Display a list of unique SHAs for a particular imagestream

`oc -n ccc866-tools get is/app-digmkt-prod -o yaml | grep -A25 tags`

*Produces*
```yaml
  tags:
  - items:
    - created: "2022-08-25T19:59:46Z"
      dockerImageReference: image-registry.openshift-image-registry.svc:5000/ccc866-tools/app-digmkt-prod@sha256:5ca9a579c8a5a7b59b2c55c64542c69b44c2e55f41e8199c2793d5a168356cbf
      generation: 1
      image: sha256:5ca9a579c8a5a7b59b2c55c64542c69b44c2e55f41e8199c2793d5a168356cbf
    - created: "2022-04-26T00:08:37Z"
      dockerImageReference: image-registry.openshift-image-registry.svc:5000/ccc866-tools/app-digmkt-prod@sha256:8ddd4aea889a8a67ce14d4bb68579e06d66f8cb2db38cf472962654571a05090
      generation: 1
      image: sha256:8ddd4aea889a8a67ce14d4bb68579e06d66f8cb2db38cf472962654571a05090
```

### Create. Assuming you just built 'latest', create a new tag (v2.0.2), pointing it to the previously build image (the 2nd SHA)
`oc -n ccc866-tools tag image-registry.openshift-image-registry.svc:5000/ccc866-tools/app-digmkt-prod@sha256:8ddd4aea889a8a67ce14d4bb68579e06d66f8cb2db38cf472962654571a05090 app-digmkt-prod:v2.0.2`

### Verify
`oc -n ccc866-tools get is `

*Produces*
`app-digmkt-prod    image-registry.apps.silver.devops.gov.bc.ca/ccc866-tools/app-digmkt-prod    v2.0.2,latest                     12 minutes ago`

## Remove tag

`oc tag app-digmkt-prod:v3.1.1 -d`

### Re-Deploy
GUI: (Developer view) Topology -> DeploymentConfigs -> DeploymentConfig details -> YAML
 - update the tag 'latest' at spec.containers.image to 'v2.0.2'

 `image-registry.openshift-image-registry.svc:5000/ccc866-tools/app-digmkt-prod:v2.0.2`
