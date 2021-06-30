import Form from '@rjsf/core';
import styles from '../styles/request.module.css';
import schema from '../schemas/form';
import uiSchema from '../schemas/ui';

function Request() {
  return (
    <main className={styles.container}>
      <Form schema={schema} uiSchema={uiSchema} onSubmit={(e) => console.log(e.formData)} />
    </main>
  );
}

export default Request;
