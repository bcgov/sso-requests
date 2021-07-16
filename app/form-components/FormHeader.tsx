import SHeader from 'components/SHeader';

interface Props {
  formStage: number;
  id: number | undefined;
}

export default function Formheader({ formStage, id }: Props) {
  const titles = [
    'Enter requester information',
    `Req ID: ${id} - Choose providers and provide URLs`,
    `Req ID: ${id} - Terms and Conditions`,
    `Req ID: ${id} - Review and Submit`,
  ];

  return <SHeader>{titles[formStage - 1]}</SHeader>;
}
