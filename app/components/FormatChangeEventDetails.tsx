import { Change } from '@app/interfaces/Event';

export default function FormatChangeEventDetails(changes: Change[]) {
  if (!changes || changes.length === 0) return <div>No changes</div>;

  const changesJSX = changes.map((change) => {
    const { kind, lhs, rhs, path, item } = change;
    const changedPath = path[0];
    switch (kind) {
      case 'E':
        return (
          <>
            <strong>Edited {changedPath}: </strong>
            Changed <code>{String(lhs)}</code> to <code>{String(rhs)}</code>
          </>
        );
      case 'A':
        if (item?.kind === 'D')
          return (
            <>
              <strong>Changed Array {changedPath}: </strong>
              Deleted <code> {item?.lhs}</code>
            </>
          );
        if (item?.kind === 'N')
          return (
            <>
              <strong>Changed Array {changedPath}: </strong>
              Added <code>{item?.rhs}</code>
            </>
          );
        else
          return (
            <>
              <strong>Changed Array {changedPath}: </strong>
              Edited{' '}
              <code>
                {item?.lhs} to {item?.rhs}
              </code>
            </>
          );
      case 'N':
        return (
          <>
            <strong>Added {changedPath}: </strong>
            <code>{item}</code>
          </>
        );
      case 'D':
        return (
          <>
            <strong>Deleted {changedPath} </strong>
          </>
        );
      default:
        return <code>{JSON.stringify(change, null, 2)}</code>;
    }
  });
  return (
    <ul>
      {changesJSX.map((change, i) => (
        <li key={i}>{change}</li>
      ))}
    </ul>
  );
}
