import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This screen doesn't exist.</Text>
      <Link href="/(tabs)" style={styles.link}>
        Go to home screen
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 16,
  },
  text: {
    color: '#94a3b8',
    fontSize: 16,
  },
  link: {
    color: '#a78bfa',
    fontSize: 16,
  },
});
