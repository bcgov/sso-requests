import React from 'react';
import styled from 'styled-components';
import { FieldTemplateProps } from 'react-jsonschema-form';
import { FORM_TOP_SPACING } from 'styles/theme';
import CenteredModal from 'components/CenteredModal';
import CreateTeamForm from 'form-components/team-form/CreateTeamForm';
import { createTeamModalId } from 'utils/constants';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';

const Container = styled.div`
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: center;
  margin-top: ${FORM_TOP_SPACING};
  cursor: pointer;
`;

const Label = styled.label`
  font-weight: bold;
  cursor: pointer;
`;

const Description = styled.p`
  grid-column: 2;
  color: #7f7f7f;
`;

import FieldTemplate from './FieldTemplate';

export default function FieldProjectTeam(props: FieldTemplateProps) {
  const { formContext } = props;
  const { formData, setFormData, loadTeams } = formContext;
  const [openModal, setOpenModal] = React.useState(false);

  const handleClick = () => {
    setOpenModal(true);
  };

  const handleModalClose = () => {
    setOpenModal(false);
  };

  const bottom = (
    <>
      <Container onClick={handleClick}>
        <FontAwesomeIcon style={{ color: '#006fc4' }} icon={faPlusCircle} title="Add Team" />
        <Label>Create a New Team (optional)</Label>
        <Description>
          Add other members to help manage the integration, and re-use your teams across multiple integrations
        </Description>
      </Container>
      <CenteredModal
        title="Create a New Team"
        icon={null}
        content={
          <CreateTeamForm
            onSubmit={async (teamId: number) => {
              await loadTeams();
              setFormData({ ...formData, usesTeam: true, teamId: String(teamId) });
            }}
          />
        }
        showCancel={false}
        showConfirm={false}
        openModal={openModal}
        handleClose={handleModalClose}
        closable
      />
    </>
  );

  return <FieldTemplate {...props} bottom={bottom} />;
}
