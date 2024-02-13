import React, { ChangeEvent, FormEvent, useRef, useState } from 'react';
import styled from 'styled-components';
import { Integration } from 'interfaces/Request';
import { TopAlert, withTopAlert } from 'layout/TopAlert';
import { getLogs } from '@app/services/grafana';
import DateTimePicker from '@app/components/DateTimePicker';
import { subtractDaysFromDate, subtractHoursFromDate } from '@app/utils/helpers';
import BaseButton from '@button-inc/bcgov-theme/Button';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import InfoOverlay from 'components/InfoOverlay';

const Button = styled(BaseButton)`
  width: 120px;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  row-gap: 1.5em;

  .header {
    margin-top: 1em;
    display: flex;
    align-items: center;
    p {
      font-weight: bold;
      padding-right: 0.4em;
      margin: 0;
      font-size: 18px;
    }
  }

  .bold {
    font-weight: bold;
  }

  .env-controls {
    margin: 0;
    legend {
      font-size: unset;
      font-weight: bold;
    }

    input {
      margin-right: 0.2em;
    }

    label {
      margin-right: 1em;
    }
  }

  .date-picker-container {
    height: 100%;
    display: flex;
    align-items: center;
    column-gap: 1em;
  }

  select {
    margin-left: 0.5em;
    width: 200px;
  }

  .error-text {
    font-size: 14px;
    color: red;
    margin: 0;
    height: 1em;
  }
`;

interface Props {
  integration: Integration;
  alert: TopAlert;
}

/**
 * Function to trigger a browser file download for an ajax request.
 * @param filename Name to give to the downloaded file
 * @param dataObjToWrite The data to include in the file
 */
const saveTemplateAsFile = (filename: string, dataObjToWrite: any) => {
  const blob = new Blob([JSON.stringify(dataObjToWrite)], { type: 'text/json' });
  const link = document.createElement('a');
  link.download = filename;
  link.href = window.URL.createObjectURL(blob);
  link.dataset.downloadurl = ['text/json', link.download, link.href].join(':');

  const evt = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
  });
  link.dispatchEvent(evt);
  link.remove();
};

const envNames = {
  dev: 'Development',
  test: 'Test',
  prod: 'Production',
};

// Logs started earlier, this is the date label syntax was changed.
// If we change again should update this to the new deployment time.
const logsStartDate = 'February 13, 2024';

const LogsPanel = ({ integration, alert }: Props) => {
  const [environment, setEnvironment] = useState('dev');
  const environments = integration?.environments || [];
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(subtractHoursFromDate(1));
  const [toDate, setToDate] = useState<Date>(new Date());
  const [dateError, setDateError] = useState(false);

  const handleFromDateChange = (val: Date) => {
    setDateError(val > toDate);
    setFromDate(val);
  };

  const handleToDateChange = (val: Date) => {
    setDateError(val < fromDate);
    setToDate(val);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (dateError) return;
      setLoading(true);
      const [result, err] = await getLogs(integration.id as number, environment, fromDate, toDate);
      if (err) {
        alert.show({
          variant: 'danger',
          fadeOut: 10000,
          closable: true,
          content: err?.response?.data?.message ?? 'Error fetching logs.',
        });
      } else {
        alert.show({
          variant: 'success',
          fadeOut: 10000,
          closable: true,
          content: result?.message ?? 'Downloaded logs.',
        });
        saveTemplateAsFile('logs.json', result.data);
      }
    } catch (e) {
      console.error('Exception parsing file');
    } finally {
      setLoading(false);
    }
  };

  const handleEnvChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEnvironment(e.target.value);
  };

  return (
    <>
      <Form onSubmit={handleSubmit}>
        <div className="header">
          <p>Download Logs</p>
          <InfoOverlay content="You can download upto 5,000 logs at a time. Result will indicate if all logs in the selected time interval were retrieved or a smaller time interval is required." />
        </div>
        <fieldset className="env-controls">
          <legend>Select an Environment</legend>
          {environments.map((env) => (
            <span key={env}>
              <input
                id={`radio-${env}`}
                type="radio"
                name="environmentSelection"
                value={env}
                checked={environment === env}
                onChange={handleEnvChange}
              />
              <label htmlFor={`radio-${env}`}>{(envNames as any)[env]}</label>
            </span>
          ))}
        </fieldset>
        <div>
          <div className="date-picker-container">
            <DateTimePicker
              placeholderText="Start Date"
              selected={new Date(fromDate)}
              onChange={(date: Date) => handleFromDateChange(date)}
              maxDate={toDate}
              minDate={new Date(logsStartDate)}
              label="Start Date"
              showTimeInput={true}
              dateFormat="MM/dd/yyyy h:mm aa"
            />
            <DateTimePicker
              placeholderText="End Date"
              selected={new Date(toDate)}
              onChange={(date: Date) => handleToDateChange(date)}
              minDate={fromDate}
              maxDate={new Date()}
              label="End Date"
              showTimeInput={true}
              dateFormat="MM/dd/yyyy h:mm aa"
            />
          </div>
          <p className="error-text">{dateError ? 'Ensure start date is before end date.' : ' '}</p>
        </div>
        <Button type="submit" disabled={dateError || loading}>
          {loading ? ' ' : 'Submit'}{' '}
          <SpinnerGrid
            color="white"
            visible={loading}
            height={25}
            width={25}
            wrapperStyle={{ justifyContent: 'center' }}
          />
        </Button>
      </Form>
    </>
  );
};

export default withTopAlert(LogsPanel);
