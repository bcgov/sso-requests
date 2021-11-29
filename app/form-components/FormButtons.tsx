import Button from '@button-inc/bcgov-theme/Button';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import CancelButton from 'components/CancelButton';
import { FORM_BUTTON_MIN_WIDTH, FORM_BUTTON_TOP_SPACING } from 'styles/theme';
import { SaveMessage as SaveMessageInterface } from 'interfaces/form';
import SaveMessage from 'form-components/SaveMessage';

interface Props {
  show: boolean | undefined;
  loading?: boolean;
  text: {
    continue: string;
    back: string;
  };
  handleSubmit?: Function;
  handleBackClick?: Function;
  formSubmission?: boolean;
  saving?: boolean;
  saveMessage?: SaveMessageInterface;
}

const PaddedButton = styled(Button)`
  margin-left: 10px;
  min-width: ${FORM_BUTTON_MIN_WIDTH};
`;

const Container = styled.div`
  margin-top: ${FORM_BUTTON_TOP_SPACING};
`;

export default function FormButtons({
  show,
  loading,
  text,
  handleSubmit,
  handleBackClick,
  formSubmission,
  saving,
  saveMessage,
}: Props) {
  return (
    <>
      {show && (
        <>
          <Container data-test-id="form-btns">
            <CancelButton variant="secondary" size="medium" type="button" onClick={handleBackClick}>
              {text.back}
            </CancelButton>
            <PaddedButton
              variant="primary"
              size="medium"
              onClick={handleSubmit}
              type={formSubmission ? 'submit' : 'button'}
            >
              {loading ? <Loader type="Grid" color="#FFF" height={18} width={50} visible /> : <>{text.continue}</>}
            </PaddedButton>
          </Container>
          {(saving || saveMessage) && <SaveMessage saving={saving} saveMessage={saveMessage}></SaveMessage>}
        </>
      )}
    </>
  );
}
