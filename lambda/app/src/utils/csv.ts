import { format } from '@fast-csv/format';

export const convertCSV = (dataset) => {
  const stream = format({ headers: true });
  let data = '';

  return new Promise((resolve, reject) => {
    stream.on('end', () => resolve(data));
    dataset.map((v) => (data += v));
    stream.end();
  });
};
