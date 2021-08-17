import { useContext, useState } from 'react';
import styled from 'styled-components';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Alert from 'html-components/Alert';
import InstallationPanel from 'components/InstallationPanel';
import ConfigurationUrlPanel from 'components/ConfigurationUrlPanel';
import { RequestsContext } from 'pages/my-requests';
import { RequestReducerState } from 'reducers/requestReducer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRedo, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { getStatusDisplayName } from 'utils/status';
import { Request } from 'interfaces/Request';
import { getRequests } from 'services/request';
import { $setRequests } from 'dispatchers/requestDispatcher';
import Loader from 'react-loader-spinner';
import { SECONDARY_FONT_COLOR } from 'styles/theme';

const Spinner = styled(Loader)`
  display: inline;
  padding-left: 5px;
`;

const IconButton = styled(FontAwesomeIcon)`
  padding-left: 5px;
  color: #003366;
`;

const RequestTabs = styled(Tabs)`
  .nav-link {
    color: ${SECONDARY_FONT_COLOR} !important;
    height: 30px !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    padding-top: 0; !important;
    border-top: unset !important;
    border-left: unset !important;
    border-right: unset !important;
  }
  .nav-link.active {
    background-color: unset !important;
    border-bottom: 3px solid orange;
  }
`;

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

const timePassed = (time: string) => {
  return new Date().getTime() - new Date(time).getTime();
};

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * ONE_MIN;

interface Props {
  selectedRequest: Request;
}

function RequestInfoTabs({ selectedRequest }: Props) {
  const [loading, setLoading] = useState(false);
  const { dispatch } = useContext(RequestsContext);
  if (!selectedRequest) return null;
  const displayStatus = getStatusDisplayName(selectedRequest.status || 'draft');

  const handleRefresh = async () => {
    setLoading(true);
    const [data, err] = await getRequests();
    if (err) return setLoading(false);
    const requests = data || [];
    dispatch($setRequests(requests));
    setLoading(false);
  };

  let panel = null;
  if (displayStatus === 'In Draft') {
    panel = (
      <>
        <br />
        <Alert variant="info">
          <div>
            <strong>Your request has not been submitted.</strong>
          </div>
          <div>To complete your request, click &quot;Edit&quot; button.</div>
        </Alert>
      </>
    );
  } else if (displayStatus === 'Submitted') {
    panel = (
      <>
        <br />
        <Alert variant="info">
          <div>
            <strong>Your request is successfully submitted.</strong>
          </div>
          <div>
            <p>
              Your request is successfully submitted. Your request will be ready in just a moment… However, if you
              experience a delay, please try to refresh
              {loading ? (
                <Spinner type="TailSpin" color="#000" height={16} width={16} />
              ) : (
                <IconButton icon={faRedo} role="button" aria-label="edit" onClick={handleRefresh} />
              )}
            </p>
            <p>
              If you would prefer to talk to a human, please reach out to us.
              <a href="mailto:zorin.samji@gov.bc.ca" title="Pathfinder SSO">
                <IconButton icon={faEnvelope} />
              </a>
            </p>
          </div>
        </Alert>
      </>
    );
  } else if (displayStatus === 'Completed') {
    panel = (
      <RequestTabs>
        <Tab eventKey="installation-json" title="Installation JSON">
          <TabWrapper>
            <InstallationPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>
        <Tab eventKey="configuration-url" title="Configuration URIs">
          <TabWrapper>
            <ConfigurationUrlPanel selectedRequest={selectedRequest} />
          </TabWrapper>
        </Tab>
      </RequestTabs>
    );
  }

  return panel;
}

export default RequestInfoTabs;
