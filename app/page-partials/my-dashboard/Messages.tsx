import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const NotAvailable = styled.div`
  color: #a12622;
  height: 60px;
  padding-left: 20px;
  padding-top: 16px;
  padding-bottom: 22px;
  weight: 700;
  background-color: #f2dede;
`;

const NoProjects = styled.div`
  color: #006fc4;
  height: 60px;
  padding-left: 20px;
  padding-top: 16px;
  padding-bottom: 22px;
  weight: 700;
  background-color: #f8f8f8;
`;

export const SystemUnavailableMessage = () => (
  <NotAvailable>
    <FontAwesomeIcon icon={faExclamationCircle} title="Unavailable" />
    &nbsp; The system is unavailable at this moment. please refresh the page.
  </NotAvailable>
);

export const NoEntitiesMessage = ({ message }: { message: string }) => (
  <NoProjects>
    <FontAwesomeIcon icon={faInfoCircle} title="Information" />
    &nbsp; {message}
  </NoProjects>
);
