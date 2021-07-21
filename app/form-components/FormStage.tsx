import FormStageBox from 'form-components/FormStageBox';
import Grid from '@button-inc/bcgov-theme/Grid';

interface Props {
  currentStage: number;
}

const stages = [
  { title: 'Requester Info', number: 1 },
  { title: "Providers and URI's", number: 2 },
  { title: 'Terms and conditions', number: 3 },
  { title: 'Review & Submit', number: 4 },
];

export default function Formstage({ currentStage }: Props) {
  return (
    <Grid cols={4}>
      <Grid.Row collapse="1000">
        {stages.map((stage) => (
          <Grid.Col>
            <FormStageBox
              title={stage.title}
              stageNumber={stage.number}
              active={stage.number === currentStage}
              key={stage.number}
            />
          </Grid.Col>
        ))}
      </Grid.Row>
    </Grid>
  );
}
