import styled from 'styled-components';

const Header = styled.h1`
  font-weight: lighter;
  color: #003366;
`;

interface Props {
  formStage: number;
  id: number | undefined;
}

export default function Formheader({ formStage, id }: Props) {
  const titles = ['Enter requester information', `Req ID: ${id} - Choose providers and provide URLs`];

  return <Header>{titles[formStage - 1]}</Header>;
}
