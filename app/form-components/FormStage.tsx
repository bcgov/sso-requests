import FormStageBox from 'form-components/FormStageBox';
import Grid from '@button-inc/bcgov-theme/Grid';
import { isObject } from 'lodash';
import styled from 'styled-components';
interface Props {
  currentStage: number;
  setFormStage: Function;
  errors: any;
  visited: any;
  creatingNewForm: Function;
}

interface Stage {
  title: string;
  number: number;
}

const stages: Stage[] = [
  { title: 'Requester Info', number: 0 },
  { title: 'Providers and URIs', number: 1 },
  { title: 'Terms and conditions', number: 2 },
  { title: 'Review & Submit', number: 3 },
];

const Container = styled.div`
  width: 824px;
  max-width: 100%;
`;

export default function Formstage({ currentStage, setFormStage, errors, creatingNewForm, visited }: Props) {
  const handleClick = (stage: number) => {
    // Disable navigation if record is not yet created
    if (creatingNewForm()) return;
    setFormStage(stage);
  };

  return (
    <Container>
      <Grid cols={4}>
        <Grid.Row collapse="992" gutter={[]}>
          {stages.map((stage) => (
            <Grid.Col key={stage.title}>
              <FormStageBox
                title={stage.title}
                stageNumber={stage.number + 1}
                active={stage.number === currentStage}
                key={stage.number}
                hasError={!!errors[stage.number]}
                visited={visited[stage.number]}
                handleClick={() => handleClick(stage.number)}
              />
            </Grid.Col>
          ))}
        </Grid.Row>
      </Grid>
    </Container>
  );
}
