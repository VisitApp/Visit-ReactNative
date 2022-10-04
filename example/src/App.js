import * as React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import VisitHealthView, {
  checkActivityPermission,
  requestActivityPermission
} from 'Visit-ReactNative';

const styles = StyleSheet.create({
  button: {
    padding: 12,
    backgroundColor: 'blue',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button2: {
    padding: 12,
    backgroundColor: 'blue',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  button3: {
    padding: 12,
    backgroundColor: 'blue',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
  },
  container: { flex: 1 },
});

export default function App() {
  const [cardActive, setCardActive] = React.useState(false);

  function handlePress() {
    setCardActive(true);
  }

  return (
    <SafeAreaView style={styles.container}>
      {!cardActive ? (
        <>
          <TouchableOpacity onPress={handlePress} style={styles.button3}>
            <Text style={styles.buttonText}>Click to see Health Data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              checkActivityPermission()
                .then((res) =>
                  console.log('checkActivityPermission res', { res })
                )
                .catch((err) =>
                  console.log('checkActivityPermission err,', { err })
                );
            }}
            style={styles.button3}
          >
            <Text style={styles.buttonText}>Check Activity Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              requestActivityPermission()
                .then((res) =>
                  console.log('requestActivityPermission res', { res })
                )
                .catch((err) =>
                  console.log('requestActivityPermission err,', { err })
                );
            }}
            style={styles.button3}
          >
            <Text style={styles.buttonText}>Request Activity Permission</Text>
          </TouchableOpacity>
        </>
      ) : (
        <VisitHealthView
          baseURL="https://pb-step-tracking.getvisitapp.xyz/sso"
          encrypted="hbzIPcea-t98X4yL7_IZyb5LorcZ1XkmgvZxZk9dlRJ1w5JyLWyvtL7GJX8afgcBUjNHKW1h1oB7wWfIn1LieYUlu3PhnWJBPem7Q89ju3dlMQ4t0oLacQ6ZR8ppZUN0"
          clientId="tru-f-12edu"
          onBack={() => setCardActive(false)}
        />
      )}
    </SafeAreaView>
  );
}
