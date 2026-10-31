/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appReady,
  connectApp,
  expandSidebarGroup,
  extensionName,
  installExtension,
  openKindCluster,
  selectTestNamespace,
} from "./extension-helpers";

import type { Frame } from "playwright";

import type { AppSession } from "./extension-helpers";

// The list pages of the extension, by the id of their `clusterPageMenus` entry, opened after the overview.
const listPages = [
  "sveltos-clusters",
  "sveltos-cluster-profiles",
  "sveltos-profiles",
  "sveltos-dependencies",
  "sveltos-addons",
  "sveltos-dry-run",
  "sveltos-event-sources",
  "sveltos-event-triggers",
  "sveltos-classifiers",
];

// The list pages whose rows open the details panel of the extension, the dashboards aside.
const detailsPages = listPages.filter((id) => !["sveltos-clusters", "sveltos-dependencies"].includes(id));

const sanitizedExtensionId = extensionName.replace("@", "").replace("/", "--");
const viewTimeout = { timeout: 60 * 1000 };

// Screenshots of every page, when a directory is given: for a look at the pages, not for the assertions.
const screenshotDir = process.env.TEST_SCREENSHOT_DIR;

/**
 * Opens a page of the extension from the "Sveltos" group of the cluster sidebar, and waits for its root: the
 * dashboard of the overview, the page itself (a list or a dashboard, empty or not), or its "not available" state.
 */
async function openPage({ window }: AppSession, frame: Frame, id: string) {
  const testId = `link-for-sidebar-item-${sanitizedExtensionId}-${id}`;

  await expandSidebarGroup(frame);
  await frame.waitForSelector(`[data-testid="${testId}"]`, viewTimeout);
  await frame.dispatchEvent(`[data-testid="${testId}"]`, "click");
  await frame
    .locator("[class*='_page_'], [class*='_overview_'], [class*='_unavailablePage_']")
    .first()
    .waitFor(viewTimeout);

  if (screenshotDir) {
    mkdirSync(screenshotDir, { recursive: true });
    await window.screenshot({ path: path.join(screenshotDir, `${id}.png`) });
  }

  return frame.locator('[class*="_errorPage_"]').count();
}

describe.skipIf(!(await appReady({ cluster: true })))("Sveltos pages", () => {
  let session: AppSession | undefined;
  let frame: Frame | undefined;

  beforeAll(async () => {
    session = await connectApp();
    await installExtension(session);
    frame = await openKindCluster(session, { selectNamespace: false });
  }, 180 * 1000);

  afterAll(async () => {
    expect((await session?.close()) ?? []).toEqual([]);
  });

  // The overview loads its stores itself. It is the first view of the cluster, before any list page has loaded a
  // store for it, so that an effect that loads nothing under `React.StrictMode` (Freelens dev) shows here.
  it("opens the overview first, without an error", async () => {
    if (!frame || !session) {
      throw new Error("The cluster is not open");
    }

    expect(await openPage(session, frame, "sveltos-overview")).toBe(0);
    await frame.locator("[class*='_card_']").first().waitFor(viewTimeout);
    expect(session.errors()).toEqual([]);
  });

  it("selects the test namespace", async () => {
    if (!frame) {
      throw new Error("The cluster is not open");
    }

    await selectTestNamespace(frame);
  });

  it.each(listPages)("opens %s without an error", async (id) => {
    if (!frame || !session) {
      throw new Error("The cluster is not open");
    }

    expect(await openPage(session, frame, id)).toBe(0);
    expect(session.errors()).toEqual([]);
  });

  it.each(detailsPages)("opens the details panel of a row of %s without an error", async (id) => {
    if (!frame || !session) {
      throw new Error("The cluster is not open");
    }

    expect(await openPage(session, frame, id)).toBe(0);

    const row = frame.locator(".ItemListLayout .TableRow").first();
    const details = frame.locator(".KubeObjectDetails");

    await row.waitFor(viewTimeout);
    await row.click();
    await details.waitFor(viewTimeout);
    // The panel renders its sections after the drawer opens.
    await frame.waitForTimeout(500);

    expect(await details.locator('[class*="_errorPage_"]').count()).toBe(0);
    expect(session.errors()).toEqual([]);

    await frame.locator("body").press("Escape");
    await details.waitFor({ state: "hidden", ...viewTimeout });
  });
});
