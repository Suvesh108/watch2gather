import { usePeerConnection } from './hooks/usePeerConnection';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';

function App() {
  const pc = usePeerConnection();

  if (pc.isInRoom) {
    return <Room {...pc} />;
  }

  return (
    <Lobby
      createRoom={pc.createRoom}
      joinRoom={pc.joinRoom}
      connectionStatus={pc.connectionStatus}
      roomCode={pc.roomCode}
      errorMsg={pc.errorMsg}
    />
  );
}

export default App;
