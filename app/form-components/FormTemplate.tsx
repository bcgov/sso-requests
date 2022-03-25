import React, { useState, useEffect, useCallback } from 'react';
import FormHeader from 'form-components/FormHeader';
import FormStage from 'form-components/FormStage';
import Form from 'form-components/GovForm';
import { getUISchema } from 'schemas-ui';
import FormButtons from 'form-components/FormButtons';
import { Request } from 'interfaces/Request';
import CenteredModal from 'components/CenteredModal';
import { createRequest, updateRequest } from 'services/request';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import FormReview from 'form-components/FormReview';
import TermsAndConditions from 'components/TermsAndConditions';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { isNil, throttle } from 'lodash';
import { validateForm, customValidate } from 'utils/validate';
import { getFormStageInfo } from 'utils/helpers';
import { stageTitlesUsingForms, stageTitlesReviewing, createTeamModalId } from 'utils/constants';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { getMyTeams, getAllowedTeams } from 'services/team';
import { SaveMessage } from 'interfaces/form';
import { Team, LoggedInUser } from 'interfaces/team';
import Link from '@button-inc/bcgov-theme/Link';
import CreateTeamForm from 'form-components/team-form/CreateTeamForm';
import CancelConfirmModal from 'page-partials/edit-request/CancelConfirmModal';
import getConfig from 'next/config';
const { publicRuntimeConfig = {} } = getConfig() || {};
const { enable_gold } = publicRuntimeConfig;

const Description = styled.p`
  margin: 0;
`;

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 150px;
`;

const ErrorText = styled.p`
  color: #d94532;
  font-weight: bold;
