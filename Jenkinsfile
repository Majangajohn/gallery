pipeline {  // Whole pipeline
    agent {
        docker {
            image 'node:lts'
        }
    }

    environment {  // Variables 
        RENDER_DEPLOY_HOOK = credentials('render-deploy-hook')
        RENDER_URL = 'https://darkroom-app.onrender.com'  // Actual Render URL
        SLACK_CHANNEL = '#john_ip1'  // Channel
        FAILED_STAGE = ''  // To capture failing stage for email
    }

    stages {
        // Explicit clone (required if NOT using Pipeline from SCM)
        stage('Clone Repo') {
            steps {
                script {
                    try {
                        git branch: 'master', url: 'https://github.com/Majangajohn/gallery.git'
                    } catch (err) {
                        FAILED_STAGE = 'Clone Repo'
                        throw err
                    }
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    try {
                        sh 'npm install'
                    } catch (err) {
                        FAILED_STAGE = 'Build'
                        throw err
                    }
                }
            }
        }

        stage('Test') {
            steps {
                script {
                    try {
                        sh 'npm test'
                    } catch (err) {
                        FAILED_STAGE = 'Test'
                        throw err
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    try {
                        sh "curl -X POST \${RENDER_DEPLOY_HOOK}"
                    } catch (err) {
                        FAILED_STAGE = 'Deploy'
                        throw err
                    }
                }
            }
        }
    }

    post {
        failure {
            mail to: 'jnmajanga@gmail.com',
                 subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} in ${FAILED_STAGE}",
                 body: """The build failed in the ${FAILED_STAGE} stage at ${new Date().toString()}.
Commit: ${env.GIT_COMMIT ?: 'Unknown'}.
Check console output at ${env.BUILD_URL} for details."""
        }

        success {  // On success, send to Slack
            slackSend channel: "${SLACK_CHANNEL}",
                      message: "Build #${env.BUILD_ID} successful at ${new Date().toString()}. Commit: ${env.GIT_COMMIT ?: 'Unknown'}. Deployed to ${RENDER_URL}"
        }
    }
}