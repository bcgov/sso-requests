import React, { createContext, useContext, useReducer, useMemo } from 'react';
import isBoolean from 'lodash.isboolean';
import { Alert } from '@bcgov-sso/common-react-components';
import FadingAlert from 'html-components/FadingAlert';
import TopAlertWrapper from 'components/TopAlertWrapper';
import FloatingAlert from 'components/FloatingAlert';

const defaultContextValue = { state: '', dispatch: () => null } as any;
const TopAlertContext = createContext(defaultContextValue);

interface ReducerState {
  show?: boolean;
  key?: string;
  variant?: string;
  faceOut?: boolean;
  closable?: boolean;
  content?: string;
  floating?: boolean;
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

  return <TopAlertContext.Provider value={contextValue}>{children}</TopAlertContext.Provider>;
}

export const TopAlert = ({ children }: Props) => {
  const { state } = useContext<any>(TopAlertContext);
  const AlertWrapper = state.floating ? FloatingAlert : TopAlertWrapper;
  const AlertComponent = state.fadeOut ? FadingAlert : Alert;

  return (
    <>
      {state.show && (
        <AlertWrapper key={state.key}>
          <AlertComponent
            variant={state.variant || 'success'}
            fadeOut={state.fadeOut || 10000}
            closable={isBoolean(state.closable) ? state.closable : true}
            content={state.content || ``}
          >
            {state.children}
          </AlertComponent>
        </AlertWrapper>
      )}
      {children}
    </>
  );
};

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
