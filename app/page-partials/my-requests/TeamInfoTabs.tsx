import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { RequestTabs } from 'components/RequestTabs';
import Table from 'html-components/Table';
import { RequestsContext } from 'pages/my-requests';
import { Button } from '@bcgov-sso/common-react-components';
import CenteredModal from 'components/CenteredModal';
import TeamMembersForm from 'form-components/team-form/TeamMembersForm';
import { User } from 'interfaces/team';
import { useState, useEffect, useContext } from 'react';
import { addTeamMembers, getTeamMembers, deleteTeamMember } from 'services/team';
import { withTopAlert } from 'layout/TopAlert';
import ReactPlaceholder from 'react-placeholder';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

const UnpaddedButton = styled(Button)`
  &&& {
    padding: 0;
    margin: 0;
  }
`;

const addMemberModalId = 'add-member-modal';
const deleteMemberModalId = 'delete-member-modal';

export type TabKey = 'members';

interface Errors {
  members: string[];
}

const validateMembers = (members: User[], setErrors: Function) => {
  let errors: Errors = { members: [] };
  members.forEach((member, i) => {
    if (!member.idirEmail) errors.members[i] = 'Please enter an email';
  });
  if (errors.members.length === 0) {
    setErrors(null);
    return null;
  } else {
    setErrors(errors);
    return errors;
  }
};

const emptyMember: User = { idirEmail: '', role: 'user', pending: true };

interface Props {
  alert: any;
}

const RedIcon = styled(FontAwesomeIcon)`
  color: #ff0303;
`;

const ModalContentContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 6fr;
`;

const ModalContents = (
  <ModalContentContainer>
    <RedIcon icon={faExclamationCircle} size="3x" />
    <div>
      <strong>Are you sure that you want to delete this team member?</strong>
      <p>Once they are deleted, they will no longer have access to the team's integrations.</p>
    </div>
  </ModalContentContainer>
);

function TeamInfoTabs({ alert }: Props) {
  const { state } = useContext(RequestsContext);
  const { teams, activeTeamId } = state;
  const selectedTeam = teams?.find((team) => team.id === activeTeamId);
  const [members, setMembers] = useState<User[]>([]);
  const [tempMembers, setTempMembers] = useState<User[]>([emptyMember]);
  const [errors, setErrors] = useState<Errors | null>();
  const [loading, setLoading] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<string>();

  const openModal = () => (window.location.hash = addMemberModalId);

  const getMembers = async (id?: number) => {
    setLoading(true);
    const result = await getTeamMembers(id);
    const [members, err] = result;
    if (err) {
      console.error(err);
    } else {
      setMembers(members);
    }
    setLoading(false);
  };

  useEffect(() => {
    getMembers(activeTeamId);
  }, [activeTeamId]);

  const handleDeleteClick = (memberId?: string) => {
    if (!memberId) return;
    setDeleteMemberId(memberId);
    window.location.hash = deleteMemberModalId;
  };

  const onConfirmAdd = async () => {
    const errors = validateMembers(tempMembers, setErrors);
    if (errors) return;
    const [result, err] = await addTeamMembers({ members: tempMembers, id: activeTeamId });
    if (err) {
      console.log(err);
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content: `Failed to add new members. Please ensure the emails you have entered are valid,
        and reach out to the SSO team if the problem persists`,
      });
    } else {
      await getMembers(activeTeamId);
      setTempMembers([emptyMember]);
      window.location.hash = '';
      alert.show({
        variant: 'success',
        fadeOut: 10000,
        closable: true,
        content: `Invited new members to your team!`,
      });
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteMemberId || !activeTeamId) return;
    const [, err] = await deleteTeamMember(Number(deleteMemberId), activeTeamId);
    if (err) {
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content: `Failed to delete team member.`,
      });
    } else {
      setMembers(members.filter((member) => member.id !== deleteMemberId));
      const memberEmail = members.find((member) => member.id === deleteMemberId)?.idirEmail;
      alert.show({
        variant: 'success',
        fadeOut: 10000,
        closable: true,
        content: `${memberEmail} has successfully been deleted.`,
      });
    }
  };

  if (!selectedTeam) return null;

  return (
    <>
      <RequestTabs activeKey={'members'}>
        <Tab eventKey="members" title="Members">
          <TabWrapper>
            <br />
            <UnpaddedButton variant="plainText" onClick={openModal}>
              + Add new team members
            </UnpaddedButton>
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>{member.idirEmail}</td>
                      <td>{member.role}</td>
                      <td>{member.pending ? 'pending' : 'active'}</td>
                      <td>
                        <FontAwesomeIcon icon={faTrash} onClick={() => handleDeleteClick(member.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ReactPlaceholder>
          </TabWrapper>
        </Tab>
      </RequestTabs>
      <CenteredModal
        title="Add a New Team Member"
        icon={null}
        id={addMemberModalId}
        content={
          <TeamMembersForm members={tempMembers} setMembers={setTempMembers} allowDelete={false} errors={errors} />
        }
        onConfirm={onConfirmAdd}
        skipCloseOnConfirm={true}
        buttonStyle="custom"
        closable
      />
      <CenteredModal
        title="Delete Team Member"
        icon={null}
        onConfirm={onConfirmDelete}
        id={deleteMemberModalId}
        content={ModalContents}
        buttonStyle="danger"
        confirmText="Delete"
        closable
      />
    </>
  );
}

export default withTopAlert(TeamInfoTabs);
