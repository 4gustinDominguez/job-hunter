import type { Location } from "@/domain/shared/location";

export interface Company {
  id: string;
  name: string;
  url?: string;
  description?: string;
  industry?: string;
  size?: string;
  location?: Location;
}
