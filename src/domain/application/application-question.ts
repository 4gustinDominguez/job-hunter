export interface ApplicationQuestion {
  id: string;
  applicationId: string;
  question: string;
  answer?: string;
  /** Insertion order within the application — questions render and persist in this order. */
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
