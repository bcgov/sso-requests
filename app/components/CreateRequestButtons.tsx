import Button from '@button-inc/bcgov-theme/Button';

interface Props {
  show: boolean | undefined;
}

export default function CreateRequestButtons({ show }: Props) {
  return (
    <>
      {show && (
        <>
          <Button disabled>Cancel</Button>
          <Button primary>Submit</Button>
        </>
      )}
    </>
  );
}
