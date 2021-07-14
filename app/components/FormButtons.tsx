import Button from '@button-inc/bcgov-theme/Button';
import styled from 'styled-components';
import Loader from 'react-loader-spinner';
import 'react-loader-spinner/dist/loader/css/react-spinner-loader.css';

interface Props {
  show: boolean | undefined;
  loading: boolean;
  text: {
    continue: string;
    back: string;
  };
}

const PaddedButton = styled(Button)`
  margin-left: 10px;
  min-width: 150px;
`;

export default function FormButtons({ show, loading, text }: Props) {
  return (
    <>
      {show && (
        <>
          <Button variant="secondary">{text.back}</Button>
          <PaddedButton variant="primary">
            {loading ? <Loader type="Grid" color="#FFF" height={18} width={50} visible /> : <>{text.continue}</>}
          </PaddedButton>
        </>
      )}
    </>
  );
}
