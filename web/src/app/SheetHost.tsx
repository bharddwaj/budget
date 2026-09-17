import { useNavigate } from 'react-router'
import { Sheet } from '../design/components/Sheet'
import { ArrangeEnvelopesSheet } from '../features/envelopes/ArrangeEnvelopesSheet'
import { EnvelopeEditorSheet } from '../features/envelopes/EnvelopeEditorSheet'
import { TransferSheet } from '../features/envelopes/TransferSheet'
import { TransactionEditorSheet } from '../features/transactions/TransactionEditorSheet'
import { useAppRoute } from './AppRoute'

/**
 * Hosts the sheets that any tab can open. Each sheet mounts only while it is
 * open so its local state starts fresh every time.
 */
export function SheetHost() {
  const route = useAppRoute()
  const navigate = useNavigate()
  const { state } = route
  return (
    <>
      <Sheet isOpen={state.isAddingTransaction} onDismiss={route.closeTransaction}>
        {state.isAddingTransaction ? (
          <TransactionEditorSheet editingID={state.editingTransactionID} envelopeID={state.transactionEnvelopeID} onClose={route.closeTransaction} />
        ) : null}
      </Sheet>
      <Sheet isOpen={state.isCreatingEnvelope} onDismiss={route.closeEnvelope}>
        {state.isCreatingEnvelope ? (
          <EnvelopeEditorSheet editingID={state.editingEnvelopeID} onClose={route.closeEnvelope} onRemoved={() => navigate('/')} />
        ) : null}
      </Sheet>
      <Sheet isOpen={state.isTransferring} onDismiss={route.closeTransfer}>
        {state.isTransferring ? <TransferSheet sourceID={state.transferSourceID} onClose={route.closeTransfer} /> : null}
      </Sheet>
      <Sheet isOpen={state.isArrangingEnvelopes} onDismiss={route.closeArrange}>
        {state.isArrangingEnvelopes ? <ArrangeEnvelopesSheet onClose={route.closeArrange} /> : null}
      </Sheet>
    </>
  )
}
