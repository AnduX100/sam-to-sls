# SAM to Serverless (Monorepo con Serverless Compose)

Servicios:
- vpc/  (VPC aislada)
- db/   (DynamoDB aislado)
- api/  (Lambda + API Gateway aislado)

Despliegue (más adelante):
sls deploy --config serverless-compose.yml --stage dev --region us-east-1
