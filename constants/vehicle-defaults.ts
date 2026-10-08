export type UserProfile = {
  ownerName: string;
  phoneNumber: string;
  avatarUri: string;
  primaryCarId: string;
  // Ids of notifications the customer cleared from the bell menu.
  clearedNotifications?: string[];
};

export const defaultProfile: UserProfile = {
  ownerName: 'Joe',
  phoneNumber: '',
  avatarUri: '',
  primaryCarId: '',
};
