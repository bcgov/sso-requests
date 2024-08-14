import styled from 'styled-components';
import noop from 'lodash.noop';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { FORM_BUTTON_TOP_SPACING } from 'styles/theme';
import { LastSavedMessage } from '@bcgov-sso/common-react-components';
import { MouseEventHandler } from 'react';

interface Props {
  loading?: boolean;
  backButton?: React.ReactNode;
  text: {
    continue: string;
    back: string;
  };
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  handleBackClick?: MouseEventHandler<HTMLButtonElement>;
  formSubmission?: boolean;
  savingStatus: {
    saving: boolean;
    content: string;
    variant?: string;
  };
}

const Container = styled.div`
  margin-top: ${FORM_BUTTON_TOP_SPACING};
  display: flex;
  column-gap: 0.625rem;
`;

export default function FormButtons({
  loading,
  backButton,
  text,
  handleSubmit,
  handleBackClick,
  formSubmission,
  savingStatus,
}: Props) {
  return (
    <>
      <Container data-testid="form-btns">
        {backButton ? (
          backButton
        ) : (
          <button className="secondary wide" type="button" onClick={handleBackClick}>
            {text.back}
          </button>
        )}
        <button
          className="primary wide"
          onClick={loading ? noop : handleSubmit}
          type={formSubmission ? 'submit' : 'button'}
        >
          {loading ? (
            <SpinnerGrid color="#FFF" height={18} width={50} wrapperClass="d-block" visible />
          ) : (
            <>{text.continue}</>
          )}
        </button>
      </Container>
      <LastSavedMessage {...savingStatus} />
    </>
  );
}
