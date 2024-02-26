import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Integration } from 'interfaces/Request';
import { TopAlert, withTopAlert } from 'layout/TopAlert';
import { getLogs } from '@app/services/grafana';
import DateTimePicker from '@app/components/DateTimePicker';
import BaseButton from '@button-inc/bcgov-theme/Button';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import InfoOverlay from 'components/InfoOverlay';
import { subtractDaysFromDate } from '@app/utils/helpers';

const Button = styled(BaseButton)`
  width: 150px;
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

  .button-container {
    display: flex;
    flex-diretion: row;
    align-items: center;

    p {
      margin: 0;
      margin-left: 1em;
    }
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
const logsStartDate = new Date('February 13, 2024');
// 2 days
const DATE_RANGE = 2 * 24 * 60 * 60 * 1000;

const LogsPanel = ({ integration, alert }: Props) => {
  const [environment, setEnvironment] = useState('dev');
  const environments = integration?.environments || [];
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(subtractDaysFromDate(1));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [dateError, setDateError] = useState('');
  const [fileProgress, setFileProgress] = useState(0);
  const [maxDate, setMaxDate] = useState(new Date());
  const [logsQueryController, setLogsQueryController] = useState<AbortController>();

  useEffect(() => {
    if (!fromDate) return;
    // Set the toDate limit
    if (Date.now() - fromDate.getTime() > DATE_RANGE) {
      setMaxDate(new Date(fromDate.getTime() + DATE_RANGE));
    } else {
      setMaxDate(new Date());
    }

    // Clear toDate if too early or too late for new range
    if (!toDate) return;
    if (toDate.getTime() < fromDate.getTime() || toDate.getTime() - fromDate.getTime() > DATE_RANGE) {
      setToDate(null);
    }
  }, [fromDate]);

  useEffect(() => {
    if (!toDate || !fromDate) return;
    if (toDate.getTime() < fromDate.getTime()) {
      setDateError('Please ensure your end date is later than your start date.');
    }
  }, [toDate]);

  const handleFromDateChange = (val: Date) => {
    setDateError('');
    setFromDate(val);
  };

  const handleToDateChange = (val: Date) => {
    setDateError('');
    setToDate(val);
  };

  const handleFileProgress = (progressEvent: ProgressEvent) => {
    const percentComplete = Math.floor((progressEvent.loaded / progressEvent.total) * 100);
    if (percentComplete !== fileProgress) {
      setFileProgress(percentComplete);
    }
  };

  const resetForm = () => {
    setEnvironment('dev');
    setFromDate(subtractDaysFromDate(1));
    setToDate(new Date());
  };

  // Abort fetch request and reset form on integration change
  useEffect(() => {
    resetForm();
    const controler = new AbortController();
    setLogsQueryController(controler);
    return () => {
      controler.abort();
    };
  }, [integration.clientId]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!fromDate || !toDate) {
        setDateError('Please select a date range.');
        return;
      }
      setLoading(true);
      const [result, err] = await getLogs(
        integration.id as number,
        environment,
        fromDate,
        toDate,
        handleFileProgress,
        logsQueryController,
      );
      if (err) {
        // Ignore error if request cancelled
        if (err.code === 'ERR_CANCELED') return;
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
        const resultJSON = await result.text();
        saveTemplateAsFile(
          `${integration.clientId}-${fromDate.toLocaleString()}-${toDate.toLocaleString()}.json`,
          JSON.parse(resultJSON),
        );
      }
    } catch (e) {
      console.error('Exception parsing file');
    } finally {
      setLoading(false);
      setFileProgress(0);
    }
  };

  const handleEnvChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEnvironment(e.target.value);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="header">
        <p>Download Logs</p>
        <InfoOverlay content="You can download upto 25,000 logs at a time. Result will indicate if all logs in the selected time interval were retrieved or a smaller time interval is required." />
      </div>
      <fieldset className="env-controls" disabled={loading}>
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
            selected={fromDate}
            onChange={(date: Date) => handleFromDateChange(date)}
            minDate={logsStartDate}
            shouldCloseOnSelect={false}
            label="Start Date"
            showTimeInput={true}
            dateFormat="MM/dd/yyyy h:mm aa"
            disabled={loading}
          />
          <DateTimePicker
            placeholderText="End Date"
            selected={toDate}
            onChange={(date: Date) => handleToDateChange(date)}
            minDate={fromDate}
            maxDate={maxDate}
            label="End Date"
            shouldCloseOnSelect={false}
            showTimeInput={true}
            dateFormat="MM/dd/yyyy h:mm aa"
            disabled={loading}
          />
        </div>
        <p className="error-text">{dateError}</p>
      </div>
      <div className="button-container">
        <Button type="submit" disabled={dateError || loading}>
          {loading ? ' ' : 'Download'}{' '}
          <SpinnerGrid
            color="white"
            visible={loading}
            height={25}
            width={25}
            wrapperStyle={{ justifyContent: 'center' }}
          />
        </Button>
        {loading && fileProgress === 0 && <p>Querying logs...</p>}
        {loading && fileProgress !== 0 ? <p>{fileProgress}% downloaded.</p> : null}
      </div>
    </Form>
  );
};

export default withTopAlert(LogsPanel);
