import Alert from 'react-bootstrap/Alert';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

const RestrictedAlert = styled(Alert)`
  display: flex;
  align-items: flex-start;
  gap: 0.75em;
  margin: 0.5em 0 1em 1.5em;
  max-width: 700px;
  border: 1px solid #f8bb47;
  border-left: 8px solid #f8bb47;
  color: #313132;
  background-color: #fef1d8;
  font-size: 1rem;

  svg {
    margin-top: 0.2em;
    flex-shrink: 0;
    color: #6d4f00;
  }

  a {
    color: #1a5a96;
  }
`;

interface Props {
  exempted: boolean;
  title: string;
  label: string;
}

export default function ({ exempted, title, label }: Props) {
  return (
    <RestrictedAlert variant="warning">
      <FontAwesomeIcon icon={faTriangleExclamation} />
      <div>
        <strong>{title}</strong>
        {exempted ? (
          <>
            <p className="mb-2 mt-1">
              {label} stopped taking new services on June 1, 2026 (
              <a
                href="https://ociomysc.service-now.com/sp?id=kb_article&sys_id=4221c6932b1a8b9083eaf885d391bfb8&spa=1"
                target="_blank"
                rel="noreferrer"
              >
                Service Bulletin 1749, July 30, 2026
              </a>
              ).
            </p>
            <p>This integration is approved under an exemption. No action is needed.</p>
          </>
        ) : (
          <>
            <p className="mb-2 mt-1">
              Onboarding of new services to {label} was halted on June 1, 2026 (
              <a
                href="https://ociomysc.service-now.com/sp?id=kb_article&sys_id=4221c6932b1a8b9083eaf885d391bfb8&spa=1"
                target="_blank"
                rel="noreferrer"
              >
                Service Bulletin 1749, July 30, 2026
              </a>
              ). Requests are approved only for services with an exemption.
            </p>
            <p className="mb-0">
              You can keep this option selected. Your request will be reviewed before anything is provisioned, and the
              team will contact you about your options.
            </p>
          </>
        )}
      </div>
    </RestrictedAlert>
  );
}
