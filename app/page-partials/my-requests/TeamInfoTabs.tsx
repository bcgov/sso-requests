import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { RequestTabs } from 'components/RequestTabs';
import Table from 'html-components/Table';
import { RequestsContext } from 'pages/my-requests';
import { Button } from '@bcgov-sso/common-react-components';
import CenteredModal, { ButtonStyle } from 'components/CenteredModal';
import TeamMembersForm from 'form-components/team-form/TeamMembersForm';
import { User } from 'interfaces/team';
import { UserSession } from 'interfaces/props';
import { useState, useEffect, useContext } from 'react';
import { addTeamMembers, getTeamMembers, deleteTeamMember, inviteTeamMember } from 'services/team';
import { withTopAlert } from 'layout/TopAlert';
import ReactPlaceholder from 'react-placeholder';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faExclamationCircle,
  faEdit,
  faClock,
  faTimesCircle,
  faCheckCircle,
  faShare,
} from '@fortawesome/free-solid-svg-icons';
import { canDeleteMember, capitalize } from 'utils/helpers';
import type { Status } from 'interfaces/types';
import ActionButtons from 'components/ActionButtons';

const INVITATION_EXPIRY_DAYS = 2;

const TabWrapper = styled.div`
  padding-left: 1rem;
  padding-right: 1rem;
`;

const PaddedButton = styled(Button)`
  &&& {
    padding: 0;
    margin: 20px 0;
  }
`;

const Container = styled.div`
  border: 3px solid #a6b1c4;
  padding: 10px;
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
  currentUser: UserSession;
}

const RedIcon = styled(FontAwesomeIcon)`
  color: #ff0303;
`;

const ModalContentContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 6fr;
`;

const ModalContents = ({ title, content }: { title?: string; content?: string }) => (
  <ModalContentContainer>
    <RedIcon icon={faExclamationCircle} size="3x" />
    <div>
      {title && <strong>{title}</strong>}
      {content && <p>{content}</p>}
    </div>
  </ModalContentContainer>
);

const ConfirmDeleteModal = ({ onConfirmDelete, type }: { onConfirmDelete: Function; type: string }) => {
  let props: { confirmText: string; buttonStyle: ButtonStyle; onConfirm?: Function } = {
    confirmText: 'Delete',
    buttonStyle: 'danger',
  };
  let content = '';
  let title = '';
  switch (type) {
    case 'allow':
      content = "Once they are deleted, they will no longer have access to the team's integrations.";
      title = 'Are you sure that you want to delete this team member?';
      props.onConfirm = onConfirmDelete;
      break;
    case 'notAllowed':
      content = 'Before you delete the last team admin, you must assign a new admin.';
      props.confirmText = 'Okay';
      props.buttonStyle = 'custom';
  }
  return (
    <CenteredModal
      title="Delete Team Member"
      icon={null}
      id={deleteMemberModalId}
      content={<ModalContents content={content} title={title} />}
      closable
      {...props}
    />
  );
};

const ButtonIcon = styled(FontAwesomeIcon)`
  margin-right: 10px;
  &:hover {
    cursor: pointer;
  }
`;

const RequestStatusIcon = ({ status }: { status?: Status }) => {
  if (!status) return null;
  let icon = faExclamationCircle;
  let color = 'black';
  const errorStatuses: Status[] = ['prFailed', 'applyFailed', 'planFailed'];
  if (status === 'draft') {
    icon = faEdit;
    color = '#1a5a96';
  } else if (status === 'submitted') {
    icon = faClock;
    color = '#fcba19';
  } else if (errorStatuses.includes(status)) {
    icon = faTimesCircle;
    color = '#ff0303';
  } else if (status === 'applied') {
    color = '#2e8540';
    icon = faCheckCircle;
  }
  return <FontAwesomeIcon icon={icon} title={status} style={{ color }} />;
};

