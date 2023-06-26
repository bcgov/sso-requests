import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Button as RequestButton, Tabs, Tab } from '@bcgov-sso/common-react-components';
import Table from 'components/TableNew';
import Button from 'html-components/Button';
import Dropdown from '@button-inc/bcgov-theme/Dropdown';
import CenteredModal, { ButtonStyle } from 'components/CenteredModal';
import TeamMembersForm, { Errors, validateTeam } from 'form-components/team-form/TeamMembersForm';
import { User, Team } from 'interfaces/team';
import { Integration } from 'interfaces/Request';
import { UserSession } from 'interfaces/props';
import { getTeamIntegrations } from 'services/request';
import {
  addTeamMembers,
  getTeamMembers,
  updateTeamMember,
  deleteTeamMember,
  inviteTeamMember,
  getServiceAccount,
  requestServiceAccount,
  deleteServiceAccount,
  getServiceAccounts,
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
import getConfig from 'next/config';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import SubmittedStatusIndicator from 'components/SubmittedStatusIndicator';
import ServiceAccountsList from './ServiceAccountsList';
import isEmpty from 'lodash.isempty';
import { InfoMessage } from '@app/components/MessageBox';
import { Link } from '@button-inc/bcgov-theme';

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

const RightFloat = styled.td`
  float: right;
`;

const PaddedButton = styled(Button)`
  padding: 0 !important;
  margin: 10px 0 !important;
`;

const CenteredTD = styled.td`
  text-align: left !important;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

function RoleHeader() {
  return (
    <span>
      Role&nbsp;
      <InfoOverlay
        title={''}
        content={
          'Admin: can manage integrations <span class="strong">and</span> teams. <br> Members: can <span class="strong">only</span> manage integrations.'
        }
        hide={200}
      />
    </span>
  );
}

function IntegrationActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '1.8em' }}>Actions</span>;
}
function MembersActionsHeader() {
  return <span style={{ float: 'right', paddingRight: '0.4em' }}>Actions</span>;
}

const addMemberModalId = 'add-member-modal';
const deleteMemberModalId = 'delete-member-modal';
const deleteServiceAccountModalId = 'delete-service-account-modal';

export type TabKey = 'members';

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
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [teamServiceAccounts, setTeamServiceAccounts] = useState<Integration[]>([]);
  const [activeServiceAccount, setActiveServiceAccount] = useState<Integration | null>(null);
  const [serviceAccountInProgress, setServiceAccountInProgress] = useState<Integration | null>(null);
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
      setMembers([]);
      setMyself(null);
      setIntegrations([]);
    } else {
      setMembers(members);
      setMyself(members.find((member: { idirEmail: string }) => member.idirEmail === currentUser.email));
      setIntegrations(integrations || []);
    }
    await fetchTeamServiceAccounts(teamId);
    setLoading(false);
  };

  const fetchTeamServiceAccounts = async (teamId: number) => {
    setLoading(true);
    if (team.role === 'admin') {
      const [serviceAccounts, err3] = await getServiceAccounts(teamId);
      if (err3) {
        setTeamServiceAccounts([]);
      } else {
        setTeamServiceAccounts(serviceAccounts);
        setActiveServiceAccount(serviceAccounts && serviceAccounts.length > 0 ? serviceAccounts[0] : null);
      }
    } else {
      setTeamServiceAccounts([]);
      setActiveServiceAccount(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    setServiceAccountInProgress(null);
    getData(team.id);
  }, [team.id]);

  useEffect(() => {
    if (activeServiceAccount && activeServiceAccount.status !== 'applied' && !activeServiceAccount.archived) {
      setServiceAccountInProgress(activeServiceAccount);
    }
  }, [activeServiceAccount]);

  let interval: any;

  useEffect(() => {
    if (serviceAccountInProgress && serviceAccountInProgress.status !== 'applied') {
      clearInterval(interval);
      interval = setInterval(async () => {
        const [data, err] = await getServiceAccount(team.id, serviceAccountInProgress.id);

        if (err) {
          clearInterval(interval);
        } else {
          setServiceAccountInProgress(data);
        }
      }, 1000 * 5);
    } else {
      fetchTeamServiceAccounts(team.id);
      setServiceAccountInProgress(null);
    }
    return () => {
      interval && clearInterval(interval);
    };
  }, [serviceAccountInProgress]);

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
    const [hasError, errors] = validateTeam({ name: team.name, members: tempMembers });
    if (hasError) {
      setErrors(errors);
      return;
    }

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
    <>
      <Tabs defaultActiveKey={'members'} tabBarGutter={30}>
        <Tab key="members" tab="Members">
          <TabWrapper>
            {isAdmin ? (
              <PaddedButton>
                <RequestButton onClick={openModal}>+ Add New Team Members</RequestButton>
              </PaddedButton>
            ) : (
              <br />
            )}
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table
                variant="medium"
                headers={[
                  {
                    accessor: 'status',
                    Header: 'Status',
                    disableSortBy: true,
                  },
                  {
                    accessor: 'idirEmail',
                    Header: 'Email',
                  },
                  {
                    accessor: 'role',
                    Header: <RoleHeader />,
                    disableSortBy: true,
                  },
                  {
                    accessor: 'actions',
                    Header: <MembersActionsHeader />,
                    disableSortBy: true,
                  },
                ]}
                data={members.map((member) => {
                  const adminActionsAllowed = isAdmin && myself.id !== member.id;
                  return {
                    status: <MemberStatusIcon pending={member.pending} invitationSendTime={member.createdAt} />,
                    idirEmail: member.idirEmail,
                    role:
                      adminActionsAllowed && !member.pending ? (
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
                      ),
                    actions: (
                      <RightFloat>
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
                      </RightFloat>
                    ),
                  };
                })}
                colfilters={[]}
                rowSelectorKey={'status'}
                readOnly={true}
              />
            </ReactPlaceholder>
          </TabWrapper>
        </Tab>
        <Tab key="integrations" tab="Integrations">
          <TabWrapper marginTop="20px">
            <ReactPlaceholder type="text" rows={7} ready={!loading} style={{ marginTop: '20px' }}>
              <Table
                variant="medium"
                headers={[
                  {
                    accessor: 'status',
                    Header: 'Status',
                    disableSortBy: true,
                  },
                  {
                    accessor: 'id',
                    Header: 'Request ID',
                  },
                  {
                    accessor: 'projectName',
                    Header: 'Project Name',
                  },
                  {
                    accessor: 'actions',
                    Header: <IntegrationActionsHeader />,
                    disableSortBy: true,
                  },
                ]}
                data={
                  integrations?.length > 0
                    ? integrations?.map((integration) => {
                        return {
                          status: <RequestStatusIcon status={integration?.status} />,
                          id: integration.id,
                          projectName: integration.projectName,
                          actions: (
                            <RightFloat>
                              <ActionButtons
                                request={integration}
                                onDelete={() => {
                                  loadTeams();
                                  getData(team?.id);
                                }}
                              >
                                <ActionButton
                                  icon={faEye}
                                  aria-label="view"
                                  onClick={() => viewProject(integration.id)}
                                  size="lg"
                                />
                              </ActionButtons>
                            </RightFloat>
                          ),
                        };
                      })
                    : []
                }
                readOnly={true}
                colfilters={[]}
                rowSelectorKey={'status'}
                noDataFoundElement={
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
                }
              />
            </ReactPlaceholder>
          </TabWrapper>
        </Tab>
        {isAdmin && (
          <Tab key="service-accounts" tab="CSS API Account">
            <TabWrapper marginTop="10px">
              {loading ? (
                <AlignCenter>
                  <TopMargin />
                  <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
                </AlignCenter>
              ) : (
                <Grid cols={10}>
                  <Grid.Row collapse="1100" gutter={[15, 2]}>
                    <Grid.Col span={4}>
                      {teamServiceAccounts.length > 0 ? (
                        <ServiceAccountsList
                          team={team}
                          selectedServiceAccount={activeServiceAccount}
                          setSelectedServiceAccount={setActiveServiceAccount}
                          teamServiceAccounts={teamServiceAccounts}
                          getTeamServiceAccounts={fetchTeamServiceAccounts}
                        />
                      ) : (
                        <RequestButton
                          style={{ marginBottom: 10 }}
                          onClick={async () => {
                            setLoading(true);
                            const [sa, err] = await requestServiceAccount(team.id);
                            if (err) {
                              setLoading(false);
                              alert.show({
                                variant: 'danger',
                                fadeOut: 10000,
                                closable: true,
                                content: err,
                              });
                            } else {
                              fetchTeamServiceAccounts(team.id);
                            }
                          }}
                        >
                          + Request CSS API Account
                        </RequestButton>
                      )}
                    </Grid.Col>
                    <Grid.Col span={6}>
                      {serviceAccountInProgress && (
                        <Grid cols={10}>
                          <Grid.Row gutter={[]}>
                            <Grid.Col span={10} align={'center'}>
                              {activeServiceAccount?.requester && (
                                <Requester>Submitted by: {activeServiceAccount?.requester}</Requester>
                              )}
                              <SubTitle>CSS API Account will be provisioned in approx 20 min</SubTitle>
                              <SubmittedStatusIndicator integration={serviceAccountInProgress} />
                            </Grid.Col>
                          </Grid.Row>
                        </Grid>
                      )}
                    </Grid.Col>
                  </Grid.Row>
                  {teamServiceAccounts.length > 0 && (
                    <Grid.Row>
                      <InfoMessage>
                        For more information on how to use the CSS API Account with your integrations, see{' '}
                        <Link href="https://github.com/bcgov/sso-keycloak/wiki/CSS-API-Account" external>
                          here
                        </Link>
                        .
                      </InfoMessage>
                    </Grid.Row>
                  )}
                </Grid>
              )}
            </TabWrapper>
          </Tab>
        )}
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
    </>
  );
}

export default withTopAlert(TeamInfoTabs);
