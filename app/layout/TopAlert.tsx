import React, { createContext, useReducer, useMemo } from 'react';
import { isBoolean } from 'lodash';
import FadingAlert from 'html-components/FadingAlert';
import TopAlertWrapper from 'components/TopAlertWrapper';

const defaultContextValue = { state: '', dispatch: () => null } as any;
const TopAlertContext = createContext(defaultContextValue);

interface ReducerState {
  show?: boolean;
  key?: string;
  variant?: string;
  faceOut?: boolean;
  closable?: boolean;
  content?: string;
}

interface Props {
  children?: React.ReactNode;
}

const reducer = (state: ReducerState, update: any) => {
  return { ...state, ...update };
};

export default function TopAlertProvider({ children }: Props) {
  const [state, dispatch] = useReducer(reducer, {});

  const contextValue = useMemo(() => {
    return { state, dispatch };
  }, [state, dispatch]);

  return (
    <TopAlertContext.Provider value={contextValue}>
      {state.show && (
        <TopAlertWrapper key={state.key}>
          <FadingAlert
            variant={state.variant || 'success'}
            fadeOut={state.fadeOut || 10000}
            closable={isBoolean(state.closable) ? state.closable : true}
            content={state.content || ``}
          />
        </TopAlertWrapper>
      )}
      {children}
    </TopAlertContext.Provider>
  );
}

export const withTopAlert = (Component: any) => (props: any) =>
  (
    <TopAlertContext.Consumer>
      {({ state, dispatch }) => (
        <Component
          {...props}
          alert={{
            show: (payload: any) => dispatch({ ...payload, show: true, key: String(new Date().getTime()) }),
            hide: () => dispatch({ show: false }),
          }}
        >
          {props.children}
        </Component>
      )}
    </TopAlertContext.Consumer>
  );

export interface TopAlert {
  show: Function;
  hide: Function;
}
