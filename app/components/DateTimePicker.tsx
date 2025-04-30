import DatePicker, { ReactDatePickerProps } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FormLabel } from 'react-bootstrap';
import React from 'react';

export default function DateTimePicker(props: ReactDatePickerProps & { label: string }) {
  return (
    <>
      <DatePicker
        dateFormat="yyyy-MM-dd"
        customInput={<DateTimeInput label={props.label} />}
        enableTabLoop={false}
        popperPlacement="bottom-start"
        maxDate={new Date()}
        {...props}
      />
    </>
  );
}

const DateTimeInput = React.forwardRef(({ value, onClick, label }: any, ref) => {
  return (
    <>
      <FormLabel style={{ fontWeight: 'bold' }}>{label}</FormLabel>
      <div className="input-group">
        <input type="text" className="form-control" value={value} onClick={onClick} readOnly />
        <div className="input-group-append">
          <span className="input-group-text" style={{ height: '100%' }}>
            <FontAwesomeIcon icon={faCalendar} />
          </span>
        </div>
      </div>
    </>
  );
});
