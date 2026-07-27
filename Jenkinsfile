pipeline {
    agent any

    environment {
        AWS_REGION = "ap-south-1"
        AWS_ACCOUNT_ID = "564325282647"

        FRONTEND_IMAGE = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/unify-frontend"
        BACKEND_IMAGE  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/unify-backend"
        AI_IMAGE       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/unify-ai-agent"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                sh 'docker build -t $FRONTEND_IMAGE:latest ./frontend'
            }
        }

        stage('Build Backend') {
            steps {
                sh 'docker build -t $BACKEND_IMAGE:latest ./backend'
            }
        }

        stage('Build AI Agent') {
            steps {
                sh 'docker build -t $AI_IMAGE:latest ./ai-agent'
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr'
                ]]) {
                sh '''
                aws ecr get-login-password --region $AWS_REGION | \
                docker login --username AWS \
                --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                '''
                }
            }
        }

        stage('Push Images') {
            steps {
                sh '''
                docker push $FRONTEND_IMAGE:latest 
                docker push $BACKEND_IMAGE:latest 
                docker push $AI_IMAGE:latest 
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                kubectl apply -R -f k8s/

                kubectl rollout restart deployment/frontend -n unify
                kubectl rollout restart deployment/gateway -n unify
                kubectl rollout restart deployment/auth -n unify
                kubectl rollout restart deployment/workspace -n unify
                kubectl rollout restart deployment/ai-agent -n unify
                '''
            }
        }
    }
    post {
        success {
            echo "Deployment Successful!"
        }

        failure {
            echo "Deployment Failed!"
        }
    }
}