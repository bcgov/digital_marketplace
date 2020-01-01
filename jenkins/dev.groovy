// define constants
def BUILDCFG_NAME ='dig-mkt-app'
def IMAGE_NAME = 'dig-mkt-app'
def DEV_DEPLOYMENT_NAME = 'dig-mkt-app-dev'
def DEV_TAG_NAME = 'dev'
def DEV_NS = 'xzyxml-dev'
def TST_DEPLOYMENT_NAME = 'dig-mkt-app-test'
def TST_TAG_NAME = 'test'
def TST_BCK_TAG_NAME = 'test-previous'
def TST_NS = 'xzyxml-test'

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

// def owaspPodLabel = "owasp-zap-${UUID.randomUUID().toString()}"
// podTemplate(label: owaspPodLabel, name: owaspPodLabel, serviceAccount: 'jenkins', cloud: 'openshift', containers: [
//   containerTemplate(
//     name: 'jnlp',
//     image: '172.50.0.2:5000/openshift/jenkins-slave-zap',
//     resourceRequestCpu: '500m',
//     resourceLimitCpu: '1000m',
//     resourceRequestMemory: '3Gi',
//     resourceLimitMemory: '4Gi',
//     workingDir: '/home/jenkins',
//     command: '',
//     args: '${computer.jnlpmac} ${computer.name}'
//   )
// ]) {
//      stage('ZAP Security Scan') {
//         node(owaspPodLabel) {
//           sleep 60
//           def retVal = sh returnStatus: true, script: '/zap/zap-baseline.py -r baseline.html -t https://dig-mkt-app-dev.pathfinder.gov.bc.ca/'
//           publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: true, reportDir: '/zap/wrk', reportFiles: 'baseline.html', reportName: 'ZAP Baseline Scan', reportTitles: 'ZAP Baseline Scan'])
//           echo "Return value is: ${retVal}"
//         }
//      }
//   }

// stage('Deploy to Test') {	
//   timeout(time: 1, unit: 'DAYS') {
// 	  input message: "Deploy to test?", submitter: 'dhruvio-admin,SteveChapmanBCDX-admin,sutherlanda-admin'
//   }
//   node('master') {
// 	  echo ">>> Tag ${TST_TAG_NAME} with ${TST_BCK_TAG_NAME}"
// 	  openshiftTag destStream: IMAGE_NAME, verbose: 'false', destTag: TST_BCK_TAG_NAME, srcStream: IMAGE_NAME, srcTag: TST_TAG_NAME
//           echo ">>> Tag ${IMAGE_HASH} with ${TST_TAG_NAME}"
// 	  openshiftTag destStream: IMAGE_NAME, verbose: 'false', destTag: TST_TAG_NAME, srcStream: IMAGE_NAME, srcTag: "${IMAGE_HASH}"
//           sleep 5
// 	  openshiftVerifyDeployment depCfg: TST_DEPLOYMENT_NAME, namespace: TST_NS, replicaCount: 1, verbose: 'false', verifyReplicaCount: 'false'
// 	  echo ">>>> Deployment Complete"
//   }
// }
