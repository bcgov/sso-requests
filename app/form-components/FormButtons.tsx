import Button from '@button-inc/bcgov-theme/Button';
import styled from 'styled-components';
import { noop } from 'lodash';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import CancelButton from 'components/CancelButton';
import { FORM_BUTTON_MIN_WIDTH, FORM_BUTTON_TOP_SPACING } from 'styles/theme';
import { LastSavedMessage } from '@bcgov-sso/common-react-components';

interface Props {
  loading?: boolean;
  backButton?: React.ReactNode;
  text: {
    continue: string;
    back: string;
  };
  handleSubmit?: Function;
  handleBackClick?: Function;
  formSubmission?: boolean;
  savingStatus: {
    saving: boolean;
    content: string;
    variant?: string;
  };
}

const PaddedButton = styled(Button)`
  margin-left: 10px;
  min-width: ${FORM_BUTTON_MIN_WIDTH};
`;

const Container = styled.div`
  margin-top: ${FORM_BUTTON_TOP_SPACING};
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
      <Container data-test-id="form-btns">
        {backButton ? (
          backButton
        ) : (
          <CancelButton variant="secondary" size="medium" type="button" onClick={handleBackClick}>
            {text.back}
          </CancelButton>
        )}
        <PaddedButton
          variant="primary"
          size="medium"
          onClick={loading ? noop : handleSubmit}
          type={formSubmission ? 'submit' : 'button'}
        >
          {loading ? (
            <SpinnerGrid color="#FFF" height={18} width={50} wrapperClass="d-block" visible />
          ) : (
            <>{text.continue}</>
          )}
        </PaddedButton>
      </Container>
      <LastSavedMessage {...savingStatus} />
    </>
  );
}
