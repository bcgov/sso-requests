import React from 'react';
import styled from 'styled-components';
import { FieldTemplateProps } from 'react-jsonschema-form';
import InfoOverlay from 'components/InfoOverlay';
import FieldTemplate from './FieldTemplate';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faEnvelope, faFileAlt, faUserAlt } from '@fortawesome/free-solid-svg-icons';
const Container = styled.div`
  margin-top: var(--field-top-spacing);
`;

const Title = styled.legend`
  font-weight: bold;
  font-size: 1rem;
  margin: 0;
`;

function clickToPopup(popupInfo: any) {
  popupInfo = document.getElementById('PopupInfo');
  popupInfo.classList.toggle('show-info');
}

export default function FieldAccessTokenLifespan(props: FieldTemplateProps) {
  var popupInfo: any;
  const top = (
    <>
      <Container>
        <Title>
          Additional Settings (Optional)&nbsp;
          <InfoOverlay content="If you would like this set for your integration, please contact the Pathfinder SSO Team." />
          &nbsp;
          <div className="popup-info-box" onClick={() => clickToPopup(popupInfo)}>
            <FontAwesomeIcon icon={faEnvelope} />
            <span className="popup-text" id="PopupInfo">
              Please contact <a href="mailto:bcgov.sso@gov.bc.ca">Pathfinder SSO Team</a> if you have questions for the
              section below.
            </span>
          </div>
        </Title>
      </Container>
      <br />
    </>
  );

  return <FieldTemplate {...props} top={top} />;
}
