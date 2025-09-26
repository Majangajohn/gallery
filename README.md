# Gallery Application Deployment Pipeline

This repository contains a Node.js-based photo gallery application ("darkroom") deployed to Render using a Jenkins CI/CD pipeline. The project integrates MongoDB Atlas for the database, includes automated tests, and sends notifications via email (on failure) and Slack (on success). This README outlines the setup, pipeline, and deployment process.

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
   - Created a free-tier cluster on MongoDB Atlas.
   - Added a database with user, password & database stored in Render environment variables (`MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DB`).
   - Updated `_config.js` to use `process.env.MONGO_USER`, `process.env.MONGO_PASSWORD` & `process.env.MONGO_DB` for secure connection:
     ```javascript
     config.mongoURI = {
         production: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=IP1Cluster`,
         development: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}-dev?retryWrites=true&w=majority&appName=IP1Cluster`,
         test: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}-test?retryWrites=true&w=majority&appName=IP1Cluster`,   
     }
     ```
   - Locally, used a `.env` file with `MONGO_PASSWORD`, `MONGO_USER` & `MONGO_DB` (not committed).

3. **Updated server.js**:
   - Added `require('dotenv').config()` for local env vars.
   - Connected to MongoDB using `process.env.MONGODB_URI || config.mongoURI[app.settings.env]`.

4. **Render Setup**:
   - Created a Web Service on Render, connected to the GitHub repo.
   - Set environment variables: `MONGO_PASSWORD`, `MONGO_USER`, `MONGO_DB` and `NODE_ENV=production`.
   - Build command: `npm install`, Start command: `node server.js`.
   - Disabled auto-deploys for pipeline control.

### Screenshot
![Milestone 1 Pipeline](public/images/MongoAtlas.png)

## Milestone 2: Basic Pipeline
Created a Jenkins pipeline to build and deploy the app automatically on GitHub pushes.

### Steps
1. **Jenkins Setup**:
   - Ran Jenkins in Docker with a custom Dockerfile including Docker CLI:
     ```dockerfile
     FROM jenkins/jenkins:lts
     USER root
     RUN apt-get update && ...
     RUN groupadd -g <host_gid> docker && usermod -aG docker jenkins
     USER jenkins
     ```
   - Mounted volumes: `-v jenkins_home:/var/jenkins_home -v /var/run/docker.sock:/var/run/docker.sock`.

2. **Pipeline Configuration**:
   - Created a pipeline job in Jenkins, linked to the GitHub repo.
   - Added GitHub webhook for auto-triggers on push through exposing my local ip through ngrok
   - Stored Render deploy hook in Jenkins credentials (`render-deploy-hook`).

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
![Milestone 2 Pipeline](public/images/landing_page.png)  
![Milestone 2 deployment on jenkins using docker](public/images/jenkins.png)

## Milestone 3: Tests
Merged tests from the `test` branch and updated the pipeline to run them, with email notifications on failure.

### Email Configuration
- In Jenkins: Navigate to Manage Jenkins > Configure System > E-mail Notification.
- Set SMTP server (e.g., smtp.gmail.com), port (465 for SSL), and enabled SSL.
- Used sender email 'jnmajanga@gmail.com' with an app password (generated from Google account for security, stored in Jenkins global configuration—not in Jenkinsfile).
- Tested configuration to ensure emails send correctly.
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

  - Added credential 'email-recipient' in Jenkins as a secret text with value 'jnmajanga@gmail.com'.

### Steps
1. **Merged Test Branch**:
   - Checked out `test` branch, verified tests with `npm test`.
   - Merged into `master`: `git checkout master; git merge test; resolve conflicts`.
   - Commit history shows the merge.

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
![Milestone 3 landing page](public/images/landing_page.png)  
![Milestone 3 Tests](public/images/tests.png) 
![Milestone 3 email notification](public/images/emailtests.png) 

## Milestone 4: Slack Integration
Integrated Slack to send notifications on successful deploys, including build details.

### Slack Configuration
- Installed the "Slack Notification" plugin in Jenkins: Manage Jenkins > Plugins > Available > Search "Slack Notification" > Install and restart.
- In Jenkins: Manage Jenkins > Configure System > Slack section.
- Set Workspace (e.g., 'devopsb2c11'), Credential (added secret text credential 'slack-token' with the bot OAuth token), and Default Channel (optional).
- Tested connection from the config page.
- In the Jenkinsfile, the `post { success { ... } }` block uses the `slackSend` step from the plugin. The channel is set via environment variable, and the token is pulled from credentials (not hardcoded for security).

### Steps
1. **Slack Setup**:
   - Created channel `#john_ip1` and invited TM.
   - Created a Slack app, added scopes (`chat:write`, `channels:join`), installed to workspace `devopsb2c11`. 
   - Stored bot token in Jenkins credentials (`slack-token`).

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
                         message: "Build #${env.BUILD_ID} successful at ${new Date().toString()}. Commit: ${env.GIT_COMMIT ?: 'Unknown'}. Deployed to ${RENDER_URL}"
           }
       }
   }
   

3. **Landing Page Update**:
   - Added `<h1 style="font-size: 3em; color: green;">MILESTONE 4</h1>` below others.
   - Pushed, verified Slack notification and Render update.

### Screenshot
![Milestone 4 Slack](public/images/slack.png)  

## Landing Page
The landing page (`views/index.ejs`) displays the milestones prominently:
- `<h1 style="font-size: 3em; color: red;">MILESTONE 2</h1>`
- `<h1 style="font-size: 3em; color: blue;">MILESTONE 3</h1>`
- `<h1 style="font-size: 3em; color: green;">MILESTONE 4</h1>`

![Landing Page](public/images/landing_page.png)  

## Render Deployment
The application is live at: https://darkroom-app.onrender.com

## Slack access
https://app.slack.com/client/T09FWHYQVPH/C09G6D54ELB

## Author
- **Name**: John Nyange Majanga
- **GitHub**: https://github.com/Majangajohn
- **Email**: jnmajanga@gmail.com
- **Additional Notes**: "Completed for IP1 assignment, DEVOPSB2C11 Fall 2025."
