import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { withErrorPage } from "../components/error-page";

import type { EventSource } from "../api/lib/event-source-v1beta1";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, DrawerItem, DrawerTitle },
} = Renderer;

export interface EventSourceDetailsProps extends Renderer.Component.KubeObjectDetailsProps<EventSource> {
  extension: Renderer.LensExtension;
}

export const EventSourceDetails = observer((props: EventSourceDetailsProps) =>
  withErrorPage(props, () => {
    const { object } = props;
    const resourceSelectors = object.spec?.resourceSelectors ?? [];
    const messagingMatchCriteria = object.spec?.messagingMatchCriteria ?? [];

    return (
      <>
        <DrawerTitle>Configuration</DrawerTitle>
        <DrawerItem name="Collect Resources">
          <BadgeBoolean value={object.spec?.collectResources ?? false} />
        </DrawerItem>

        <DrawerTitle>Resource Selectors</DrawerTitle>
        {resourceSelectors.length === 0 ? <DrawerItem name="Resource Selectors">None</DrawerItem> : null}
        {resourceSelectors.map((selector, index) => (
          <DrawerItem key={`${selector.group}-${selector.kind}-${index}`} name={selector.kind}>
            {[
              [selector.group, selector.version].filter(Boolean).join("/"),
              selector.namespace,
              selector.name,
              (selector.labelFilters ?? [])
                .map((filter) => `${filter.key} ${filter.operation} ${filter.value ?? ""}`.trim())
                .join(", "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </DrawerItem>
        ))}

        {messagingMatchCriteria.length > 0 ? (
          <>
            <DrawerTitle>CloudEvent Match Criteria</DrawerTitle>
            {messagingMatchCriteria.map((criteria, index) => (
              <DrawerItem key={`${criteria.subject}-${index}`} name={criteria.subject ?? "any subject"}>
                {[criteria.cloudEventSource, criteria.cloudEventType, criteria.cloudEventSubject]
                  .filter(Boolean)
                  .join(" · ")}
              </DrawerItem>
            ))}
          </>
        ) : null}
      </>
    );
  }),
);
