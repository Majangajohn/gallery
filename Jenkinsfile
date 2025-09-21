pipeline {  // Whole pipeline
    agent {
        docker {
            image 'node:lts'
        }
    }

    environment {  // Variables 
        RENDER_DEPLOY_HOOK = credentials('render-deploy-hook')
        RENDER_URL = 'https://darkroom-app.onrender.com'  //actual Render URL
        SLACK_CHANNEL = '#john_ip1'  // channel, e.g., '#johnny_ip1'
    }

    stages {
        stage('Build') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Deploy') {
            steps {
                sh "curl -X POST \${RENDER_DEPLOY_HOOK}"
            }
        }
    }

    post {
        failure {
            mail to: 'jnmajanga@gmail.com',
                 subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "Check ${env.BUILD_URL}."
        }

        success {  // On success, send to Slack
            slackSend channel: "${SLACK_CHANNEL}",  // Sends to your channel
                      message: "Build ${env.BUILD_ID} successful. Deployed to ${RENDER_URL}"  // Message with build ID and link
        }
    }
}