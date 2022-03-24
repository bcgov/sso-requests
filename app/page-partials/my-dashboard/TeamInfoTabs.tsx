import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import Tab from 'react-bootstrap/Tab';
import { RequestTabs } from 'components/RequestTabs';
import Table from 'html-components/Table';
import { Button } from '@bcgov-sso/common-react-components';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import CenteredModal, { ButtonStyle } from 'components/CenteredModal';
import TeamMembersForm from 'form-components/team-form/TeamMembersForm';
import { User, Team } from 'interfaces/team';
import { Request } from 'interfaces/Request';
import { UserSession } from 'interfaces/props';
import { getTeamIntegrations } from 'services/request';
import { addTeamMembers, getTeamMembers, updateTeamMember, deleteTeamMember, inviteTeamMember } from 'services/team';
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
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import { canDeleteMember, capitalize } from 'utils/helpers';
import type { Status } from 'interfaces/types';
import ActionButtons, { ActionButton } from 'components/ActionButtons';
import ModalContents from 'components/WarningModalContents';
import InfoOverlay from 'components/InfoOverlay';

const INVITATION_EXPIRY_DAYS = 2;

const TabWrapper = styled.div<{ marginTop?: string; marginBottom?: string; marginLeft?: string; marginRight?: string }>`
  padding-left: 1rem;
  padding-right: 1rem;
  ${(props) => `
  margin-top: ${props.marginTop || '0'};
  margin-bottom: ${props.marginBottom || '0'};
  margin-left: ${props.marginLeft || '0'};
  margin-right: ${props.marginRight || '0'};
  `}
`;

const PaddedButton = styled(Button)`
  padding: 0 !important;
  margin: 20px 0 !important;
`;

const Container = styled.div`
  border: 3px solid #a6b1c4;
  padding: 10px;
`;

