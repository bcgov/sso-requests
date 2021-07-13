import Button from '@button-inc/bcgov-theme/Button';

export default function CreateRequestButtons({ show }: any) {
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