`;

interface Props {
  currentUser: LoggedInUser;
  request?: Request | undefined;
  alert: TopAlert;
}

function FormTemplate({ currentUser, request, alert }: Props) {
  const router = useRouter();
  const { step } = router.query;
  const stage = step ? Number(step) : 0;

  const [formData, setFormData] = useState((request || {}) as Request);
  const [formStage, setFormStage] = useState(stage);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessage | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [visited, setVisited] = useState<any>(request ? { '0': true } : {});
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAccountableError, setShowAccountableError] = useState(false);
  const [schemas, setSchemas] = useState<any>();
  const [schema, setSchema] = useState<any>();
  const [stageTitle, setStageTitle] = useState<any>();
  const [stages, setStages] = useState<any>();
  const isNew = isNil(request?.id);
  const isApplied = request?.status === 'applied';
  const isAdmin = currentUser.isAdmin || false;

  const showFormButtons = formStage !== 0 || formData.usesTeam || formData.projectLead;

  const throttleUpdate = useCallback(
    throttle(
      async (event: any) => {
        if (isNew || isApplied) return;
        if (request) {
          setSaving(true);
          const [, err] = await updateRequest({ ...event.formData, id: request.id });
          if (!err) setSaveMessage({ content: `Last saved at ${new Date().toLocaleString()}`, error: false });
          setSaving(false);
        }
      },
      2000,
      { trailing: true },
    ),
    [request?.id],
  );

  const handleChange = (e: any) => {
    const showModal = e.formData.projectLead === false && e.formData.usesTeam === false;
    const togglingTeamToTrue = formData.usesTeam === false && e.formData.usesTeam === true;
    if (togglingTeamToTrue) {
      setFormData({ ...e.formData, projectLead: undefined });
    } else {
      setFormData(e.formData);
    }
    if (showModal) {
      window.location.hash = 'info-modal';
      setShowAccountableError(true);
    } else {
      setShowAccountableError(false);
    }

    throttleUpdate(e);
  };

  const loadTeams = async () => {
    const getTeams = isNew ? getMyTeams : getAllowedTeams;
    const [teams, err] = await getTeams();
    if (err) {
      // add err handling
      console.error(err);
    } else {
      setTeams(teams || []);
    }
  };

  const updateInfo = () => {
    const { stages, stageTitle, schema, schemas } = getFormStageInfo({
      integration: request,
      formData,
      formStage,
      teams,
    });

    setStages(stages);
    setStageTitle(stageTitle);
    setSchema(schema);
    setSchemas(schemas);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    updateInfo();
  }, [formData, formStage, teams]);

  const changeStep = (newStage: number) => {
    visited[formStage] = true;

    if (newStage === stages.length - 1) {
      for (let x = 0; x < stages.length; x++) visited[x] = true;
    }

    const formErrors = validateForm(formData, schemas, visited);
    setErrors(formErrors);
    setFormStage(newStage);
    setVisited(visited);
    alert.hide();
  };

  const handleBackClick = () => {
    const redirectUrl = isAdmin ? '/admin-dashboard' : '/my-dashboard';
    router.push({ pathname: redirectUrl });
  };

  const uiSchema = getUISchema(request as Request);

  const handleFormSubmit = async () => {
    setLoading(true);

    try {
      if (isNew) {
        formData.serviceType = enable_gold ? 'gold' : 'silver';
        formData.environments = ['dev'];
        const [data, err] = await createRequest(formData);
        const { id } = data || {};

        if (err) {
          alert.show({
            variant: 'danger',
            fadeOut: 5000,
            closable: true,
            content: err,
          });
        }

        if (err || !id) {
          setLoading(false);
          return;
        }

        let redirectUrl = '';
        let query: any = {};

        if (isAdmin && isApplied) {
          redirectUrl = '/admin-dashboard';
        } else {
          redirectUrl = `/request/${id}`;
          query.step = 1;
        }

        await router.push({ pathname: redirectUrl, query });
        setFormData({ ...formData, id });
      } else {
        await updateRequest(formData);
        handleButtonSubmit();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleButtonSubmit = async () => {
    if (formStage === 0) {
      if (isNew) {
        visited[formStage] = true;
        setVisited(visited);
        return;
      }
    }

    const newStage = formStage + 1;
    changeStep(newStage);
  };

  const handleTeamCreate = async (teamId: number) => {
    await loadTeams();
    setFormData({ ...formData, usesTeam: true, teamId: String(teamId) });
  };

  const handleModalClose = () => {
    window.location.hash = '#';
  };

  const backButton = isApplied ? <CancelConfirmModal onConfirm={handleBackClick} /> : null;
  const backButtonText = isApplied ? 'Cancel' : 'Save and Close';

  if (!schemas) return null;

  return (
    <>
      <HeaderContainer>
        <FormHeader formStage={formStage} stages={stages} requestId={formData.id} editing={isApplied} />
        <FormStage
          currentStage={formStage}
          setFormStage={changeStep}
          errors={errors}
          isNew={isNew}
          visited={visited}
          stages={stages}
        />
        <Description>
          If new to SSO, please visit{' '}
          <Link external href="https://github.com/bcgov/sso-keycloak/wiki/Using-Your-SSO-Client">
            github
          </Link>{' '}
          for more information.
        </Description>
      </HeaderContainer>
      {stageTitle === 'Terms and conditions' && <TermsAndConditions />}
      {stageTitlesReviewing.includes(stageTitle) && (
        <FormReview
          formData={formData}
          setFormData={setFormData}
          setErrors={setErrors}
          isAdmin={isAdmin}
          teams={teams}
        />
      )}
      {stageTitlesUsingForms.includes(stageTitle) && (
        <Form
          schema={schema}
          uiSchema={uiSchema}
          onChange={handleChange}
          onSubmit={handleFormSubmit}
          formData={formData}
          formContext={{ isAdmin, teams }}
          ArrayFieldTemplate={ArrayFieldTemplate}
          liveValidate={visited[formStage] || isApplied}
          validate={customValidate}
        >
          {showFormButtons ? (
            <FormButtons
              formSubmission={formStage === 0}
              backButton={backButton}
              text={{ continue: 'Next', back: backButtonText }}
              loading={loading}
              handleSubmit={handleButtonSubmit}
              handleBackClick={handleBackClick}
              saving={saving}
              saveMessage={saveMessage}
            />
          ) : (
            <></>
          )}
        </Form>
      )}
      {stageTitle === 'Requester Info' && (
        <>
          <CenteredModal
            id="info-modal"
            content={
              <>
                <p>If you are not accountable for this project, please refer this request to someone who is.</p>
                <p> Only the person who is responsible for this project can submit the intergration request.</p>
              </>
            }
            icon={false}
            onConfirm={handleModalClose}
            confirmText="Close"
            showCancel={false}
            title="Project Accountability"
            buttonStyle="custom"
            buttonAlign="center"
            closable
          />
          <CenteredModal
            title="Create a new team"
            icon={null}
            id={createTeamModalId}
            content={
              <CreateTeamForm onSubmit={(teamId: number) => handleTeamCreate(teamId)} currentUser={currentUser} />
            }
            showCancel={false}
            showConfirm={false}
            closable
          />
          {showAccountableError && (
            <ErrorText>
              If you are not accountable for this request, please refer this request to someone who is. Only the
              responsible person can submit the integration request.
            </ErrorText>
          )}
        </>
      )}
    </>
  );
}

export default withTopAlert(FormTemplate);
