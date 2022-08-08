import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Table } from '@bcgov-sso/common-react-components';
import { Button as RequestButton, Tabs, Tab } from '@bcgov-sso/common-react-components';
import Button from 'html-components/Button';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import CenteredModal, { ButtonStyle } from 'components/CenteredModal';
import TeamMembersForm from 'form-components/team-form/TeamMembersForm';
import { User, Team } from 'interfaces/team';
import { Request } from 'interfaces/Request';
import { UserSession } from 'interfaces/props';
import { getTeamIntegrations } from 'services/request';
import validator from 'validator';
import {
  addTeamMembers,
  getTeamMembers,
  updateTeamMember,
  deleteTeamMember,
  inviteTeamMember,
  getServiceAccount,
  requestServiceAccount,
  downloadServiceAccount,
  deleteServiceAccount,
} from 'services/team';
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
import InfoMessage from 'components/InfoMessage';
import Link from '@button-inc/bcgov-theme/Link';
import { prettyJSON, copyTextToClipboard, downloadText } from 'utils/text';
import getConfig from 'next/config';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
const { publicRuntimeConfig = {} } = getConfig() || {};
const { enable_gold } = publicRuntimeConfig;

const INVITATION_EXPIRY_DAYS = 2;

const TabWrapper = styled.div<{ marginTop?: string; marginBottom?: string; marginLeft?: string; marginRight?: string }>`
  padding-left: 1rem;
  ${(props) => `
  margin-top: ${props.marginTop || '0'};
  margin-bottom: ${props.marginBottom || '0'};
  margin-left: ${props.marginLeft || '0'};
  margin-right: ${props.marginRight || '0'};
  `}
`;

const RightPaddedHeader = styled.th`
  float: right;
  margin-right: 30px;
`;

const RightFloat = styled.td`
  float: right;
`;

const PaddedButton = styled(Button)`
  padding: 0 !important;
  margin: 20px 0 !important;
`;

const DeleteButton = styled(Button)`
  background-color: red;
  &:hover {
    background-color: red;
    opacity: 0.7;
  }
`;

const CenteredTD = styled.td`
  text-align: left !important;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const addMemberModalId = 'add-member-modal';
const deleteMemberModalId = 'delete-member-modal';
const deleteServiceAccountModalId = 'delete-service-account-modal';

export type TabKey = 'members';

interface Errors {
  members: string[];
}

const validateMembers = (members: User[], setErrors: Function) => {
  let errors: Errors = { members: [] };

  members.forEach((member, i) => {
    if (!member.idirEmail || !validator.isEmail(member.idirEmail)) errors.members[i] = 'Please enter an email';
    else if (!member.idirEmail.endsWith('@gov.bc.ca')) errors.members[i] = 'Please enter a government email address';
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

const Requester = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  margin-bottom: 1rem;
`;

const SubTitle = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #000;
  border-bottom: 1px solid gray;
`;

const AlignCenter = styled.div`
  text-align: center;
