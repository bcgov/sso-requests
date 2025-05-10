import axios from 'axios';

export const sendRcNotification = async (data: string, err: string) => {
  try {
    const headers = { Accept: 'application/json' };
    const statusCode = err ? 'ERROR' : '';
    const rcResponse = await axios.post(
      process.env.RC_WEBHOOK || '',
      { projectName: 'css-request-monitor', message: data, statusCode },
      { headers },
    );
    if (rcResponse.status !== 200) {
      console.error('Failed to send RC notification', rcResponse.status, rcResponse.data);
    }
  } catch (err) {
    console.error('Unable to send RC notification', err);
  }
};
