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
- Slack notifications with build ID and Render URL on success.
- Email alerts with detailed failure information, including the failing stage.

## Milestone 1: Setup
Configured the application to connect to MongoDB Atlas and set up Render for deployment.

### Steps
1. **Forked and Cloned Repository**:
   - Forked the original repository to [GitHub Repo](#) ([https://github.com/jonnygovish/gallery]).
   - Cloned locally: `git clone https://github.com/Majangajohn/gallery.git`.

2. **MongoDB Atlas Setup**:
   - Created a free-tier cluster on MongoDB Atlas.
   - Added a database with user,password & database stored in Render environment variables (`MONGO_USER`,`MONGO_PASSWORD`,`MONGO_DB`).
   - Updated `_config.js` to use `process.env.MONGO_USER`,`process.env.MONGO_PASSWORD` & `process.env.MONGO_DB}` for secure connection:
     ```javascript
     config.mongoURI = {
      production: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&appName=IP1Cluster`,
      development: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}-dev?retryWrites=true&w=majority&appName=IP1Cluster`,
      test: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@ip1cluster.qkv1jtt.mongodb.net/${process.env.MONGO_DB}-test?retryWrites=true&w=majority&appName=IP1Cluster`,   
      }
     ```
   - Locally, used a `.env` file with `MONGO_PASSWORD`,`MONGO_USER` & `MONGO_DB` (not committed).

3. **Updated server.js**:
   - Added `require('dotenv').config()` for local env vars.
   - Connected to MongoDB using `process.env.MONGODB_URI || config.mongoURI[app.settings.env]`.

4. **Render Setup**:
   - Created a Web Service on Render, connected to the GitHub repo.
   - Set environment variables: `MONGO_PASSWORD`, `MONGO_USER`, `MONGO_DB` and `NODE_ENV=production`.
   - Build command: `npm install`, Start command: `node server.js`.
   - Disabled auto-deploys for pipeline control.

### Screenshot
![Milestone 1 Setup](images/MongoAtlas.png)  


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
   - Stages: Build (installs dependencies) and Deploy (triggers Render).
   ```groovy
   pipeline {
       agent { docker { image 'node:lts' } }
       environment { RENDER_DEPLOY_HOOK = credentials('render-deploy-hook') }
       stages {
           stage('Build') { steps { sh 'npm install' } }
           stage('Deploy') { steps { sh "curl -X POST \${RENDER_DEPLOY_HOOK}" } }
       }
   }
   ```

4. **Landing Page Update**:
   - Added `<h1 style="font-size: 3em; color: red;">MILESTONE 2</h1>` to `views/index.ejs`).
   - Pushed changes, verified on Render.

### Screenshot
![Milestone 2 Pipeline](images/landing_page.png)  
![Milestone 2 deployment on jenkins using docker](images/jenkins.png)

## Milestone 3: Tests
Merged tests from the `test` branch and updated the pipeline to run them, with email notifications on failure.

### Steps
1. **Merged Test Branch**:
   - Checked out `test` branch, verified tests with `npm test`.
   - Merged into `master`: `git checkout master; git merge test; resolve conflicts`.
   - Commit history shows the merge.

2. **Updated Jenkinsfile**:
   - Added a Test stage and email notification for failures.
   - Email includes job name, build number, stage that failed, and console URL.
   ```groovy
   pipeline {
       agent { docker { image 'node:lts' } }
       environment { RENDER_DEPLOY_HOOK = credentials('render-deploy-hook') }
       stages {
           stage('Build') { steps { sh 'npm install' } }
           stage('Test') { steps { sh 'npm test' } }
           stage('Deploy') { steps { sh "curl -X POST \${RENDER_DEPLOY_HOOK}" } }
       }
       post {
           failure {
               mail to: 'email',
                    subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} in ${env.STAGE_NAME}",
                    body: "The build failed in the ${env.STAGE_NAME} stage. Check console output at ${env.BUILD_URL} for details."
           }
       }
   }
   ```

3. **Landing Page Update**:
   - Added `<h1 style="font-size: 3em; color: blue;">MILESTONE 3</h1>` below Milestone 2.
   - Pushed, verified tests passed, and Render updated.

### Screenshot
![Milestone 3 landing page](images/landing_page.png)  
![Milestone 3 Tests](images/tests.png) 
![Milestone 3 email notification](images/emailtests.png) 


## Milestone 4: Slack Integration
Integrated Slack to send notifications on successful deploys, including build details.

### Steps
1. **Slack Setup**:
   - Created channel `#john_ip1` and invited TM.
   - Created a Slack app, added scopes (`chat:write`, `channels:join`), installed to workspace `devopsb2c11`. 
   - Stored bot token in Jenkins credentials (`slack-token`).

2. **Updated Jenkinsfile**:
   - Added success notification with build ID, Render URL, and timestamp.
   ```groovy
   pipeline {
       agent { docker { image 'node:lts' } }
       environment {
           RENDER_DEPLOY_HOOK = credentials('render-deploy-hook')
           RENDER_URL = '[Placeholder: Your Render URL]'
           SLACK_CHANNEL = '#john_ip1'
       }
       stages {
           stage('Build') { steps { sh 'npm install' } }
           stage('Test') { steps { sh 'npm test' } }
           stage('Deploy') { steps { sh "curl -X POST \${RENDER_DEPLOY_HOOK}" } }
       }
       post {
           failure {
               mail to: 'email',
                    subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} in ${env.STAGE_NAME}",
                    body: "The build failed in the ${env.STAGE_NAME} stage. Check console output at ${env.BUILD_URL} for details."
           }
           success {
               slackSend channel: "${SLACK_CHANNEL}",
                         message: "Build #${env.BUILD_ID} succeeded at ${new Date().toString()}. Deployed to ${RENDER_URL}"
           }
       }
   }
   ```

3. **Landing Page Update**:
   - Added `<h1 style="font-size: 3em; color: green;">MILESTONE 4</h1>` below others.
   - Pushed, verified Slack notification and Render update.

### Screenshot
![Milestone 4 Slack](images/slack.png)  

## Landing Page
The landing page (`views/index.ejs`) displays the milestones prominently:
- `<h1 style="font-size: 3em; color: red;">MILESTONE 2</h1>`
- `<h1 style="font-size: 3em; color: blue;">MILESTONE 3</h1>`
- `<h1 style="font-size: 3em; color: green;">MILESTONE 4</h1>`

![Landing Page](images/landing_page.png)  

## Render Deployment
The application is live at: https://darkroom-app.onrender.com

## Slack access
https://app.slack.com/client/T09FWHYQVPH/C09G6D54ELB

## Author
- **Name**: John Nyange Majanga
- **GitHub**: https://github.com/Majangajohn
- **Email**: jnmajanga@gmail.com
- **Additional Notes**: "Completed for IP1 assignment, DEVOPSB2C11 Fall 2025."