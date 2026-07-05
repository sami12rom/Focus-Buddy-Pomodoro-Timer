jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCompanionStore } from '../../store/companionStore';

describe('companionStore evolution migration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useCompanionStore.getState().resetToDefaults();
  });

  it('moves existing progress at 10 sessions from stage 2 to stage 3', async () => {
    await AsyncStorage.setItem(
      'companion-store',
      JSON.stringify({
        state: { xp: 500, level: 4, evolutionStage: 2 },
        version: 1,
      })
    );

    await useCompanionStore.persist.rehydrate();

    expect(useCompanionStore.getState().evolutionStage).toBe(3);
  });
});
