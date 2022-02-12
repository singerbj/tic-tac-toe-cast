import { useState, useEffect, useRef } from "react";
import logo from './logo.svg';
import './App.css';
import Peer from 'peerjs';
import Config from "./Config";

if(window.navigator.userAgent.indexOf('CrKey') > -1){
  const options = new window.cast.framework.CastReceiverOptions();
  options.disableIdleTimeout = true;

  const instance = window.cast.framework.CastReceiverContext.getInstance();
  instance.start(options);
}

const makeid = (length) => {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return Config.HOST_ID_PREFIX + '-' + result;
};

const ticTacToeSquareStyle = { display: "inline-block", width: 100, height: 100, backgroundColor: "#ccc", border: "3px solid #fff"};

const App = () => {
  const [hostId, setHostId] = useState();
  const [connections, setConnections] = useState([]);
  const [players, setPlayers] = useState({});
  const [gameState, setGameState] = useState(0);
  const [state, setState] = useState([]);

  const playersRef = useRef(players);
  const gameStateRef = useRef(gameState);
  const stateRef = useRef(state);


  useEffect(() => {
    var serverId = makeid(6);
    var peer = new Peer(serverId, { 
      host: 'localhost',
      port: 9000,
      path: '/myapp', 
      debug: 3
    });

    var connectionsArray = [];
    peer.on('open', function () {
        if (peer.id === null) {
            console.log('Received null id from peer open');
        } else {
            setHostId(peer.id);
        }
    });

    peer.on('connection', function (conn) {
      const playerName = conn.metadata ? conn.metadata.playerName : undefined;
      const deviceId = conn.metadata ? conn.metadata.deviceId : undefined;
      let numberOfPlayers = Object.keys(playersRef.current).length;

      if(playerName && deviceId){
        let gameStarted = gameState !== Config.GAME_STATE.PLAYERS_CONNECT;
        let morePlayersCanJoin = numberOfPlayers < Config.MAX_PLAYERS;
        let playerHasConnectedBefore = playersRef.current[deviceId];

        if((!gameStarted && morePlayersCanJoin) || (gameStarted && playerHasConnectedBefore)){
          console.log("=============> Connected to: " + conn.peer + " with playerName: " + playerName);
          connectionsArray.push(conn);
          
          setPlayers((prevPlayers) => {
            return { 
              ...playersRef.current, 
              [deviceId]: {
                deviceId,
                playerId: conn.peer,
                playerName,
                connected: true,
                lastMessage: Date.now(),
                isHost: Object.keys(prevPlayers).length === 0,
              }
            }
          });

          conn.on('data', function(data) {
            console.log('data recieved from ' + conn.peer + ':', data);
            // handle heartbeat
            // if(data.type === Config.MESSAGE_TYPES.HEARTBEAT){
            //   setPlayers((players) => {
            //     if(players[data.deviceId]){
            //       return {
            //         ...players,
            //         [data.deviceId]: {
            //           ...players[data.deviceId],
            //           lastMessage: Date.now()
            //         }
            //       };
            //     } else {
            //       console.error("Invalid HEARTBEAT recieved");
            //       return players;
            //     } 
            //   });
            // }
            if(data.type === Config.MESSAGE_TYPES.DISCONNECT){
              setPlayers((players) => {
                if(players[data.deviceId]){
                  const playersCopy = {...players};
                  delete playersCopy[data.deviceId];
                  return playersCopy;
                } else {
                  console.error("Invalid DISCONNECT recieved");
                  return players;
                } 
              });
            }
            // handle start game
            // handle a player's move
          });
          conn.on('close', function(data) {
            console.log('close (conn) ' + conn.peer + ':', data);
          });
          conn.on('error', function(data) {
            console.log('error (conn) ' + conn.peer + ':', data);
          });
        } else {
          if(gameStarted){
            console.log("Game already started, closing connection.");
            conn.send({ type: "GAME_STARTED" });
            setTimeout(() => { conn.close(); }, 1000);
          } else if(!gameStarted) {
            console.log("Too many connected players, closing connection.");
            conn.send({ type: "TOO_MANY_PLAYERS" });
            setTimeout(() => { conn.close(); }, 1000);
          }
        }
      } else {
        console.log("Invalid Game connection, closing connection.");
        conn.send({ type: "GAME_STARTED"});
        setTimeout(() => { conn.close(); }, 1000);
      }
    });

    peer.on('disconnected', function (conn) {
        console.log('Connection lost. Please reconnect', conn);
    });

    peer.on('close', function() {
        // conn = null;
        console.log('Connection destroyed');
    });

    peer.on('error', function (err) {
        console.log(err);
    });

    const intervalId = setInterval(() => {
      setPlayers((oldPlayers) => {
        const players = { ...oldPlayers };
        Object.keys(players).forEach((deviceId) => {
          let player = players[deviceId];
          if(player.connected && player.lastMessage < (Date.now() - Config.MAX_HEARTBEAT_INTERVAL)){
            player.connected = false;
            if(gameState === Config.GAME_STATE.PLAYERS_CONNECT){
              if(player.isHost){
                player.isHost = false;
                var nextHost = Object.keys(players).filter((deviceId) => deviceId !== player.deviceId)[0];
                if(nextHost){
                  nextHost.isHost = true;
                }
              }
            }
          } else if(!player.connected && player.lastMessage >= (Date.now() - Config.MAX_HEARTBEAT_INTERVAL)){
            player.connected = true;
          }
        });
        return players;
      });

      // connectionsArray = connectionsArray.filter((conn) => {
      //   return conn && conn.send && conn.peerConnection && conn.peerConnection.iceConnectionState !== "disconnected";
      // });
      connectionsArray.forEach((conn) => {
        if(conn && conn.open && conn.send ){
          conn.send({ type: Config.STATE_LABEL, state });
        }
      });
    }, Config.SEND_STATE_INTERVAL);

    console.log('PeerJs setup complete!');
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <div>
        Host Id: {hostId}
        <br />
        Game State: {gameState}
        <br />
        Players: {JSON.stringify(players)}
      </div>
      <br></br>
      <div className="board">
        <div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
        </div>
        <div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
        </div>
        <div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
          <div style={ticTacToeSquareStyle}>&nbsp;</div>
        </div>
      </div>
    </>
  );
}

export default App;
