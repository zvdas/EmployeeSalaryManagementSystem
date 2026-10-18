/** `GET /seed/status` */
export interface SeedStatus {
  employeeCount: number;
  isEmpty: boolean;
}

export type SeedCount = 100 | 10000;

/** `POST /seed` body */
export interface SeedRequest {
  count: SeedCount;
}

/** `POST /seed` 201 response */
export interface SeedResult {
  inserted: number;
}
