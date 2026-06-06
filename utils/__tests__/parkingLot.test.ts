jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useParkingLotStore } from '../../store/parkingLotStore';
import { resetAllAppData } from '../resetAppData';

function parkingLotStore() {
  return useParkingLotStore.getState();
}

describe('parkingLotStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    parkingLotStore().resetToDefaults();
  });

  it('starts with an empty list', () => {
    expect(parkingLotStore().items).toEqual([]);
  });

  it('adds a note with an id and creation timestamp', () => {
    parkingLotStore().addItem('Reply to Sam');

    const [item] = parkingLotStore().items;
    expect(item.text).toBe('Reply to Sam');
    expect(item.id).toMatch(/^\d+-[a-z0-9]{5}$/);
    expect(Number.isNaN(Date.parse(item.createdAt))).toBe(false);
  });

  it('ignores empty and whitespace-only notes', () => {
    parkingLotStore().addItem('');
    parkingLotStore().addItem('   ');

    expect(parkingLotStore().items).toEqual([]);
  });

  it('trims leading and trailing whitespace', () => {
    parkingLotStore().addItem('  Buy milk  ');

    expect(parkingLotStore().items[0].text).toBe('Buy milk');
  });

  it('removes only the selected note', () => {
    parkingLotStore().addItem('First');
    parkingLotStore().addItem('Second');
    const firstId = parkingLotStore().items.find((item) => item.text === 'First')!.id;

    parkingLotStore().removeItem(firstId);

    expect(parkingLotStore().items.map((item) => item.text)).toEqual(['Second']);
  });

  it('leaves the list unchanged when removing an unknown id', () => {
    parkingLotStore().addItem('Keep me');
    const before = parkingLotStore().items;

    parkingLotStore().removeItem('missing-id');

    expect(parkingLotStore().items).toEqual(before);
  });

  it('clears all notes', () => {
    parkingLotStore().addItem('One');
    parkingLotStore().addItem('Two');

    parkingLotStore().clearAll();

    expect(parkingLotStore().items).toEqual([]);
  });

  it('resetToDefaults clears all notes', () => {
    parkingLotStore().addItem('One');

    parkingLotStore().resetToDefaults();

    expect(parkingLotStore().items).toEqual([]);
  });

  it('keeps only the newest 50 notes', () => {
    for (let index = 0; index < 51; index += 1) {
      parkingLotStore().addItem(`Note ${index}`);
    }

    expect(parkingLotStore().items).toHaveLength(50);
    expect(parkingLotStore().items[0].text).toBe('Note 50');
    expect(parkingLotStore().items.at(-1)?.text).toBe('Note 1');
    expect(parkingLotStore().items.some((item) => item.text === 'Note 0')).toBe(false);
  });

  it.each([
    ['missing', {}],
    ['invalid', { items: 'not-an-array' }],
  ])('migrates %s persisted items to an empty list', async (_label, state) => {
    await AsyncStorage.setItem('parking-lot', JSON.stringify({ state, version: 0 }));

    await useParkingLotStore.persist.rehydrate();

    expect(parkingLotStore().items).toEqual([]);
  });

  it('restores notes from persisted storage', async () => {
    const item = {
      id: 'persisted-note',
      text: 'Buy batteries',
      createdAt: '2026-06-06T10:00:00.000Z',
    };
    await AsyncStorage.setItem(
      'parking-lot',
      JSON.stringify({ state: { items: [item] }, version: 1 })
    );

    await useParkingLotStore.persist.rehydrate();

    expect(parkingLotStore().items).toEqual([item]);
  });

  it('is cleared by the app-wide data reset', () => {
    parkingLotStore().addItem('Clear me');

    resetAllAppData();

    expect(parkingLotStore().items).toEqual([]);
  });
});
