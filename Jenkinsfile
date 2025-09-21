// Test after plugin install
pipeline {  // Defines the whole pipeline
    agent {  // Runs in a Docker container with Node.js pre-installed
        docker {
            image 'node:lts'  // Uses latest long-term support Node.js
        }
    }

    environment {  // Sets variables for the pipeline
        RENDER_DEPLOY_HOOK = credentials('render-deploy-hook')  // Pulls the secure hook from Jenkins credentials
    }

    stages {  // The main steps of the pipeline
        stage('Build') {  // Stage 1: Install dependencies
            steps {
                sh 'npm ci'  // Runs npm install to get all packages
            }
        }

        stage('Deploy') {  // Stage 2: Trigger deploy to Render
            steps {
                sh "curl -X POST \${RENDER_DEPLOY_HOOK}"  // Sends a POST request to Render's hook to start deploy
            }
        }
    }
}