// define constants
def BUILDCFG_NAME ='dig-mkt-app-dev'
def IMAGE_NAME = 'dig-mkt-app-dev'
def DEV_DEPLOYMENT_NAME = 'dig-mkt-app-dev'
def DEV_TAG_NAME = 'dev'
def DEV_NS = 'xzyxml-dev'

// Note: openshiftVerifyDeploy requires policy to be added:
// oc policy add-role-to-user view system:serviceaccount:xzyxml-tools:jenkins -n xzyxml-dev
// oc policy add-role-to-user view system:serviceaccount:xzyxml-tools:jenkins -n xzyxml-test
// oc policy add-role-to-user view system:serviceaccount:xzyxml-tools:jenkins -n xzyxml-prod

// pipeline
properties([[$class: 'BuildDiscarderProperty', strategy: [$class: 'LogRotator', artifactDaysToKeepStr: '', artifactNumToKeepStr: '', daysToKeepStr: '', numToKeepStr: '10']]])

node('maven') {

    stage('Checkout Source') {
       echo "checking out source"
       echo "Build: ${BUILD_ID}"
       checkout scm
    }

    stage('Build') {
	    echo "Building..."
	    openshiftBuild bldCfg: BUILDCFG_NAME, verbose: 'false', showBuildLogs: 'true'
            sleep 5
            echo ">>> Get Image Hash"
            IMAGE_HASH = sh (
              script: """oc get istag ${IMAGE_NAME}:latest -o template --template=\"{{.image.dockerImageReference}}\"|awk -F \":\" \'{print \$3}\'""",
                returnStdout: true).trim()
            echo ">> IMAGE_HASH: ${IMAGE_HASH}"
	    echo ">>>> Build Complete"
    }

    stage('Deploy to Dev') {
	    echo ">>> Tag ${IMAGE_HASH} with ${DEV_TAG_NAME}"
 	    openshiftTag destStream: IMAGE_NAME, verbose: 'false', destTag: DEV_TAG_NAME, srcStream: IMAGE_NAME, srcTag: "${IMAGE_HASH}"
	    echo ">>>> Deployment Complete"
    }
}
