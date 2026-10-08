import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Alert } from 'react-native';

// Shared photo helper for profile pictures and car pictures. The picked photo is shrunk and
// compressed into a small JPEG data URI so it can live directly on the Firestore document
// (no Firebase Storage needed). Returns null when the person cancels or the photo can't be used.

export type PhotoSource = 'camera' | 'library';

type PhotoOptions = { width: number; aspect: [number, number]; compress?: number };

export const AVATAR_PHOTO: PhotoOptions = { width: 240, aspect: [1, 1], compress: 0.5 };
export const CAR_PHOTO: PhotoOptions = { width: 640, aspect: [4, 3], compress: 0.5 };

export async function pickPhoto(source: PhotoSource, options: PhotoOptions): Promise<string | null> {
  const permission =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      source === 'camera' ? 'Camera access needed' : 'Photo access needed',
      source === 'camera'
        ? 'Allow camera access in your device settings to take a photo.'
        : 'Allow photo library access in your device settings to choose a photo.',
    );
    return null;
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: options.aspect, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: options.aspect, quality: 0.6 });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  try {
    const resized = await manipulateAsync(result.assets[0].uri, [{ resize: { width: options.width } }], {
      compress: options.compress ?? 0.5,
      format: SaveFormat.JPEG,
      base64: true,
    });

    if (!resized.base64) {
      throw new Error('Image processing returned no data.');
    }

    return `data:image/jpeg;base64,${resized.base64}`;
  } catch (error) {
    console.error('AutoWise: failed to process photo', error);
    Alert.alert("Couldn't use that photo", 'Please try a different photo.');
    return null;
  }
}
