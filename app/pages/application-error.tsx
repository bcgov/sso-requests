import styled from 'styled-components';
import toLower from 'lodash.tolower';
import ErrorImage from 'svg/ErrorImage';
import { useRouter } from 'next/router';
import { removeTokens } from 'utils/store';
import { getTemplate as getE01Template } from '@app/error-messages/e01';
import { getTemplate as getE02Template } from '@app/error-messages/e02';
import { getTemplate as getE03Template } from '@app/error-messages/e03';
import { getTemplate as getE04Template } from '@app/error-messages/e04';
import { getMaintenanceTemplate } from '@app/error-messages/maintenance';

const Container = styled.div`
  text-align: center;
`;

export default function ApplicationError() {
  const router = useRouter();
  const errorCode = toLower(String(router?.query?.error || ''));
  let title = null;
  let content = null;

  switch (errorCode) {
    case 'e01':
      [title, content] = getE01Template();
      break;
    case 'e02':
      removeTokens();
      [title, content] = getE02Template();
      break;
    case 'e03':
      [title, content] = getE03Template();
      break;
    case 'e04':
      [title, content] = getE04Template();
      break;
    case 'maintenance':
      [title, content] = getMaintenanceTemplate();
      break;
    default:
      break;
  }

  return (
    <Container>
      <ErrorImage title={title}>{content}</ErrorImage>
    </Container>
  );
}
