// define constants
def BUILDCFG_NAME ='dig-mkt-app'
def IMAGE_NAME = 'dig-mkt-app-master'
def TST_DEPLOYMENT_NAME = 'dig-mkt-app-test'
def TST_TAG_NAME = 'test'
def TST_NS = 'xzyxml-test'
def PROD_DEPLOYMENT_NAME = 'dig-mkt-app-prod'
def PROD_TAG_NAME = 'prod'
def PROD_BCK_TAG_NAME = 'prod-previous'
def PROD_NS = 'xzyxml-prod'

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

    stage('Deploy to Test') {
	    echo ">>> Tag ${IMAGE_HASH} with ${TST_TAG_NAME}"
 	    openshiftTag destStream: IMAGE_NAME, verbose: 'false', destTag: TST_TAG_NAME, srcStream: IMAGE_NAME, srcTag: "${IMAGE_HASH}"
	    echo ">>>> Deployment Complete"
    }
}

stage('Deploy to Prod') {	
  timeout(time: 1, unit: 'DAYS') {
	  input message: "Deploy to prod?", submitter: 'dhruvio-admin,sutherlanda-admin'
  }
  node('master') {
	  echo ">>> Tag ${PROD_TAG_NAME} with ${PROD_BCK_TAG_NAME}"
	  openshiftTag destStream: IMAGE_NAME, verbose: 'false', destTag: PROD_BCK_TAG_NAME, srcStream: IMAGE_NAME, srcTag: PROD_TAG_NAME
          echo ">>> Tag ${IMAGE_HASH} with ${PROD_TAG_NAME}"
	  openshiftTag destStream: IMAGE_NAME, verbose: 'false', destTag: PROD_TAG_NAME, srcStream: IMAGE_NAME, srcTag: "${IMAGE_HASH}"
	  echo ">>>> Deployment Complete"
  }
}
