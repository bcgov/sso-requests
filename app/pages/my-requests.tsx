import styles from 'styles/request.module.css';
import { getRequests } from 'services/request';

function Request() {
  const handleClick = async () => {
    const requests = await getRequests();
    console.log(requests);
  };

  return (
    <main className={styles.container}>
      <button onClick={handleClick}>Get data</button>
    </main>
  );
}

export default Request;
