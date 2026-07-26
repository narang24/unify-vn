pipeline {

    agent any

    environment {
        AWS_REGION = "ap-south-1"
        ECR_REPOSITORY = "unify-backend"

        ACCOUNT_ID = credentials('aws-account-id')

        IMAGE = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Build') {
            steps {
                dir('backend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Test') {
            steps {
                dir('backend') {
                    sh 'npm test || true'
                }
            }
        }

        stage('Login to Amazon ECR') {
            steps {
                sh """
                aws ecr get-login-password \
                --region ${AWS_REGION} \
                | docker login \
                --username AWS \
                --password-stdin \
                ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                """
            }
        }

        stage('Docker Build') {
            steps {
                dir('backend') {
                    sh """
                    docker build \
                    -t ${IMAGE}:${IMAGE_TAG} \
                    .
                    """
                }
            }
        }

        stage('Push Image') {
            steps {
                sh """
                docker push ${IMAGE}:${IMAGE_TAG}
                docker tag ${IMAGE}:${IMAGE_TAG} ${IMAGE}:latest
                docker push ${IMAGE}:latest
                """
            }
        }

        stage('Deploy Gateway') {
            steps {
                sh """
                kubectl set image deployment/gateway \
                gateway=${IMAGE}:${IMAGE_TAG} \
                -n unify
                """
            }
        }

        stage('Deploy Auth') {
            steps {
                sh """
                kubectl set image deployment/auth \
                auth=${IMAGE}:${IMAGE_TAG} \
                -n unify
                """
            }
        }

        stage('Deploy Workspace') {
            steps {
                sh """
                kubectl set image deployment/workspace \
                workspace=${IMAGE}:${IMAGE_TAG} \
                -n unify
                """
            }
        }

        stage('Wait For Rollout') {
            steps {
                sh """
                kubectl rollout status deployment/gateway -n unify
                kubectl rollout status deployment/auth -n unify
                kubectl rollout status deployment/workspace -n unify
                """
            }
        }
    }

    post {

        success {
            echo "Deployment Successful"
        }

        failure {
            echo "Deployment Failed"
        }
    }
}