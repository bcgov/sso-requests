import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: block;
  max-width: 100% !important;

  /* Mobile */

  @media only screen and (max-width: 767px) {
    & {
      width: auto !important;
      margin-left: 1em !important;
      margin-right: 1em !important;
    }
  }

  /* Tablet */

  @media only screen and (min-width: 768px) and (max-width: 991px) {
    & {
      width: 723px;
      margin-left: auto !important;
      margin-right: auto !important;
    }
  }

  /* Small Monitor */

  @media only screen and (min-width: 992px) and (max-width: 1199px) {
    & {
      width: 933px;
      margin-left: auto !important;
      margin-right: auto !important;
    }
  }

  /* Large Monitor */

  @media only screen and (min-width: 1200px) {
    & {
      width: 1127px;
      margin-left: auto !important;
      margin-right: auto !important;
    }
  }
`;

export default Container;
