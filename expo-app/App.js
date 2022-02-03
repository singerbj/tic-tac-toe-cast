import { useEffect } from "react";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { CastButton, useRemoteMediaClient } from 'react-native-google-cast'

export default function App() {

  // This will automatically rerender when client is connected to a device
  // (after pressing the button that's rendered below)
  const client = useRemoteMediaClient()

  if (client) {
    // Send the media to your Cast device as soon as we connect to a device
    // (though you'll probably want to call this later once user clicks on a video or something)
    console.log("==================================================>");
    client.loadMedia().catch((e) => {
      console.error("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",e);
    })
  }

  // This will render native Cast button.
  // When a user presses it, a Cast dialog will prompt them to select a Cast device to connect to.
  return (
    <View style={styles.container}>
      <Text>Hello wurld wtf</Text>
      <CastButton style={{ width: 24, height: 24, tintColor: 'black' }} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
