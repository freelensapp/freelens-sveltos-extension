import { Renderer } from "@freelensapp/extensions";

import type { ObjectReference } from "../api/types";

const {
  Component: { Badge },
} = Renderer;

export interface ObjectReferenceListProps {
  refs?: ObjectReference[];
}

export function ObjectReferenceList({ refs }: ObjectReferenceListProps) {
  if (!refs || refs.length === 0) return <>N/A</>;

  return (
    <>
      {refs.map((ref) => (
        <Badge
          key={`${ref.kind}-${ref.namespace}-${ref.name}`}
          label={ref.namespace ? `${ref.namespace}/${ref.name}` : ref.name}
          tooltip={ref.kind}
        />
      ))}
    </>
  );
}
