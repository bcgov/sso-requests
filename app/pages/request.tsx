import Form from '@rjsf/core';
import styles from 'styles/request.module.css';
import schema from 'schemas/form';
import uiSchema from 'schemas/ui';
import { submitRequest } from 'services/request';

function Request() {
  return (
    <main className={styles.container}>
      <Form schema={schema} uiSchema={uiSchema} onSubmit={submitRequest} />
    </main>
  );
}

export default Request;
