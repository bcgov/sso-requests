import axios, { AxiosRequestConfig } from 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig extends AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

declare module 'react-typography' {
  export function TypographyStyle(props: any): JSX.Element;
}

declare module '@button-inc/bcgov-theme/esm/svg/bcgov_logo' {
  const bcgovLogoSVG: any;
  export default bcgovLogoSVG;
}
