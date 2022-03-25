import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import FormStageBox from 'form-components/FormStageBox';
import { Stage } from 'interfaces/form';

interface Props {
  currentStage: number;
  setFormStage: Function;
  errors: any;
  visited: any;
  isNew: boolean;
  stages: Stage[];
}

const Container = styled.div`
  width: 824px;
  max-width: 100%;
`;

export default function Formstage({ currentStage, setFormStage, errors, isNew, visited, stages }: Props) {
  const handleClick = (stage: number) => {
    // Disable navigation if record is not yet created
    if (isNew) return;
    setFormStage(stage);
  };

  return (
    <Container>
      <Grid cols={4}>
        <Grid.Row collapse="992" gutter={[]}>
          {stages?.map((stage) => (
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
