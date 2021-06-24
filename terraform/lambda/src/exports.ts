import { APIGatewayProxyEvent, Context } from 'aws-lambda';

export const handler = (event: APIGatewayProxyEvent, context: Context): string => {
  console.log('Hello from lambda, Events: \n' + JSON.stringify(event, null, 2));
  return context.logStreamName;
};
