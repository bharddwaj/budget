import { Sheet } from '../design/components/Sheet'
import { TransactionEditorSheet } from '../features/transactions/TransactionEditorSheet'
import { useAppRoute } from './AppRoute'

/**
 * Hosts the sheets that any tab can open. Each sheet mounts only while it is
 * open so its local state starts fresh every time.
 */
export function SheetHost() {
  const route = useAppRoute()
  const { state } = route
  return (
    <>
      <Sheet isOpen={state.isAddingTransaction} onDismiss={route.closeTransaction}>
        {state.isAddingTransaction ? (
          <TransactionEditorSheet editingID={state.editingTransactionID} envelopeID={state.transactionEnvelopeID} onClose={route.closeTransaction} />
        ) : null}
      </Sheet>
    </>
  )
}
