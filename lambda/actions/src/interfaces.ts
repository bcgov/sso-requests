interface Headers {
  [key: string]: string;
}

export interface Response {
  statusCode?: number;
  headers?: Headers;
  isBase64Encoded?: boolean;
  body?: string;
}
