export const prettyJSON = (json: any) => {
  return JSON.stringify(json, undefined, 2);
};

export const copyTextToClipboard = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    document.body.removeChild(textArea);
    return false;
  }
};

export const downloadText = (text: string, filename: string) => {
  const url = window.URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
