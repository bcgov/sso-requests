const APP_URL = process.env.APP_URL || '';
const APP_ENV = process.env.APP_ENV || 'development';

type EmailMessage =
  | 'create-request-submitted'
  | 'create-request-approved'
  | 'uri-change-request-submitted'
  | 'uri-change-request-approved'
  | 'request-deleted'
  | 'request-deleted-notification-to-admin'
  | 'request-limit-exceeded';

interface BodyData {
  projectName?: string;
  requestNumber?: number;
  requestOwner?: string;
  submittedBy?: string;
}

const footer = `
<p>
    If you have any questions, please contact us by
    <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
    Rocket.Chat
    </a>
    or email at:
    <a href="mailto:zorin.samji@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
        Zorin.Samji@gov.bc.ca
    </a>
</p>
<p>Thank you.<br />Pathfinder SSO Team</p>`;

export const getEmailBody = (
  messageType: EmailMessage,
  { projectName = '', requestNumber = -1, requestOwner = '', submittedBy = '' }: BodyData,
) => {
  switch (messageType) {
    case 'create-request-submitted':
      return `
        <h1>Your Pathfinder SSO request #${requestNumber} is successfully submitted.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by:</strong>${submittedBy}
        </p>
        <p>
            <strong>The expected processing time is 20 minutes</strong><br />
            Once the request is approved, you will receive another email once your JSON Client Installation is ready. If you are
            not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'create-request-approved':
      return `
        <h1>Your Pathfinder SSO request #${requestNumber} is approved.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by:</strong>${submittedBy}
        </p>
        <p>
            ${submittedBy}, please <a href="${APP_URL}/my-requests" title="Log in" target="_blank" rel="noreferrer">Log in</a>
             to your dashboard to access JSON Client Installation File.
            If you are not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'uri-change-request-submitted':
      return `
        <h1>Your Pathfinder SSO URI change request #${requestNumber} is successfully submitted.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by:</strong>${submittedBy}
        </p>
        <p>
            <strong>The expected processing time is 20 minutes</strong><br />
            Once the request is approved, you will receive another email once your JSON Client Installation is ready. If you are
            not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'uri-change-request-approved':
      return `
        <h1>Your Pathfinder SSO URI change request #${requestNumber} is approved.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by:</strong>${submittedBy}
        </p>
        <p>
            ${submittedBy}, please <a href="${APP_URL}/my-requests" title="Log in" target="_blank" rel="noreferrer">Log in</a>
             to your dashboard to access JSON Client Installation File.
            If you are not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'request-deleted':
      return `
        <h1>Your Pathfinder SSO request #${requestNumber} is deleted.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Deleted by:</strong>${submittedBy}
        </p>
        <p>This email serves only to notify you of the request status.</p>
        ${footer}`;

    case 'request-deleted-notification-to-admin':
      return `
        <h1>Pathfinder SSO request #${requestNumber} is deleted by ${submittedBy}</h1>
        <p>
            <strong>Project name: </strong>${projectName}
        </p>`;
    case 'request-limit-exceeded':
      return `
        <h1>Request Limit Exceeded</h1>
        <p>Pathfinder SSO user ${submittedBy} has exceeded their daily limit</p>
        `;

    default:
      return '';
  }
};

export const getEmailSubject = (messageType: EmailMessage) => {
  const prefix = APP_ENV === 'development' ? '[DEV] ' : '';

  switch (messageType) {
    case 'create-request-submitted':
      return `${prefix}Pathfinder SSO request submitted`;
    case 'create-request-approved':
      return `${prefix}Pathfinder SSO request approved`;
    case 'uri-change-request-submitted':
      return `${prefix}Pathfinder SSO URI change request submitted`;
    case 'uri-change-request-approved':
      return `${prefix}Pathfinder SSO URI change request approved`;
    case 'request-deleted':
      return `${prefix}Pathfinder SSO request deleted`;
    case 'request-deleted-notification-to-admin':
      return `${prefix}Pathfinder SSO request deleted`;
    case 'request-limit-exceeded':
      return `${prefix}Pathfinder SSO request limit reached`;
    default:
      return '';
  }
};
