import { registerPlugin } from '@capacitor/core';

export interface InAppReviewPlugin {
  requestReview(): Promise<void>;
}

const InAppReview = registerPlugin<InAppReviewPlugin>('InAppReview');

export { InAppReview };
