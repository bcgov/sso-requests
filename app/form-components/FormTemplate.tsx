import React, { useState, useEffect } from 'react';
import FormHeader from 'form-components/FormHeader';
import FormStage from 'form-components/FormStage';
import Form from 'form-components/GovForm';
import getUiSchema from 'schemas/ui';
import FormButtons from 'form-components/FormButtons';
import { Request } from 'interfaces/Request';
import CenteredModal from 'components/CenteredModal';
import { createRequest, updateRequest } from 'services/request';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import FormReview from 'form-components/FormReview';
import TermsAndConditions from 'components/TermsAndConditions';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { validateForm, getFormStageInfo } from 'utils/helpers';
import { stageTitlesUsingForms, stageTitlesReviewing, createTeamModalId } from 'utils/constants';
import { customValidate } from 'utils/shared/customValidate';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { getTeams } from 'services/team';
import { SaveMessage } from 'interfaces/form';
import { Team } from 'interfaces/team';
import Link from '@button-inc/bcgov-theme/Link';
import TeamForm from 'form-components/team-form/CreateTeamForm';

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
  currentUser: {
    email?: string;
  };
  request?: any;
  alert: TopAlert;
  isAdmin: boolean;
}

function FormTemplate({ currentUser = {}, request, alert, isAdmin }: Props) {
  const [formData, setFormData] = useState((request || {}) as Request);
  const [formStage, setFormStage] = useState(request ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessage | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [visited, setVisited] = useState<any>(request ? { '0': true } : {});
  const [teams, setTeams] = useState<Team[]>([]);
  const [showAccountableError, setShowAccountableError] = useState(false);
  const router = useRouter();

  const { stages, stageTitle, schema, schemas } = getFormStageInfo({ isAdmin, formStage, teams });
  const showFormButtons = !isAdmin && (formStage !== 0 || formData.usesTeam || formData.projectLead);

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
  };

  useEffect(() => {
    if (!formData.preferredEmail) {
      setFormData({ ...formData, preferredEmail: currentUser.email || '' });
    }
  }, [currentUser]);

  const loadTeams = async () => {
    const [teams, err] = await getTeams();
    if (err) {
      // add err handling
      console.error(err);
    } else {
      setTeams(teams || []);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const changeStep = (newStage: number) => {
    visited[formStage] = true;

    if (newStage === 3) {
      visited['0'] = true;
      visited['1'] = true;
      visited['2'] = true;
    }

    const formErrors = validateForm(formData, schemas, visited);
    setErrors(formErrors);
    setFormStage(newStage);
    setVisited(visited);
    alert.hide();
  };

  const handleBackClick = () => {
    const redirectUrl = isAdmin ? '/admin-dashboard' : '/my-requests';
    router.push({ pathname: redirectUrl });
  };

  const creatingNewForm = () => router.route.endsWith('/request');

  const uiSchema = getUiSchema(!creatingNewForm());

  const handleFormSubmit = async () => {
    setLoading(true);

    try {
      if (creatingNewForm()) {
        const [data, err] = await createRequest(formData);
        const { id } = data || {};

        if (err || !id) {
          setLoading(false);
          return;
        }
        const redirectUrl = isAdmin ? '/admin-dashboard' : `/request/${id}`;
        await router.push({ pathname: redirectUrl });
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
      if (creatingNewForm()) {
        visited[formStage] = true;
        setVisited(visited);
        return;
      }
    }

    const newStage = formStage + 1;
    changeStep(newStage);
  };

  const handleBlur = async (id: string, value: any) => {
    if (creatingNewForm() || isAdmin) return;
    if (request) {
      setSaving(true);
      const [, err] = await updateRequest({ ...formData, id: request.id });
      if (!err) setSaveMessage({ content: `Last saved at ${new Date().toLocaleString()}`, error: false });
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    window.location.hash = '#';
  };

  const backButtonText = request ? 'Save and Close' : 'Cancel';

  return (
    <>
      <HeaderContainer>
        <FormHeader formStage={formStage} id={formData.id} />
        <FormStage
          currentStage={formStage}
          setFormStage={changeStep}
          errors={errors}
          creatingNewForm={creatingNewForm}
          visited={visited}
          stages={stages}
        />
        <Description>
          If new to SSO, please visit{' '}
          <Link external href="https://github.com/bcgov/ocp-sso/wiki/Using-Your-SSO-Client">
            github
          </Link>{' '}
          for more information.
        </Description>
      </HeaderContainer>
      {stageTitle === 'Terms and conditions' && <TermsAndConditions />}
      {stageTitlesReviewing.includes(stageTitle) && (
        <FormReview
          formData={formData}
          setErrors={setErrors}
          errors={errors}
          visited={visited}
          saving={saving}
          saveMessage={saveMessage}
          isAdmin={isAdmin}
          setFormData={setFormData}
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
          ArrayFieldTemplate={ArrayFieldTemplate}
          onBlur={handleBlur}
          liveValidate={visited[formStage] || isAdmin}
          validate={customValidate}
        >
          <FormButtons
            formSubmission={formStage === 0}
            text={{ continue: 'Next', back: backButtonText }}
            show={showFormButtons}
            loading={loading}
            handleSubmit={handleButtonSubmit}
            handleBackClick={handleBackClick}
            saving={saving}
            saveMessage={saveMessage}
          />
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
            content={<TeamForm onSubmit={loadTeams} />}
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
