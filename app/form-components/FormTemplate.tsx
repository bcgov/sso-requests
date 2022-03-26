import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { isNil, throttle, padStart } from 'lodash';
import FormHeader from 'form-components/FormHeader';
import FormStage from 'form-components/FormStage';
import Form from 'form-components/GovForm';
import FormButtons from 'form-components/FormButtons';
import FieldTemplate from 'form-components/FieldTemplate';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import CenteredModal from 'components/CenteredModal';
import { validateForm, customValidate } from 'utils/validate';
import { parseError } from 'utils/helpers';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { getMyTeams, getAllowedTeams } from 'services/team';
import { getUISchema } from 'schemas-ui';
import { getSchemas } from 'schemas';
import { Request } from 'interfaces/Request';
import { SaveMessage } from 'interfaces/form';
import { Team, LoggedInUser } from 'interfaces/team';
import Link from '@button-inc/bcgov-theme/Link';
import CancelConfirmModal from 'page-partials/edit-request/CancelConfirmModal';
import { createRequest, updateRequest } from 'services/request';
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
  const [schemas, setSchemas] = useState<any[]>([]);
  const isNew = isNil(request?.id);
  const isApplied = request?.status === 'applied';
  const isAdmin = currentUser.isAdmin || false;

  const showFormButtons = formStage !== 0 || formData.usesTeam || formData.projectLead;
  const isLastStage = formStage === schemas.length - 1;
  const schema = schemas[formStage] || {};

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
    const schemas = getSchemas({
      integration: request,
      formData,
      teams,
    });

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

    if (newStage === schemas.length - 1) {
      for (let x = 0; x < schemas.length; x++) visited[x] = true;
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

  const uiSchema = getUISchema({ integration: request as Request, isAdmin });

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

  const handleSubmit = async () => {
    try {
      const [, err] = await updateRequest(formData, true);

      if (err) {
        alert.show({
          variant: 'danger',
          fadeOut: 10000,
          closable: true,
          content: parseError(err).message,
        });
      } else {
        alert.show({
          variant: 'success',
          fadeOut: 10000,
          closable: true,
          content: `Request ID:${padStart(String(formData.id), 8, '0')} is successfully submitted!`,
        });

        router.push({
          pathname: isAdmin ? '/admin-dashboard' : '/my-dashboard',
          query: { id: formData.id },
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleButtonSubmit = async () => {
    if (formStage === 0) {
      if (isNew) {
        visited[formStage] = true;
        setVisited(visited);
      }
    } else if (isLastStage) {
      openConfirmModal();
    } else {
      const newStage = formStage + 1;
      changeStep(newStage);
    }
  };

  const openConfirmModal = () => {
    const formErrors = validateForm(formData, schemas);
    if (Object.keys(formErrors).length > 0) {
      alert.show({
        variant: 'danger',
        fadeOut: 10000,
        closable: true,
        content:
          'There were errors with your submission. Please see the navigation tabs above for the form pages with errors.',
      });

      setErrors(formErrors);
    } else {
      window.location.hash = 'confirmation-modal';
    }
  };

  const backButton = isApplied ? <CancelConfirmModal onConfirm={handleBackClick} /> : null;
  const buttonTexts = { continue: '', back: '' };

  if (isLastStage) {
    buttonTexts.continue = isApplied ? 'Update' : 'Submit';
    buttonTexts.back = isApplied ? 'Cancel' : 'Save and Close';
  } else {
    buttonTexts.continue = 'Next';
    buttonTexts.back = isApplied ? 'Cancel' : 'Save and Close';
  }

  if (schemas.length === 0) return null;

  return (
    <>
      <HeaderContainer>
        <FormHeader schema={schema} requestId={formData.id} editing={isApplied} />
        <FormStage
          currentStage={formStage}
          setFormStage={changeStep}
          errors={errors}
          isNew={isNew}
          visited={visited}
          schemas={schemas}
        />
        <Description>
          If new to SSO, please visit{' '}
          <Link external href="https://github.com/bcgov/sso-keycloak/wiki/Using-Your-SSO-Client">
            github
          </Link>{' '}
          for more information.
        </Description>
      </HeaderContainer>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        onChange={handleChange}
        onSubmit={handleFormSubmit}
        formData={formData}
        formContext={{ isAdmin, teams, formData, setFormData, loadTeams }}
        FieldTemplate={FieldTemplate}
        ArrayFieldTemplate={ArrayFieldTemplate}
        liveValidate={visited[formStage] || isApplied}
        validate={customValidate}
      >
        {showFormButtons ? (
          <FormButtons
            formSubmission={formStage === 0}
            backButton={backButton}
            text={buttonTexts}
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
      <CenteredModal
        id={`confirmation-modal`}
        content={
          <>
            <p>Are you sure you're ready to submit your request?</p>
            {!isAdmin && (
              <p>
                If you need to change anything after submitting your request, please contact our{' '}
                <Link external href="https://chat.developer.gov.bc.ca/channel/sso/">
                  #SSO channel
                </Link>{' '}
                or email <Link href="mailto:bcgov.sso@gov.bc.ca">bcgov.sso@gov.bc.ca</Link>
              </p>
            )}
          </>
        }
        title="Submitting Request"
        onConfirm={handleSubmit}
      />
    </>
  );
}

export default withTopAlert(FormTemplate);
