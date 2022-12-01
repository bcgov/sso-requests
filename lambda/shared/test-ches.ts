import { _sendEmail } from './utils/ches';

(async () => {
  await _sendEmail(
    'https://ches.api.gov.bc.ca/api/v1/email',
    '0943A91E-411F1C4F26B',
    '729fdeae-a528-4205-8a32-576bb1894ca9',
    {
      to: ['junminahn@outlook.com'],
      body: 'test email',
    },
  );
})();
