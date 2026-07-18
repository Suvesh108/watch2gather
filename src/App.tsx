import { usePeerConnection } from './hooks/usePeerConnection';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { CustomModal } from './components/CustomModal';

function App() {
  const pc = usePeerConnection();

  return (
    <>
      {pc.isInRoom ? (
        <Room {...pc} />
      ) : (
        <Lobby
          createRoom={pc.createRoom}
          joinRoom={pc.joinRoom}
          connectionStatus={pc.connectionStatus}
          roomCode={pc.roomCode}
          errorMsg={pc.errorMsg}
        />
      )}

      {pc.modal && (
        <CustomModal
          title={pc.modal.title}
          message={pc.modal.message}
          confirmText={pc.modal.confirmText}
          cancelText={pc.modal.cancelText}
          onConfirm={pc.modal.onConfirm}
          onCancel={pc.modal.onCancel}
        />
      )}
    </>
  );
}

export default App;
