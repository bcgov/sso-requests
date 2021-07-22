import { applyTheme, StyleConfig } from '@button-inc/component-library/Button';

export const styles = {
  shared: {
    button: `
      border-radius: 0.222em;
      border-width: 0;
      padding: 0.66em 1.77em;
      text-align: center;
      text-decoration: none;
      font-weight: 700;
      letter-spacing: 1px;
      display: inline-block;
      cursor: pointer;
      box-shadow: 0px 0px 0px 2px transparent inset, 0px 0em 0px 0px rgba(34, 36, 38, 0.15) inset;
    `,
  },
  size: {
    small: {
      button: `
        font-size: 0.8rem;
      `,
    },
    medium: {
      button: `
        font-size: 1rem;
      `,
    },
    large: {
      button: `
        font-size: 1.2rem;
      `,
    },
  },
  variant: {
    primary: {
      button: `
        background-color: #D5EDFF;
        box-shadow: 0px 0px 0px 2px #D5EDFF inset !important;
        color: ##3E3E3E;

        &:hover {
          text-decoration: underline;
          opacity: 0.80;
        }

        &:active {
          opacity: 1;
        }
      `,
    },
  },
};

const config: StyleConfig = {
  defaultProps: {
    variant: 'primary',
    size: 'medium',
  },
  breakProps: [],
  staticProps: ['fullHeight', 'fullWidth'],
};

const Button = applyTheme(styles, config);

export default Button;
