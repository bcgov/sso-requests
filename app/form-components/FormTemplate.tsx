import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import isNil from 'lodash.isnil';
import throttle from 'lodash.throttle';
import padStart from 'lodash.padstart';
import difference from 'lodash.difference';
import trim from 'lodash.trim';
import FormHeader from 'form-components/FormHeader';
import FormStage from 'form-components/FormStage';
import Form from 'form-components/GovForm';
import FormButtons from 'form-components/FormButtons';
import FieldTemplate from 'form-components/FieldTemplate';
import ArrayFieldTemplate from 'form-components/ArrayFieldTemplate';
import CenteredModal from 'components/CenteredModal';
import { validateForm, customValidate } from 'utils/validate';
import {
  checkBceidBoth,
  checkBceidGroup,
  checkBceidRegularGroup,
  checkIdirGroupAndNotBceidBoth,
  checkIdirGroupAndNotBceidRegularGroup,
  checkGithubGroup,
  checkNotGithubGroup,
  usesDigitalCredential,
  usesBcServicesCard,
} from '@app/helpers/integration';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { getMyTeams, getAllowedTeams } from 'services/team';
import { getUISchema } from 'schemas-ui';
import { getSchemas } from 'schemas';
import { Integration } from 'interfaces/Request';
import { Team, LoggedInUser } from 'interfaces/team';
import Link from '@button-inc/bcgov-theme/Link';
import CancelConfirmModal from 'page-partials/edit-request/CancelConfirmModal';
import { createRequest, updateRequest } from 'services/request';
import { SurveyContext } from '@app/pages/_app';
import { docusaurusURL } from '@app/utils/constants';
import { BcscAttribute, BcscPrivacyZone } from '@app/interfaces/types';
import { fetchAttributes, fetchPrivacyZones } from '@app/services/bc-services-card';
import {
  bcscPrivacyZones as defaultBcscPrivacyZones,
  bcscAttributes as defaultBcscAttributes,
} from '@app/utils/constants';
import validator from '@rjsf/validator-ajv8';
import { validateIDPs } from '@app/utils/helpers';