`;

function TeamInfoTabs({ alert, currentUser, team, loadTeams }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Request[]>([]);
  const [serviceAccount, setServiceAccount] = useState<Request | null>(null);
  const [myself, setMyself] = useState<User | null>(null);
  const [tempMembers, setTempMembers] = useState<User[]>([emptyMember]);
  const [errors, setErrors] = useState<Errors | null>();
  const [loading, setLoading] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<number>();
  const [modalType, setModalType] = useState('allow');
  const canDeleteServiceAccount = integrations.length === 0;
  const openModal = () => (window.location.hash = addMemberModalId);
  const inProgressServiceAccount = serviceAccount?.status !== 'applied' && !serviceAccount?.archived;
  const showDeleteServiceAccountModal = () => (window.location.hash = deleteServiceAccountModalId);

  const handleDeleteSeviceAccount = async () => {
    if (!canDeleteServiceAccount) return;
    await deleteServiceAccount(team.id, serviceAccount?.id);
    setServiceAccount(null);
  };

  const getData = async (teamId: number) => {
    setLoading(true);
    const [membersRes, integrationRes, serviceAccountRes] = await Promise.all([
      getTeamMembers(teamId),
      getTeamIntegrations(teamId),
      getServiceAccount(teamId),
    ]);
    const [members, err1] = membersRes;
    const [integrations, err2] = integrationRes;
    const [serviceAccount, err3] = serviceAccountRes;

    if (err1 || err2 || err3) {
      setMembers([]);
      setMyself(null);
      setIntegrations([]);
      setServiceAccount(null);
    } else {
      setMembers(members);
      setMyself(members.find((member: { idirEmail: string }) => member.idirEmail === currentUser.email));
      setIntegrations(integrations || []);
      setServiceAccount(serviceAccount);
    }
    setLoading(false);
  };

  useEffect(() => {
    getData(team.id);
  }, [team?.id]);

  let interval: any;

  useEffect(() => {
    if (serviceAccount && serviceAccount.status !== 'applied') {
      clearInterval(interval);

      interval = setInterval(async () => {
        const [data, err] = await getServiceAccount(team.id);

        if (err) {
          clearInterval(interval);
        } else {
          setServiceAccount(data);
        }
      }, 1000 * 5);
    }

    return () => {
      interval && clearInterval(interval);
    };
  }, [serviceAccount]);

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

  const fetchApiAccountCredentials = async (team: Team, serviceAccount: Request, download: boolean) => {
    setLoading(true);
    let [data] = await downloadServiceAccount(team.id, serviceAccount.id);
    data = data || {};

    const text = {
      tokenUrl: `${data['auth-server-url']}/realms/${data.realm}/protocol/openid-connect/token`,
      clientId: `${data.resource}`,
      clientSecret: `${data.credentials?.secret}`,
    };

    if (download) {
      downloadText(prettyJSON(text), `${serviceAccount.clientId}.json`);
    } else {
      copyTextToClipboard(prettyJSON(text));
    }
    setLoading(false);
  };

  return (
    <>
      <Tabs defaultActiveKey={isAdmin && enable_gold ? 'service-accounts' : 'members'} tabBarGutter={30}>
        {enable_gold && isAdmin && (
          <Tab key="service-accounts" tab="CSS API Account">
            <TabWrapper marginTop="20px">
              {serviceAccount ? (
                inProgressServiceAccount ? (
                  <Grid cols={15}>
                    <Grid.Row gutter={[]}>
                      <Grid.Col span={7} align={'center'}>
                        {serviceAccount.requester && <Requester>Submitted by: {serviceAccount.requester}</Requester>}
                        <SubTitle>CSS API Account will be provisioned in approx 20 min</SubTitle>
                        <SubmittedStatusIndicator integration={serviceAccount} />
                      </Grid.Col>
                    </Grid.Row>
                  </Grid>
                ) : loading ? (
                  <AlignCenter>
                    <TopMargin />
                    <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
                  </AlignCenter>
                ) : (
                  <Grid cols={3}>
                    <Grid.Row collapse="992" gutter={[]} align="center">
                      Download the files to get access to the CSS App API
                    </Grid.Row>
                    <br />
                    <Grid.Row collapse="992" gutter={[]} align="center">
                      <Grid.Col span={3}>
                        <Button
                          size="medium"
                          variant="grey"
                          onClick={() => fetchApiAccountCredentials(team, serviceAccount, false)}
                        >
                          Copy
                        </Button>
                        &nbsp;&nbsp;&nbsp;
                        <Button
                          size="medium"
                          variant="grey"
                          onClick={() => fetchApiAccountCredentials(team, serviceAccount, true)}
                        >
                          Download
                        </Button>
                        &nbsp;&nbsp;&nbsp;
                        {canDeleteServiceAccount && (
                          <DeleteButton size="medium" variant="grey" onClick={showDeleteServiceAccountModal}>
                            Delete
                          </DeleteButton>
                        )}
                      </Grid.Col>
                    </Grid.Row>
                    <br />
                    <Grid.Row collapse="992" gutter={[]} align="center">
                      <InfoMessage>
                        For more information on how to use the CSS API Account with your integrations, see{' '}
                        <Link href="https://github.com/bcgov/sso-keycloak/wiki/CSS-API-Account" external>
                          here
                        </Link>
                        .
                      </InfoMessage>
                    </Grid.Row>
                  </Grid>
                )
              ) : (
                <RequestButton
                  onClick={async () => {
                    const [sa, err] = await requestServiceAccount(team.id);
                    if (err) {
                      alert.show({
                        variant: 'danger',
                        fadeOut: 10000,
                        closable: true,
                        content: err,
                      });
                    } else {
                      setServiceAccount(sa);
                    }
                  }}
                >
                  + Request CSS API Account
                </RequestButton>
              )}
            </TabWrapper>
          </Tab>
        )}
        <Tab key="members" tab="Members">
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
                    <th>Status</th>
                    <th>Email</th>
                    <th>
                      Role&nbsp;
                      <InfoOverlay
                        title={''}
                        content={
                          'Admin: can manage integrations <span class="strong">and</span> teams. <br> Members: can <span class="strong">only</span> manage integrations.'
                        }
                        hide={200}
                      />
                    </th>
                    <th>
                      <RightFloat>Actions</RightFloat>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const adminActionsAllowed = isAdmin && myself.id !== member.id;
                    return (
                      <tr key={member.id}>
                        <td>
                          <MemberStatusIcon pending={member.pending} invitationSendTime={member.createdAt} />
                        </td>
                        <td>{member.idirEmail}</td>
                        <td>
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
                        <td style={{ textAlign: 'right' }}>
                          {adminActionsAllowed && member.pending && (
                            <ButtonIcon
                              icon={faShare}
                              size="lg"
                              onClick={() => inviteMember(member)}
                              title="Resend Invitation"
                              style={{ marginRight: '6px' }}
                            />
                          )}
                          {adminActionsAllowed && (
                            <ButtonIcon
                              icon={faTrash}
                              onClick={() => handleDeleteClick(member.id)}
                              size="lg"
                              title="Delete User"
                              style={{ marginRight: '16px' }}
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
        <Tab key="integrations" tab="Integrations">
          <TabWrapper marginTop="20px">
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table variant="medium" readOnly>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Request ID</th>
                    <th>Project Name</th>
                    <th>
                      <RightPaddedHeader>Actions</RightPaddedHeader>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {integrations?.length > 0 ? (
                    integrations?.map((integration) => (
                      <tr key={integration.id}>
                        <td>
                          <RequestStatusIcon status={integration?.status} />
                        </td>
                        <td>{integration.id}</td>
                        <td>{integration.projectName}</td>
                        <td>
                          <RightFloat>
                            <ActionButtons
                              request={integration}
                              onDelete={() => {
                                loadTeams();
                                getData(team?.id);
                              }}
                            >
                              <ActionButton icon={faEye} onClick={() => viewProject(integration.id)} size="lg" />
                            </ActionButtons>
                          </RightFloat>
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
                          <li>Select the &ldquo;pencil&rdquo; icon to edit the integration</li>
                          <li>Select this team from the &ldquo;Project Team&rdquo; drop down</li>
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
                          <li>Select &ldquo;+ Request SSO Integration&rdquo;</li>
                          <li>Select &ldquo;Yes&rdquo; to allow multiple team members to manage the integration</li>
                          <li>Select this team from the &ldquo;Project Team&rdquo; drop down</li>
                        </ol>
                      </CenteredTD>
                    </tr>
                  )}
                </tbody>
              </Table>
            </ReactPlaceholder>
          </TabWrapper>
        </Tab>
      </Tabs>
      <CenteredModal
        title="Add a New Team Member"
        icon={null}
        id={addMemberModalId}
        content={
          <TeamMembersForm
            members={tempMembers}
            setMembers={setTempMembers}
            allowDelete={isAdmin}
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
      <CenteredModal
        title="Delete CSS API Account"
        icon={null}
        onConfirm={handleDeleteSeviceAccount}
        id={deleteServiceAccountModalId}
        content={
          <ModalContents
            title="Are you sure that you want to delete this CSS API Account?"
            content={'Once you delete this CSS PI Account, this action cannot be undone.'}
          />
        }
        buttonStyle={'danger'}
        confirmText={'Delete CSS API Account'}
        closable
      />
    </>
  );
}

export default withTopAlert(TeamInfoTabs);
