import React from 'react';
import { Resizable } from 're-resizable';
import styled from 'styled-components';
import ResponsiveContainer, { MediaRule } from 'components/ResponsiveContainer';

const mediaRules: MediaRule[] = [
  {
    maxWidth: 900,
    marginTop: 0,
    marginLeft: 10,
    marginRight: 10,
    marginUnit: 'px',
    horizontalAlign: 'none',
  },
  {
    width: 480,
    marginTop: 0,
    marginLeft: 2.5,
    marginRight: 2.5,
    marginUnit: 'rem',
    horizontalAlign: 'none',
  },
];

const InnerResizable = styled.div`
  height: 100%;
  overflow: auto;
`;

interface Props {
  leftPanel?: () => React.ReactNode;
  rightPanel?: () => React.ReactNode;
  showResizable?: boolean;
  children?: React.ReactNode;
}

function VerticalLayout({ leftPanel, rightPanel, showResizable = true, children }: Props) {
  return (
    <ResponsiveContainer rules={mediaRules}>
      {showResizable ? (
        <Resizable
          style={{ paddingTop: '2px', borderBottom: '3px solid black' }}
          defaultSize={{
            width: '100%',
            height: window.innerHeight * 0.45,
          }}
          enable={{ bottom: true }}
          handleStyles={{ bottom: { bottom: 0 } }}
        >
          <InnerResizable>{leftPanel && leftPanel()}</InnerResizable>
        </Resizable>
      ) : (
        leftPanel && leftPanel()
      )}
      <br />
      {rightPanel && rightPanel()}
    </ResponsiveContainer>
  );
}

export default VerticalLayout;
