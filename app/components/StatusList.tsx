import styled from 'styled-components';

export default styled.ul`
  list-style-type: none;
  margin: 0;
  position: relative;

  & li {
    border-bottom: 1px solid #d4d4d4;
    & svg.svg-inline--fa {
      position: absolute;
      right: 0;
    }

    & div.icon {
      position: absolute;
      right: 0;
      bottom: 5px;
    }
  }
`;
