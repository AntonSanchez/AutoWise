export type UserProfile = {
  ownerName: string;
  phoneNumber: string;
  avatarUri: string;
  primaryCarId: string;
};

export const defaultProfile: UserProfile = {
  ownerName: 'Joe',
  phoneNumber: '',
  avatarUri: '',
  primaryCarId: '',
};
