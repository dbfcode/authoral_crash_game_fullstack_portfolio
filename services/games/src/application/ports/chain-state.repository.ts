export type ChainStateSnapshot = {
  seeds: string[];
  currentIndex: number;
};

export interface ChainStateRepository {
  load(): Promise<ChainStateSnapshot | null>;
  save(snapshot: ChainStateSnapshot): Promise<void>;
}
