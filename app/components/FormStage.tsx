import FormStageBox from 'components/FormStageBox';
import styled from 'styled-components';

interface Props {
  currentStage: number;
}

const Container = styled.div`
  display: flex;
  margin: 0 0 20px 0;

  & > * {
    margin-right: 10px;
  }
`;

const stages = [
  { title: 'Requester Info', number: 1 },
  { title: "Providers and URL's", number: 2 },
  { title: 'Terms and conditions', number: 3 },
  { title: 'Review & Submit', number: 4 },
];

export default function Formstage({ currentStage }: Props) {
  return (
    <Container>
      {stages.map((stage) => (
        <FormStageBox title={stage.title} stageNumber={stage.number} active={stage.number === currentStage} />
      ))}
    </Container>
  );
}
