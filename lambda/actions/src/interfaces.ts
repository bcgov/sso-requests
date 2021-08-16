interface Headers {
  [key: string]: string;
}

export interface Response {
  statusCode?: number;
  headers?: Headers;
  isBase64Encoded?: boolean;
  body?: string;
}

export interface EmailOptions {
  from?: string;
  to: string;
  body: string;
  bodyType?: string;
  cc?: string[];
  bcc?: string[];
  delayTS?: number;
  encoding?: string;
  priority?: 'normal' | 'low' | 'high';
  subject?: string;
  tag?: string;
}
