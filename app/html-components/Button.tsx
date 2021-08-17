import { applyTheme, StyleConfig } from '@button-inc/component-library/Button';
import { DEFAULT_FONT_SIZE, PRIMARY_BUTTON_HOVER_COLOR } from 'styles/theme';

export const styles = {
  shared: {
    button: `
      border-radius: 0.222em;
      border-width: 0;
      padding: 0.6em 1.1em;
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
    xsmall: {
      button: `
        font-size: 0.7rem;
      `,
    },
    small: {
      button: `
        font-size: 0.8rem;
      `,
    },
    medium: {
      button: `
        font-size: ${DEFAULT_FONT_SIZE};
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
        color: #3E3E3E;

        &:hover {
          text-decoration: underline;
          background-color: #FFF7D5;
          box-shadow: 0px 0px 0px 2px #FFF7D5 inset !important;
          opacity: 0.80;
        }

        &:active {
          opacity: 1;
        }
      `,
    },
    grey: {
      button: `
        background-color: #B2B2B2;
        box-shadow: 0px 0px 0px 1px #707070 inset !important;
        color: #F8F8F8;
        min-width: 110px;

        &:hover {
          background-color: ${PRIMARY_BUTTON_HOVER_COLOR};
          box-shadow: 0px 0px 0px 1px #707070 inset !important;
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