const MemberStatusIcon = ({ pending, invitationSendTime }: { pending?: boolean; invitationSendTime?: string }) => {
  if (!invitationSendTime) return null;
  const invitationAgeMilliseconds = new Date().getTime() - new Date(invitationSendTime).getTime();
  const invitationAgeDays = invitationAgeMilliseconds / (60 * 60 * 24 * 1000);
  let icon;
  let color;
  let title;
  if (pending && invitationAgeDays > INVITATION_EXPIRY_DAYS) {
    icon = faExclamationCircle;
    color = '#ff0303';
    title = 'Invitation Expired';
  } else if (pending) {
    icon = faClock;
    color = '#fcba19';
    title = 'Invitation Sent';
  } else {
    color = '#2e8540';
    icon = faCheckCircle;
    title = 'Active Member';
  }
  return <FontAwesomeIcon icon={icon} title={title} style={{ color }} />;
};

function TeamInfoTabs({ alert, currentUser }: Props) {
  const { state } = useContext(RequestsContext);
  const { teams, activeTeamId, requests } = state;
  const [members, setMembers] = useState<User[]>([]);
  const [tempMembers, setTempMembers] = useState<User[]>([emptyMember]);
  const [errors, setErrors] = useState<Errors | null>();
  const [loading, setLoading] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<string>();
  const [modalType, setModalType] = useState('allow');

  const selectedTeam = teams?.find((team) => team.id === activeTeamId);
  const teamRequests = requests?.filter((request) => Number(request.teamId) === activeTeamId);

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
    const canDelete = canDeleteMember(members, memberId);
    if (!canDelete) {
      setModalType('notAllowed');
    } else {
      setModalType('allow');
    }
    setDeleteMemberId(memberId);
    window.location.hash = deleteMemberModalId;
  };

  const onConfirmAdd = async () => {
    const errors = validateMembers(tempMembers, setErrors);
    if (errors) return;
    const [, err] = await addTeamMembers({ members: tempMembers, id: activeTeamId });
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

  const inviteMember = async (member: User) => {
    if (!activeTeamId) return;
    const [, err] = await inviteTeamMember(member, activeTeamId);
    if (err) {
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content: `Failed to resend invitation.`,
      });
    } else {
      alert.show({
        variant: 'success',
        fadeOut: 10000,
        closable: true,
        content: `Sent new invitation for team member ${member.idirEmail}`,
      });
    }
  };

  if (!selectedTeam) return null;

  return (
    <Container>
      <RequestTabs defaultActiveKey={'members'}>
        <Tab eventKey="members" title="Members">
          <TabWrapper>
            <PaddedButton variant="plainText" onClick={openModal}>
              + Add new team members
            </PaddedButton>
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table variant="mini" readOnly>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <MemberStatusIcon pending={member.pending} invitationSendTime={member.createdAt} />
                      </td>
                      <td>{member.idirEmail}</td>
                      <td>{capitalize(member.role)}</td>
                      <td>
                        {member.pending && (
                          <ButtonIcon
                            icon={faShare}
                            size="lg"
                            title="Resend Invitation"
                            onClick={() => inviteMember(member)}
                          />
                        )}
                        <ButtonIcon
                          icon={faTrash}
                          onClick={() => handleDeleteClick(member.id)}
                          size="lg"
                          title="Delete User"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ReactPlaceholder>
          </TabWrapper>
        </Tab>
        <Tab eventKey="integrations" title="Integrations">
          <TabWrapper>
            <Table variant="mini" readOnly>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Request ID</th>
                  <th>Project Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamRequests?.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <RequestStatusIcon status={request?.status} />
                    </td>
                    <td>{request.id}</td>
                    <td>{request.projectName}</td>
                    <td>
                      <ActionButtons request={request} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TabWrapper>
        </Tab>
      </RequestTabs>
      <CenteredModal
        title="Add a New Team Member"
        icon={null}
        id={addMemberModalId}
        content={
          <TeamMembersForm
            members={tempMembers}
            setMembers={setTempMembers}
            allowDelete={false}
            errors={errors}
            currentUser={currentUser}
          />
        }
        onConfirm={onConfirmAdd}
        skipCloseOnConfirm={true}
        buttonStyle="custom"
        closable
      />
      <ConfirmDeleteModal onConfirmDelete={onConfirmDelete} type={modalType} />
    </Container>
  );
}

export default withTopAlert(TeamInfoTabs);
