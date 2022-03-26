import styled from 'styled-components';
import Grid from '@button-inc/bcgov-theme/Grid';
import FormStageBox from 'form-components/FormStageBox';
import { Schema } from '@app/schemas/index';

interface Props {
  currentStage: number;
  setFormStage: Function;
  errors: any;
  visited: any;
  isNew: boolean;
  schemas: Schema[];
}

const Container = styled.div`
  width: 824px;
  max-width: 100%;
`;

export default function Formstage({ currentStage, setFormStage, errors, isNew, visited, schemas }: Props) {
  const handleClick = (stage: number) => {
    // Disable navigation if record is not yet created
    if (isNew) return;
    setFormStage(stage);
  };

  return (
    <Container>
      <Grid cols={4}>
        <Grid.Row collapse="992" gutter={[]}>
          {schemas?.map((schema, index) => (
            <Grid.Col key={schema.stepText}>
              <FormStageBox
                title={schema.stepText}
                stageNumber={index + 1}
                active={index === currentStage}
                key={index}
                hasError={!!errors[index]}
                visited={visited[index]}
                handleClick={() => handleClick(index)}
              />
            </Grid.Col>
          ))}
        </Grid.Row>
      </Grid>
    </Container>
  );
}
