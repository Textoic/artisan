import type { PosTag } from "../types.js";

export type TagVerdict = {
  xpos: PosTag;
  rule: string;
  accepted: boolean;
  forced: boolean;
  matched: string[];
};

export type TagEvent =
  | {
      type: "judged";
      index: number;
      candidates: PosTag[];
      verdicts: TagVerdict[];
      flexibleMode: boolean;
    }
  | {
      type: "chose";
      index: number;
      tags: PosTag[];
      predicted: PosTag;
    };

let sink: ((event: TagEvent) => void) | null = null;

export const isAuditing = () => sink != null;

export const setTagAuditSink = (next: ((event: TagEvent) => void) | null) => {
  sink = next;
};

export const recordTagEvent = (event: () => TagEvent) => {
  if (sink != null) {
    sink(event());
  }
};
