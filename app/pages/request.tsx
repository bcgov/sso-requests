import Form from '@rjsf/core';
import styles from 'styles/request.module.css';
import schema from 'schemas/form';
import uiSchema from 'schemas/ui';
import { submitRequest } from 'services/request';
import { Data } from '../../shared/interfaces';

function Request() {
  return (
    <main className={styles.container}>
      <Form schema={schema} uiSchema={uiSchema} onSubmit={(e) => submitRequest(e.formData as Data)} />
    </main>
  );
}

export default Request;
