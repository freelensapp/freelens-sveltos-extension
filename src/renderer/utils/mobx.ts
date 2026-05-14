import * as MobxReact from "mobx-react";

import type { observer as ObserverType } from "mobx-react";

type ObserverFn = typeof ObserverType;

const observerFromNamed = (MobxReact as { observer?: unknown }).observer;
const observerFromDefault = (MobxReact as { default?: { observer?: unknown } }).default?.observer;
const observerAsDefaultFn = (MobxReact as { default?: unknown }).default;

const resolvedObserver =
  observerFromNamed ??
  observerFromDefault ??
  (typeof observerAsDefaultFn === "function" ? observerAsDefaultFn : undefined);

if (typeof resolvedObserver !== "function") {
  throw new Error("mobx-react observer export is unavailable in this runtime");
}

export const observer = resolvedObserver as ObserverFn;