const CenteredTD = styled.td`
  text-align: left !important;
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

const emptyMember: User = { idirEmail: '', role: 'member', pending: true };
interface Props {
  alert: any;
  currentUser: UserSession;
  team: Team;
  loadTeams: () => void;
}

const ConfirmDeleteModal = ({ onConfirmDelete, type }: { onConfirmDelete: () => void; type: string }) => {
  let props: { confirmText: string; buttonStyle: ButtonStyle; onConfirm?: () => void } = {
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

function TeamInfoTabs({ alert, currentUser, team, loadTeams }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Request[]>([]);
  const [myself, setMyself] = useState<User | null>(null);
  const [tempMembers, setTempMembers] = useState<User[]>([emptyMember]);
  const [errors, setErrors] = useState<Errors | null>();
  const [loading, setLoading] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<number>();
  const [modalType, setModalType] = useState('allow');

  const openModal = () => (window.location.hash = addMemberModalId);

  const getData = async (teamId: number) => {
    setLoading(true);
    const [membersRes, integrationRes] = await Promise.all([getTeamMembers(teamId), getTeamIntegrations(teamId)]);
    const [members, err1] = membersRes;
    const [integrations, err2] = integrationRes;

    if (err1 || err2) {
      console.error(err1, err2);
      setMembers([]);
      setMyself(null);
      setIntegrations([]);
    } else {
      setMembers(members);
      setMyself(members.find((member: { idirEmail: string }) => member.idirEmail === currentUser.email));
      setIntegrations(integrations || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    getData(team.id);
  }, [team?.id]);

  const handleDeleteClick = (memberId?: number) => {
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

    const [, err] = await addTeamMembers({ members: tempMembers, id: team.id });
    if (err) {
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content: `Failed to add new members. Please ensure the emails you have entered are valid,
        and reach out to the SSO team if the problem persists`,
      });
    } else {
      await getData(team.id);
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
    if (!deleteMemberId || !team.id) return;
    const [, err] = await deleteTeamMember(Number(deleteMemberId), team.id);
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

  const viewProject = (integrationId?: number) => {
    router.push({ pathname: '/my-dashboard/integrations', query: { integr: integrationId } });
  };

  const inviteMember = async (member: User) => {
    if (!team.id) return;
    const [, err] = await inviteTeamMember(member, team.id);
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

  const handleMemberRoleChange = async (memberId: number, role: string) => {
    const [data, err] = await updateTeamMember(team.id as number, memberId, { role });
    if (err) {
      console.error(err);
      return;
    }

    const newMembers = members.map((member: User) => {
      if (member.id === memberId) return data;
      return member;
    });

    setMembers(newMembers);

    alert.show({
      variant: 'success',
      fadeOut: 10000,
      closable: true,
      content: `Member role updated successfully`,
    });
  };

  if (!team || !myself) return null;

  const isAdmin = myself.role === 'admin';

  return (
    <Container>
      <RequestTabs defaultActiveKey={'members'}>
        <Tab eventKey="members" title="Members">
          <TabWrapper>
            {isAdmin ? (
              <PaddedButton variant="plainText" onClick={openModal}>
                + Add new team members
              </PaddedButton>
            ) : (
              <br />
            )}
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table variant="medium" readOnly>
                <thead>
                  <tr>
                    <th className="w60">Status</th>
                    <th>Email</th>
                    <th className="w120">
                      Role&nbsp;
                      <InfoOverlay
                        tooltipTitle={''}
                        tooltipContent={
                          'Admin: can manage integrations <span class="strong">and</span> teams. <br> Members: can <span class="strong">only</span> manage integrations.'
                        }
                        hide={200}
                      />
                    </th>
                    <th className="w120">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const adminActionsAllowed = isAdmin && myself.id !== member.id;
                    return (
                      <tr key={member.id}>
                        <td className="w60">
                          <MemberStatusIcon pending={member.pending} invitationSendTime={member.createdAt} />
                        </td>
                        <td>{member.idirEmail}</td>
                        <td className="w120">
                          {adminActionsAllowed && !member.pending ? (
                            <Dropdown
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                handleMemberRoleChange(member.id as number, event.target.value)
                              }
                              value={member.role}
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </Dropdown>
                          ) : (
                            capitalize(member.role)
                          )}
                        </td>
                        <td className="w120">
                          {adminActionsAllowed && member.pending && (
                            <ButtonIcon
                              icon={faShare}
                              size="lg"
                              onClick={() => inviteMember(member)}
                              title="Resend Invitation"
                            />
                          )}
                          {adminActionsAllowed && (
                            <ButtonIcon
                              icon={faTrash}
                              onClick={() => handleDeleteClick(member.id)}
                              size="lg"
                              title="Delete User"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </ReactPlaceholder>
          </TabWrapper>
        </Tab>
        <Tab eventKey="integrations" title="Integrations">
          <TabWrapper marginTop="20px">
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table variant="medium" readOnly>
                <thead>
                  <tr>
                    <th className="w60">Status</th>
                    <th>Request ID</th>
                    <th>Project Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations?.length > 0 ? (
                    integrations?.map((integration) => (
                      <tr key={integration.id}>
                        <td className="w60">
                          <RequestStatusIcon status={integration?.status} />
                        </td>
                        <td>{integration.id}</td>
                        <td>{integration.projectName}</td>
                        <td>
                          <ActionButtons
                            request={integration}
                            onDelete={() => {
                              loadTeams();
                              getData(team?.id);
                            }}
                          >
                            <ActionButton icon={faEye} onClick={() => viewProject(integration.id)} size="lg" />
                          </ActionButtons>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <CenteredTD colSpan={5}>
                        <br />
                        There are no integrations for this team yet.
                        <br />
                        <br />
                        To add this team to an <span className="strong">existing integration</span>:
                        <span className="line-height-200"></span>
                        <ol>
                          <li>
                            Go to your{' '}
                            <span className="text-blue">
                              <span className="strong">Projects</span>
                            </span>{' '}
                            tab
                          </li>
                          <li>Select the "pencil" icon to edit the integration</li>
                          <li>Select this team from the "Project Team" drop down</li>
                        </ol>
                        <br />
                        To add this team to a <span className="strong">new integration</span>:
                        <span className="line-height-200"></span>
                        <ol>
                          <li>
                            Go to your{' '}
                            <span className="text-blue">
                              <span className="strong">Projects</span>
                            </span>{' '}
                            tab
                          </li>
                          <li>Select "+ Request SSO Integration"</li>
                          <li>Select "Yes" to allow multiple team members to manage the integration</li>
                          <li>Select this team from the "Project Team" drop down</li>
                        </ol>
                      </CenteredTD>
                    </tr>
                  )}
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
