pipeline {  // Defines the whole pipeline
    agent {  // Runs in Node.js Docker
        docker {
            image 'node:lts'
        }
    }

    environment {  // Variables
        RENDER_DEPLOY_HOOK = credentials('render-deploy-hook')
    }

    stages {  // Steps
        stage('Build') {  // Install deps
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {  // Run tests
            steps {
                sh 'npm test'  // Executes the tests
            }
        }

        stage('Deploy') {  // Trigger Render
            steps {
                sh "curl -X POST \${RENDER_DEPLOY_HOOK}"
            }
        }
    }

    post {  // Actions after stages
        failure {  // If any stage fails (e.g., tests)
            mail to: 'jnmajanga@gmail.com',  
                 subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",  // Email subject with job info
                 body: "The build failed. Check console output at ${env.BUILD_URL}."  // Email body with link
        }
    }
}