const Description = styled.p`
  margin: 0;
`;

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 150px;
`;

/**
 * UI requirement to adjust the users idp selection for them. e.g. if they add bceidboth, to automatically remove any other bceid types.
 */
export const adjustIdps = ({
  currentIdps,
  updatedIdps,
  applied = true,
  bceidApproved = false,
  protocol = 'oidc',
  isAdmin = false,
  githubApproved = false,
  bcServicesCardApproved = false,
}: {
  currentIdps: string[];
  updatedIdps: string[];
  applied?: boolean;
  bceidApproved?: boolean;
  protocol?: string;
  isAdmin?: boolean;
  githubApproved?: boolean;
  bcServicesCardApproved?: boolean;
}) => {
  const valid = validateIDPs({
    currentIdps,
    updatedIdps,
    applied,
    bceidApproved,
    protocol,
    isAdmin,
    githubApproved,
    bcServicesCardApproved,
  });
  if (valid) return updatedIdps;

  const idpAdded = currentIdps.length < updatedIdps.length;
  let idps = updatedIdps;

  if (idpAdded) {
    const newIdp = difference(updatedIdps, currentIdps)[0];

    if (protocol === 'saml') {
      if (applied && bceidApproved) {
        idps = currentIdps;
      } else {
        idps = [];
        idps.push(newIdp);
      }
    } else if (checkBceidGroup(newIdp)) {
      if (checkBceidRegularGroup(newIdp)) idps = updatedIdps.filter(checkIdirGroupAndNotBceidBoth);
      else if (checkBceidBoth(newIdp)) idps = updatedIdps.filter(checkIdirGroupAndNotBceidRegularGroup);
    } else if (checkGithubGroup(newIdp)) idps = updatedIdps.filter(checkNotGithubGroup).concat(newIdp);
  }

  return idps;
};

const trimRedirectUris = (urls: string[], dropEmptyRedirectUris = false) => {
  if (!urls || urls.length === 0) return [];

  let items = urls.map(trim);
  if (dropEmptyRedirectUris) items = items.filter((v) => v);
  if (items.length === 0) items.push('');
  return items;
};

const trimFormData = (formData: any, { dropEmptyRedirectUris = false } = {}) => {
  const devValidRedirectUris = trimRedirectUris(formData.devValidRedirectUris, dropEmptyRedirectUris);
  const testValidRedirectUris = trimRedirectUris(formData.testValidRedirectUris, dropEmptyRedirectUris);
  const prodValidRedirectUris = trimRedirectUris(formData.prodValidRedirectUris, dropEmptyRedirectUris);

  return {
    ...formData,
    devValidRedirectUris,
    testValidRedirectUris,
    prodValidRedirectUris,
  };
};

interface Props {
  currentUser: LoggedInUser;
  request?: Integration | undefined;
  alert: TopAlert;
}

function FormTemplate({ currentUser, request, alert }: Props) {
  const router = useRouter();
  const { step } = router.query;
  const stage = step ? Number(step) : 0;
  const [formData, setFormData] = useState({
    ...(request || {}),
    isAdmin: currentUser.isAdmin || false,
  } as Integration);
  const [formStage, setFormStage] = useState(stage);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [visited, setVisited] = useState<any>(request ? { '0': true } : {});
  const [teams, setTeams] = useState<Team[]>([]);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [bcscPrivacyZones, setBcscPrivacyZones] = useState<BcscPrivacyZone[]>(defaultBcscPrivacyZones());
  const [bcscAttributes, setBcscAttributes] = useState<BcscAttribute[]>(defaultBcscAttributes());
  const [openSubmissionModal, setOpenSubmissionModal] = useState(false);

  const surveyContext = useContext(SurveyContext);

  const isNew = isNil(request?.id);
  const isApplied = request?.status === 'applied';
  const isAdmin = currentUser.isAdmin || false;

  const showFormButtons = formStage !== 0 || formData.usesTeam || formData.projectLead;
  const isLastStage = formStage === schemas.length - 1;
  const isFirstStage = formStage === 0;
  const schema = schemas[formStage] || {};

  const throttleUpdate = useCallback(
    throttle(
      async (data: Integration) => {
        if (isNew || isApplied) return;
        if (request) {
          setSaving(true);
          const [, err] = await updateRequest({ ...data, id: request.id });
          if (!err) setSaveMessage(`Last saved at ${new Date().toLocaleString()}`);
          setSaving(false);
        }
      },
      2000,
      { trailing: true },
    ),
    [request?.id],
  );

  const handleChange = (e: any) => {
    const newData = trimFormData(e.formData);
    const currentIdps = formData?.devIdps || [];
    const updatedIdps = newData.devIdps || [];

    const devIdps = adjustIdps({
      currentIdps,
      updatedIdps,
      applied: formData.status === 'applied',
      bceidApproved: formData.bceidApproved,
      protocol: formData.protocol,
      isAdmin: formData.isAdmin,
      githubApproved: formData.githubApproved,
    });
    const processed = { ...newData, devIdps };

    const togglingTeamToTrue = !formData.usesTeam && newData.usesTeam === true;

    if (newData.protocol !== 'saml') {
      if (formData.protocol !== newData.protocol) processed.clientId = '';
      processed.devSamlLogoutPostBindingUri = '';
      processed.testSamlLogoutPostBindingUri = '';
      processed.prodSamlLogoutPostBindingUri = '';
    }

    if (newData.protocol === 'saml' && usesDigitalCredential(newData)) {
      processed.devIdps = [];
    }

    if (newData.authType !== 'browser-login') processed.publicAccess = false;

    // If user switches to team integration before submitting then set project lead to false
    if (togglingTeamToTrue) {
      if (processed.projectLead === true && !isNew) processed.projectLead = false;
    }

    setFormData(processed);

    throttleUpdate(processed);
  };

  const loadTeams = async () => {
    const getTeams = isNew ? getMyTeams : getAllowedTeams;
    const [teams, err] = await getTeams();
    if (err) {
      alert.show({
        variant: 'danger',
        content: 'Failed to load teams. Please refresh.',
      });
    } else {
      setTeams(teams || []);
    }
  };

  const loadBcscPrivacyZones = async () => {
    let [data] = await fetchPrivacyZones();
    if (data && data?.length > 0) data = data?.sort((a, b) => a.privacy_zone_name.localeCompare(b.privacy_zone_name))!;
    setBcscPrivacyZones(data || []);
  };

  const loadBcscAttributes = async () => {
    let [data] = await fetchAttributes();
    if (data && data?.length > 0) data = data?.sort((a, b) => a.name.localeCompare(b.name))!;
    setBcscAttributes(data || []);
  };

  const updateInfo = () => {
    const schemas = getSchemas({
      integration: request,
      formData,
      teams,
      isAdmin,
      bcscPrivacyZones,
      bcscAttributes,
    });

    setSchemas(schemas);
  };

  useEffect(() => {
    loadTeams();
    loadBcscPrivacyZones();
    loadBcscAttributes();
  }, []);

  // Clear other details when other is unselected
  useEffect(() => {
    if (formData.primaryEndUsers && !formData.primaryEndUsers.includes('other')) {
      setFormData({ ...formData, primaryEndUsersOther: '' });
    }
    // Using JSON.stringify is recommended for shallow, non-cyclic objects: https://github.com/facebook/react/issues/14476#issuecomment-471199055
    // Works in this case since primaryEndUsers is a short string array
  }, [JSON.stringify(formData.primaryEndUsers)]);

  useEffect(() => {
    updateInfo();
  }, [formData, formStage, teams]);

  const changeStep = (newStage: number) => {
    visited[formStage] = true;

    if (newStage === schemas.length - 1) {
      for (let x = 0; x < schemas.length; x++) visited[x] = true;
    }
    const newData = trimFormData(formData, { dropEmptyRedirectUris: true });
    const formErrors = validateForm(formData, schemas, visited);
    setErrors(formErrors);
    setFormStage(newStage);
    setFormData(newData);
    setVisited(visited);
    alert.hide();
  };

  const handleBackClick = () => {
    const redirectUrl = isAdmin ? '/admin-dashboard' : '/my-dashboard';
    router.push({ pathname: redirectUrl });
  };

  const uiSchema = getUISchema({ integration: request as Integration, formData, isAdmin, teams, schemas });

  const handleFormSubmit = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (isNew) {
        formData.serviceType = 'gold';
        formData.realm = 'standard';
        formData.environments = ['dev'];
        const [data, err] = await createRequest(formData);
        const { id } = data || {};

        if (err) {
          alert.show({
            variant: 'danger',
            fadeOut: 5000,
            closable: true,
            content: 'Failed to submit request. Please try again.',
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
      const [data, err] = await updateRequest(formData, true);

      if (err) {
        alert.show({
          variant: 'danger',
          fadeOut: 10000,
          closable: true,
          content: 'Failed to submit request. Please try again.',
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
          query: {
            id: data.id,
            integrationFailedMessageModal: ['planFailed', 'applyFailed'].includes(data.status!),
            requestId: padStart(String(data.id), 8, '0'),
          },
        });
        surveyContext?.setShowSurvey(true, 'createIntegration');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleButtonSubmit = async () => {
    if (isNew && formStage === 0) {
      visited[formStage] = true;
      setVisited(visited);
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
      setOpenSubmissionModal(true);
    }
  };

  const backButton = isApplied ? <CancelConfirmModal onConfirm={handleBackClick} /> : null;
  const buttonTexts = { continue: '', back: '' };
  const hasDigitalCredential = formData.devIdps?.includes('digitalcredential');
  if (isLastStage) {
    buttonTexts.continue = isApplied ? 'Update' : 'Submit';
    buttonTexts.back = isApplied ? 'Cancel' : 'Save and Close';
  } else if (isFirstStage && isNew) {
    buttonTexts.continue = 'Next';
    buttonTexts.back = isApplied ? 'Cancel' : 'Close';
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
          If new to SSO, please{' '}
          <Link external href={`${docusaurusURL}/category/integrating-your-application`}>
            click to learn more on our wiki page
          </Link>
          .
        </Description>
      </HeaderContainer>
      <Form
        schema={schema}
        uiSchema={uiSchema}
        onChange={handleChange}
        onSubmit={handleFormSubmit}
        formData={formData}
        formContext={{ isAdmin, teams, formData, setFormData, loadTeams, bcscPrivacyZones }}
        templates={{ FieldTemplate, ArrayFieldTemplate }}
        liveValidate={visited[formStage] || isApplied}
        customValidate={customValidate}
        validator={validator}
      >
        {showFormButtons ? (
          <FormButtons
            formSubmission={isNew && formStage === 0}
            backButton={backButton}
            text={buttonTexts}
            loading={loading}
            handleSubmit={handleButtonSubmit}
            handleBackClick={handleBackClick}
            savingStatus={{ saving, content: saveMessage }}
          />
        ) : (
          <></>
        )}
      </Form>
      <CenteredModal
        id={`confirmation-modal`}
        openModal={openSubmissionModal}
        handleClose={() => setOpenSubmissionModal(false)}
        content={
          <>
            <p>Are you sure you&apos;re ready to submit your request?</p>
            {hasDigitalCredential && (
              <p>
                You will need to engage with DIT to learn about the Digital Credential Configuration ID. You can contact
                them at <Link href="mailto:ditp.support@gov.bc.ca">ditp.support@gov.bc.ca</Link>.
              </p>
            )}
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
