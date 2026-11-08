import { Row, Screen } from '../components/ui';
import { BackButton } from '../components/BackButton';
import { ProGate } from '../components/ProGate';
import { space } from '../theme';

/** What the Pro app adds (free edition). */
export default function ProScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
      </Row>
      <ProGate />
    </Screen>
  );
}
