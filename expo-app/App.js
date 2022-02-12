import { useState, useRef } from "react";
import {
  Button,
  SafeAreaView,
  StatusBar,
  TextInput,
  Text,
  View
} from "react-native";
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { mediaDevices, RTCView } from "react-native-webrtc";
import { CastButton, useRemoteMediaClient } from 'react-native-google-cast';
import Peer from 'react-native-peerjs';
import { useEffect } from "react/cjs/react.development";

const MAX_SERVER_MESSAGE_INTERVAL = 15000;

const ticTacToeSquareStyle = { backgroundColor: "#ccc", width: 100, height: 100, borderWidth: 3, borderColor: "#fff" };

function App() {
  const [hostId, setHostId] = useState("");
  const [deviceId, setDeviceId] = useState();
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState({state: [], time: 0});

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const connectedRef = useRef(connected);
  const stateRef = useRef(state);

  // This will automatically rerender when client is connected to a device
  // (after pressing the button that's rendered below)
  const client = useRemoteMediaClient()

  if (client) {
    // Send the media to your Cast device as soon as we connect to a device
    // (though you'll probably want to call this later once user clicks on a video or something)
    client.loadMedia().catch((e) => {
      console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%", e);
    })
  }

  const connect = () => {
    const peer = new Peer(undefined, {
      secure: false,
      host: '192.168.181.233',
      port: 9000,
      path: '/myapp', 
      debug: 3
    });
    peer.on('error', (error) => {
      console.error(error);
    });

    peer.on('open', peerId => {
      console.log('Remote peer open with ID', peerId);

      const conn = peer.connect("tic-tac-toe-cast-" +  hostId, { 
        metadata: { 
          playerName: 'Player ' + Math.floor(Math.random() * 9999) + 1,
          deviceId
        } 
      });

      conn.on('open', () => {
        console.log('Remote peer has opened connection.');
        setConnected(true);
      });

      conn.on('data', (data) => {
        console.log('Received from local peer', data);
        if(data.type === "STATE"){
          setState({ state: data.state, time: Date.now() });
        }
      });

      conn.on('close', (data) => {
        console.log('Connection closed:', data);
        setConnected(false);
      });

      conn.on('error', (error) => {
        console.log('Connection error: ', error);
        setConnected(false);
      });
      
      console.log("1 &&&&&&&&&&&&&&&&&");
      connRef.current = conn;
    });

    peerRef.current = peer;
  };

  const disconnect = () => {
    // peerjsDataRef.current.conn.send({ "type": "DISCONNECT", "deviceId": deviceId });

    if(peerRef.current && peerRef.current.disconnect){
      peerRef.current.disconnect();
    }
    if(connRef.current && connRef.current.close){
      connRef.current.close();
    }

    console.log("2 &&&&&&&&&&&&&&&&&");
    connRef.current = null;
    peerRef.current = null;
    setConnected(false);
  };

  const makeMove = () => {

  };

  useEffect(() => {
    (async () => {
      let uuid = await SecureStore.getItemAsync('deviceId');
      if(!uuid){
        uuid = uuidv4();
        await SecureStore.setItemAsync('deviceId', JSON.stringify(uuid));
      }
      setDeviceId(uuid);
    })();
  }, [connected])
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      
      if(connRef.current){
        console.log("----->", connRef.current.send);
      }
      // if (connRef.current && connRef.current.send && deviceId) {
      //   console.log(1234);
      //   connRef.current.send({ "type": "HEARTBEAT", "deviceId": deviceId });
      // }
      sendHb();
      if(connRef.current && (Date.now() - state.time) > MAX_SERVER_MESSAGE_INTERVAL){
        console.log("Lost connection to server...");
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    }
  });

  const sendHb = () => {
    if (connRef.current && connRef.current.send && deviceId) {
      console.log(1234);
      connRef.current.send({ "type": "HEARTBEAT", "deviceId": deviceId });
    }
  };

  if(deviceId === undefined){
    return (
      <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <Text>Loading...</Text>
    </SafeAreaView>
    )
  } else {

    return (
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />
        { !connected && 
          <TextInput
            style={{ margin: 20 }}
            autoCapitalize = {"characters"}
            onChangeText={(text) => {
              setHostId(text.trim());
            }}
            value={hostId}
            placeholder="Enter Host Id"
          />
        }
        { connected && 
          <Text>Connected to host: {hostId}</Text>
        }
        { !connected && 
          <Button style={{ margin: 20 }} title={'Connect'} onPress={() => { connect() }}></Button>
        }
        { connected &&
          <Button style={{ margin: 20 }} title={'Disconnect'} onPress={() => { disconnect() }}></Button>
        }
        <Button style={{ margin: 20 }} title={'Send HB'} onPress={() => { sendHb() }}></Button>
        <CastButton style={{ margin: 20, width: 24, height: 24, tintColor: 'black' }} />
        <Text>Connected: {connected.toString()}</Text>
        <Text>{JSON.stringify(state)}</Text>
        <View style={{ backgroundColor: "#fff", flexDirection: 'row' }}>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(0)}}></View>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(1)}}></View>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(2)}}></View>
        </View>
        <View style={{ backgroundColor: "#fff", flexDirection: 'row' }}>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(3)}}></View>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(4)}}></View>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(5)}}></View>
        </View>
        <View style={{ backgroundColor: "#fff", flexDirection: 'row' }}>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(6)}}></View>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(7)}}></View>
          <View style={ticTacToeSquareStyle} onPress={() => { makeMove(8)}}></View>
        </View>
      </SafeAreaView>
    );
  }
}

export default App;
