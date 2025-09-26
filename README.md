# Gallery Application Deployment Pipeline

This repository contains a Node.js-based photo gallery application ("darkroom") deployed to Render using a Jenkins CI/CD pipeline. The project integrates MongoDB Atlas for the database, includes automated tests, and sends notifications via email (on failure) and Slack (on success). This README outlines the setup, pipeline, and deployment process in detail, including expanded steps for Render setup, Jenkins credential management, plugin installation, and other configurations to ensure reproducibility.

## Table of Contents
- [Project Overview](#project-overview)
- [Milestone 1: Setup](#milestone-1-setup)
- [Milestone 2: Basic Pipeline](#milestone-2-basic-pipeline)
- [Milestone 3: Tests](#milestone-3-tests)
- [Milestone 4: Slack Integration](#milestone-4-slack-integration)
- [Landing Page](#landing-page)
- [Render Deployment](#render-deployment)
- [Author](#author)

## Project Overview
The gallery application is a web app that allows users to upload and view images, stored in a MongoDB Atlas cloud database. The Jenkins pipeline automates building, testing, and deploying to Render, with notifications for build status. Key features:
- Secure database connection using environment variables.
- Automated testing merged from a separate branch.
- Slack notifications with build ID, timestamp, commit hash, and Render URL on success.
- Email alerts with detailed failure information, including the failing stage, timestamp, commit hash, and console URL.

## Milestone 1: Setup
Configured the application to connect to MongoDB Atlas and set up Render for deployment.

### Steps
1. **Forked and Cloned Repository**:
   - Forked the original repository to [https://github.com/Majangajohn/gallery](https://github.com/Majangajohn/gallery).
   - Cloned locally: `git clone https://github.com/Majangajohn/gallery.git`.

2. **MongoDB Atlas Setup**:
   - Sign up or log in to MongoDB Atlas[](https://account.mongodb.com/account/login).
   - Create a free-tier cluster: Navigate to "Build a Database" > Select "M0" free tier > Choose a provider/region > Create cluster.
   - Add a database user: In the cluster dashboard, go to "Database Access" > "Add New Database User" > Set username (e.g., for `MONGO_USER`) and password (for `MONGO_PASSWORD`) with read/write privileges.
   - Create a database: In the cluster, create a new database (e.g., name it for `MONGO_DB`).
   - Allow network access: Go to "Network Access" > "Add IP Address" > Allow access from anywhere (0.0.0.0/0) for development (tighten for production).
   - Updated `_config.js` to use `process.env.MONGO_USER`, `process.env.MONGO_PASSWORD` & `process.env.MONGO_DB` for secure connection:
     ```javascript
     config.mongoURI = {
         production: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=IP1Cluster`,
         development: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}-dev?retryWrites=true&w=majority&appName=IP1Cluster`,
         test: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}-test?retryWrites=true&w=majority&appName=IP1Cluster`,   
     }
   - Locally, create a .env file in the project root with MONGO_PASSWORD=your_password,                      MONGO_USER=your_user, MONGO_DB=your_db (add .env to .gitignore to avoid committing secrets).

3. **Updated server.js**:
   - Added require('dotenv').config() at the top to load local environment variables.
   - Connected to MongoDB using process.env.MONGODB_URI || config.mongoURI[app.settings.env].

4. **Render Setup**:
   - Sign up or log in to Render.
   - Create a new Web Service: From the dashboard, click "New" > "Web Service".
   - Connect to GitHub: Authorize Render to access your GitHub account > Select the forked repository (Majangajohn/gallery).
   - Configure the service:
     - Name: e.g., "darkroom-app".
     - Branch: "master".
     - Runtime: Node.
     - Build Command: `npm install`.
     - Start Command: `node server.js`.
     - Environment Variables: Add `MONGO_PASSWORD=your_password, MONGO_USER=your_user, MONGO_DB=your_db`, and `NODE_ENV=production`.
   - Advanced Settings: Disable auto-deploys (under "Auto-Deploy" set to "No") to allow Jenkins to control deployments.
   - Deploy: Click "Create Web Service" – Render will build and deploy initially; note the URL (e.g., https://darkroom-app.onrender.com).
   - For manual deploys later: Use Render's dashboard or API hooks (we'll set up a deploy hook in Jenkins credentials).
           

### Screenshot
<img src="public/images/MongoAtlas.png" alt="Milestone 1 Pipeline">

## Milestone 2: Basic Pipeline
Created a Jenkins pipeline to build and deploy the app automatically on GitHub pushes.

### Steps
1. **Jenkins Setup**:
   - Install Docker on your host machine if not already.
   - Create a custom Dockerfile for Jenkins with Docker CLI support (to allow Jenkins to run Docker agents):
     ```dockerfile
     FROM jenkins/jenkins:lts
     USER root
     RUN apt-get update && apt-get install -y apt-transport-https ca-certificates curl software-properties-       common
     RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -
     RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs)         stable"
     RUN apt-get update && apt-get install -y docker-ce-cli
     RUN groupadd -g $(stat -c %g /var/run/docker.sock) docker && usermod -aG docker jenkins  # Replace with      your host's docker GID
     USER jenkins
     ```
   - Build the image: `docker build -t jenkins `.
   - Run Jenkins in Docker: `docker run -p 8080:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock --name jenkins jenkins`.
   - Access Jenkins: Open http://localhost:8080, unlock with initial admin password (from container logs or /var/jenkins_home/secrets/initialAdminPassword), install suggested plugins.

2. **Pipeline Configuration**:
   - In Jenkins dashboard: New Item > Pipeline > Name it (e.g., "gallery-pipeline") > OK.
   - Link to GitHub: In pipeline config, set "Pipeline script from SCM" > Git > Repository URL: https://github.com/Majangajohn/gallery.git > Branch: */master.
   - Add GitHub webhook: In GitHub repo settings > Webhooks > Add webhook > Payload URL: http://your-ngrok-url/github-webhook/ (use ngrok to expose localhost:8080), Content type: application/json, Events: Just the push event.
   - Install ngrok: Download from https://ngrok.com/download, run `ngrok http 8080` to get a public URL.
   - Store Render deploy hook: In Render dashboard > Service settings > Deploy Hooks > Create a hook > Copy the URL.
      -  In Jenkins: Manage Jenkins > Manage Credentials > (global) > Add Credentials > Kind: Secret text > ID: `render-deploy-hook` > Secret: paste the hook URL > OK.

3. **Jenkinsfile**:
   - Defined a pipeline using a Docker agent (`node:lts`) for Node.js.
   - Stages: checkout to clone the repository, build (installs dependencies) and Deploy (triggers Render).
   ```groovy
   pipeline {
       agent { docker { image 'node:lts' } }
       environment { RENDER_DEPLOY_HOOK = credentials('render-deploy-hook') }
       triggers {githubPush()}
       stages {
           stage('Checkout') { steps { git branch: 'master', url: 'https://github.com/Majangajohn/gallery.git' } }
           stage('Build') { steps { sh 'npm install' } }
           stage('Deploy') { steps { sh "curl -X POST \${RENDER_DEPLOY_HOOK}" } }
       }
   }
   ```

4. **Landing Page Update**:
   - Added `<h1 style="font-size: 3em; color: red;">MILESTONE 2</h1>` to `views/index.ejs`.
   - Pushed changes, verified on Render.

### Screenshot
<img src="public/images/landing_page.png" alt="Milestone 2 Pipeline">
<img src="public/images/jenkins.png" alt="Milestone 2 deployment on jenkins using docker">

## Milestone 3: Tests
Merged tests from the `test` branch and updated the pipeline to run them, with email notifications on failure.

### Email Configuration
- Install Email Extension Plugin if needed: Manage Jenkins > Plugins > Available > Search "Email Extension" > Install and restart.
- In Jenkins: Manage Jenkins > Configure System > E-mail Notification (or Extended E-mail Notification for more options).
- Set SMTP server: e.g., smtp.gmail.com, Port: 465, Use SSL: checked.
- Default user email suffix: optional (e.g., @example.com).
- Used sender email 'john.nyange@student.moringaschool.com' with an app password: Generate from Google Account > Security > App passwords > Select "Mail" and device > Copy password.
- Set credentials: SMTP Username: john.nyange@student.moringaschool.com, Password: app password.
- Test configuration: Click "Test configuration" and enter a test recipient to verify.
- Add recipient credential: Manage Jenkins > Manage Credentials > (global) > Add Credentials > Kind: Secret text > ID: email-recipient > Secret: jnmajanga@gmail.com > Description: "Failure notification email" > OK.
- In the Jenkinsfile, the `post { failure { ... } }` block uses the `mail` step to send notifications. The recipient is pulled from credentials (`email-recipient`) using `withCredentials` for security, avoiding hardcoding:
  ```groovy
  post {
      failure {
          withCredentials([string(credentialsId: 'email-recipient', variable: 'EMAIL_TO')]) {
              mail to: "${EMAIL_TO}",
                   subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} in ${FAILED_STAGE}",
                   body: """The build failed in the ${FAILED_STAGE} stage at ${new Date().toString()}.
                    Commit: ${env.GIT_COMMIT ?: 'Unknown'}.
                     Check console output at ${env.BUILD_URL} for details."""
          }
      }
  }

### Steps
1. **Merged Test Branch**:
   - Checked out `test` branch, verified tests with `npm test`.
   - Merged into `master`: `git checkout master; git merge test;`resolve any conflicts in files like Jenkinsfile or package.json).
   - Commit history shows the merge: Use `git log --graph` to verify.

2. **Updated Jenkinsfile**:
   - Added a Test stage and email notification for failures.
   - Email includes job name, build number, stage that failed, timestamp, commit hash, and console URL.
   ```groovy
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
           // cloning the repository
           stage('Checkout') {
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
               withCredentials([string(credentialsId: 'email-recipient', variable: 'EMAIL_TO')]) {
                   mail to: "${EMAIL_TO}",
                        subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} in ${FAILED_STAGE}",
                        body: """The build failed in the ${FAILED_STAGE} stage at ${new Date().toString()}.
                        Commit: ${env.GIT_COMMIT ?: 'Unknown'}.
                     Check console output at ${env.BUILD_URL} for details."""
               }
           }
       }
   }
   ```

3. **Landing Page Update**:
   - Added `<h1 style="font-size: 3em; color: blue;">MILESTONE 3</h1>` below Milestone 2.
   - Pushed, verified tests passed, and Render updated.

### Screenshot
<img src="public/images/landing_page.png" alt="Milestone 3 landing page">
<img src="public/images/tests.png" alt="Milestone 3 Tests">
<img src="public/images/emailtests.png" alt="Milestone 3 email notification">

## Milestone 4: Slack Integration
Integrated Slack to send notifications on successful deploys, including build details.

### Slack Configuration
- Install the "Slack Notification" plugin: Manage Jenkins > Manage Plugins > Available Plugins > Search "Slack Notification" > Check and Install without restart (or restart if prompted).
- Create Slack App: Go to https://api.slack.com/apps > Create New App > From scratch > App Name: e.g., "JenkinsNotifier" > Workspace: devopsb2c11.
- Add scopes: In app settings > OAuth & Permissions > Scopes > Add `chat:write, channels:join`.
- Install to Workspace: OAuth & Permissions > Install App to Workspace > Allow > Copy "Bot User OAuth Token" (starts with xoxb-).
- Add credential in Jenkins: Manage Jenkins > Manage Credentials > (global) > Add Credentials > Kind: Secret text > ID: slack-token > Secret: paste bot token > Description: "Slack bot token for notifications" > OK.
- Configure Slack in Jenkins: Manage Jenkins > Configure System > Scroll to "Slack" section.
- Set Workspace: devopsb2c11 (without .slack.com).
- Credential: Select slack-token-yaml from dropdown.
- Default Channel: optional (e.g., #john_ip1).
- Test Connection: Click "Test Connection" to verify.
- In the Jenkinsfile, the `post { success { ... } }` block uses the `slackSend` step from the plugin. The channel is set via environment variable, and the token is pulled from credentials (not hardcoded for security):
```groovy  
success {  // On success, send to Slack
    slackSend channel: "${SLACK_CHANNEL}",
              tokenCredentialId: 'slack-token-yaml',
              message: "Build #${env.BUILD_ID} successful at ${new Date().toString()}. Commit: ${env.GIT_COMMIT ?: 'Unknown'}. Deployed to ${RENDER_URL}"
}
```
### Steps
1. **Slack Setup**:
   - Create channel: In Slack workspace (devopsb2c11), create #john_ip1 and invite team members (e.g., TM).
   - Created a Slack app as above, added scopes, installed to workspace.
   - Stored bot token in Jenkins credentials (`slack-token-yaml`).

2. **Updated Jenkinsfile**:
   - Added success notification with build ID, Render URL, and timestamp.
   ```groovy
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
        // cloning the repository
        stage('Checkout') {
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
            withCredentials([string(credentialsId: 'email-recipient', variable: 'EMAIL_TO')]) {
                mail to: "${EMAIL_TO}",
                     subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} in ${FAILED_STAGE}",
                     body: """The build failed in the ${FAILED_STAGE} stage at ${new Date().toString()}.
                     Commit: ${env.GIT_COMMIT ?: 'Unknown'}.
                     Check console output at ${env.BUILD_URL} for details."""
            }
        }

        success {  // On success, send to Slack
            slackSend channel: "${SLACK_CHANNEL}",
                      tokenCredentialId: 'slack-token-yaml',
                      message: "Build #${env.BUILD_ID} successful at ${new Date().toString()}. Commit: ${env.GIT_COMMIT ?: 'Unknown'}. Deployed to ${RENDER_URL}"
        }
    }
}
   

3. **Landing Page Update**:
   - Added `<h1 style="font-size: 3em; color: green;">MILESTONE 4</h1>` below others.
   - Pushed, verified Slack notification and Render update.

### Screenshot
<img src="public/images/slack.png" alt="Milestone 4 Slack"> 

## Landing Page
The landing page (`views/index.ejs`) displays the milestones prominently:
- `<h1 style="font-size: 3em; color: red;">MILESTONE 2</h1>`
- `<h1 style="font-size: 3em; color: blue;">MILESTONE 3</h1>`
- `<h1 style="font-size: 3em; color: green;">MILESTONE 4</h1>`

<img src="public/images/landing_page.png" alt="Landing Page"> 

## Render Deployment
The application is live at: https://darkroom-app.onrender.com

## Slack access
https://devopsb2c11.slack.com/archives/C09G6D54ELB

## Author
- **Name**: John Nyange Majanga
- **GitHub**: https://github.com/Majangajohn
- **Email**: jnmajanga@gmail.com
- **Additional Notes**: "Completed for IP1 assignment, DEVOPSB2C11 Fall 2025."
