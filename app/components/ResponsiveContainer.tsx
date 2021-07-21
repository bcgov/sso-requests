import React from 'react';
import styled from 'styled-components';

export interface MediaRule {
  maxWidth?: number;
  width?: number;
  marginTop?: number;
}

export const defaultRules: MediaRule[] = [
  {
    maxWidth: 767,
    marginTop: 10,
  },
  {
    maxWidth: 991,
    width: 723,
    marginTop: 20,
  },
  {
    maxWidth: 1199,
    width: 933,
    marginTop: 50,
  },
  {
    width: 1127,
    marginTop: 80,
  },
];
export const requestPageRules = defaultRules.map((rule) => (rule.width === 1127 ? { ...rule, marginTop: 20 } : rule));

const Container = styled.div<{ rules: MediaRule[] }>`
  display: block;
  max-width: 100% !important;

  ${(props) =>
    props.rules.map((rule: MediaRule, index: number) => {
      if (index === 0) {
        return `@media only screen and (max-width: ${rule.maxWidth}px) {
          & {
            ${rule.marginTop && `margin-top: ${rule.marginTop}px;`}
            width: auto !important;
            margin-left: 1em !important;
            margin-right: 1em !important;
          }
        }`;
      } else if (index === props.rules.length - 1) {
        return `@media only screen and (min-width: ${(props.rules[index - 1].maxWidth || 0) + 1}px) {
          & {
            ${rule.marginTop && `margin-top: ${rule.marginTop}px;`}
            width: ${rule.width}px;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }`;
      } else {
        return `@media only screen and (min-width: ${(props.rules[index - 1].maxWidth || 0) + 1}px) and (max-width: ${
          rule.maxWidth
        }px) {
          & {
            ${rule.marginTop && `margin-top: ${rule.marginTop}px;`}
            width: ${rule.width}px;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }`;
      }
    })}
`;

export default Container;
