# @freelensapp/sveltos-extension

<!-- markdownlint-disable MD013 -->

[![Home](https://img.shields.io/badge/%F0%9F%8F%A0-freelens.app-02a7a0)](https://freelens.app)
[![GitHub](https://img.shields.io/github/stars/freelensapp/freelens?style=flat&label=GitHub%20%E2%AD%90)](https://github.com/freelensapp/freelens)
[![Release](https://img.shields.io/github/v/release/freelensapp/freelens-sveltos-extension?display_name=tag&sort=semver)](https://github.com/freelensapp/freelens-sveltos-extension)
[![npm](https://img.shields.io/npm/v/@freelensapp/sveltos-extension.svg)](https://www.npmjs.com/package/@freelensapp/sveltos-extension)

<!-- markdownlint-enable MD013 -->

## Overview

This extension brings the capabilities of the official [Sveltos
dashboard](https://github.com/projectsveltos/dashboard) into
[Freelens](https://freelens.app), reading the ProjectSveltos custom resources
directly from the management cluster.

A `Sveltos` group is added to the cluster sidebar with the following pages:

<!-- markdownlint-disable MD013 -->

| Page             | Resource                               | What it shows                                                                                                                |
| ---------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Overview         | all of the below                       | Counters for every Sveltos resource, ready clusters and failing add-ons                                                      |
| Sveltos Clusters | `SveltosCluster`, ClusterAPI `Cluster` | Readiness, connection status, Kubernetes version, paused state, with a switch between SveltosCluster and ClusterAPI clusters |
| Cluster Profiles | `ClusterProfile`                       | Sync mode, tier, dependencies, cluster selector, matching clusters                                                           |
| Profiles         | `Profile`                              | Same as above, namespace scoped                                                                                              |
| Dependencies     | `ClusterProfile`, `Profile`            | `dependsOn` graph by deployment stage, profile health, missing profiles and cycles                                           |
| Add-ons          | `ClusterSummary`                       | Per-cluster deployment status of Helm, Resources and Kustomize features                                                      |
| Dry Run          | `ClusterReport`                        | Helm and resource changes a DryRun profile would apply                                                                       |
| Event Sources    | `EventSource`                          | Watched resources and CloudEvent match criteria                                                                              |
| Event Triggers   | `EventTrigger`                         | Referenced event source, matching clusters, deployment status                                                                |
| Classifiers      | `Classifier`                           | Classifier labels, version constraints, matching clusters                                                                    |

<!-- markdownlint-enable MD013 -->

The **Sveltos Clusters** page is a dashboard rather than a plain list: clusters
are rendered as cards (icon, connection status, Kubernetes version, labels,
add-on counters and time of the last rollout) or as a table, switchable with a
button. The search box accepts comma separated `key: value` terms that are
ANDed together, where the key is a cluster label or one of `name`, `namespace`,
`version`, `ready`, `connection`, `paused` and `status`:

```text
cloudProvider: aws, tier: dev
```

A bare word searches every field, and a key with no value (`tier:`) matches the
clusters that carry that label. The add-on search box uses the same syntax on
`type`, `name`, `namespace`, `version`, `cluster`, `profile`, `status` and
`source`.

Both the clusters and the add-ons also have a status selector next to the
search box. It lists only the statuses currently present, problems first, each
with the number of matching rows. The cluster status is the one shown in the
Status column: _Paused_, _Provisioning_, _Failed_, _Provisioned_ or _No add-ons_.

Selecting a cluster filters the **Add-ons** section below it, which flattens
every `ClusterSummary` into the Helm releases, Kubernetes resources and
Kustomize outputs deployed on that cluster, each with its own icon, version,
owning profile, status and last update. Helm rows show the real chart logo, the
`icon` field of `Chart.yaml` that the Sveltos addon controller reads from the
deployed release and publishes in `ClusterConfiguration`, so it works for private
and OCI hosted charts too. That section can be filtered by add-on type and
switched between cards and table as well. A **Deployment Errors** section lists
every failure Sveltos reports for the current selection: profile level errors,
per-feature failures and Helm release conflicts.

Add-ons that are not deployed yet are reported as soon as Sveltos knows about
them: a fresh `ClusterSummary` with no feature status, or a chart just added to
a profile that already deployed others, shows as _Provisioning_, and a profile
waiting for the profiles in its `dependsOn` shows as _Blocked_ with the reason.
The cluster row counts all of them as provisioning, so a first installation is
visible right away.

Selecting a Helm add-on opens its release, read from the managed cluster: the
user supplied values and the resources of the release manifest, grouped by
category (access control, configuration, networking, workloads, custom
resources and so on) and then by kind, with a filter and foldable groups. The
whole section can be folded from its title and stays folded across restarts.

Every table can hide columns from its column menu. On the dashboard tables the
choice is saved in the extension settings, so it survives restarts and applies
to every cluster; the list pages use the Freelens column menu and preferences.

The **Overview** page reports the Sveltos release installed in the management
cluster, resolved from the image tags of the controllers running in the
`projectsveltos` namespace, falling back to a cluster wide lookup when Sveltos
is installed elsewhere. It also compares that version with the latest published
release and highlights when an update is available, with a **Check for updates**
button to run the comparison again.

The two features that need the internet, the release comparison against
`api.github.com` and downloading the chart logos, are read-only `GET` requests
performed by the extension main process and handed to the renderer over IPC. The
renderer uses the Chromium network stack, which is subject to the Freelens proxy
settings and to the page CSP, so it cannot perform them itself. Behind a TLS
intercepting proxy, enable _Allow untrusted certificate authorities_ in the
extension preferences: it applies only to these requests and never to cluster
communications. Everything else is read from the cluster and works with no
internet access.

Both are cached to keep the traffic negligible. A chart logo is downloaded once
per URL and kept in the main process, so the same logo shared by many clusters
costs a single request and reopening a page costs none. The latest release is
stored with a one day time to live and survives restarts, so the automatic check
usually answers from the cache. Only failures are left uncached, so they are
retried, and the **Check for updates** button always forces a fresh lookup.

Detail panels are registered for every kind, so selecting a row (or opening the
resource from anywhere else in Freelens) shows the parsed spec and status:
profile configuration (Helm charts, policy refs, kustomization refs, template
resource refs, dependencies), matching and failed clusters, per-cluster rollout
time, deployment errors, per-feature state and dry run diffs. Profile panels
list both the profiles a profile depends on and the ones that depend on it, as
links colored by their rollout state, and flag dependencies on profiles that do
not exist.

A `SveltosCluster` can be paused or resumed from its context menu.

Pages that require a CRD which is not installed in the current cluster render a
"not available" message instead of failing.

Visit the wiki page about [creating
extensions](https://github.com/freelensapp/freelens/wiki/Creating-extensions)
for more information.

## Requirements

- Kubernetes >= 1.24
- Freelens >= 1.8.0
- [Sveltos](https://projectsveltos.io/main/getting_started/install/install/)
  installed in the management cluster

## Supported APIs

<!-- markdownlint-disable MD013 -->

| API Version                      | Kind                   | Scope      |
| -------------------------------- | ---------------------- | ---------- |
| config.projectsveltos.io/v1beta1 | `ClusterProfile`       | Cluster    |
| config.projectsveltos.io/v1beta1 | `Profile`              | Namespaced |
| config.projectsveltos.io/v1beta1 | `ClusterSummary`       | Namespaced |
| config.projectsveltos.io/v1beta1 | `ClusterConfiguration` | Namespaced |
| config.projectsveltos.io/v1beta1 | `ClusterReport`        | Namespaced |
| lib.projectsveltos.io/v1beta1    | `SveltosCluster`       | Namespaced |
| lib.projectsveltos.io/v1beta1    | `Classifier`           | Cluster    |
| lib.projectsveltos.io/v1beta1    | `EventSource`          | Cluster    |
| lib.projectsveltos.io/v1beta1    | `EventTrigger`         | Cluster    |

<!-- markdownlint-enable MD013 -->

## Install

To install, open Freelens and go to Extensions (`ctrl`+`shift`+`E` or
`cmd`+`shift`+`E`), then search for and install
`@freelensapp/sveltos-extension`.

Alternatively, open the following URL in the browser to install directly:

[freelens://app/extensions/install/%40freelensapp%2Fsveltos-extension](freelens://app/extensions/install/%40freelensapp%2Fsveltos-extension)

## Build from the source

You can build the extension from this repository.

### Prerequisites

Use [NVM](https://github.com/nvm-sh/nvm),
[mise-en-place](https://mise.jdx.dev/), or
[windows-nvm](https://github.com/coreybutler/nvm-windows) to install the
required Node.js version.

From the root of this repository:

```sh
nvm install
# or
mise install
# or
winget install CoreyButler.NVMforWindows
nvm install 24.15.0
nvm use 24.15.0
```

Install pnpm:

```sh
corepack install
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
# or
winget install pnpm.pnpm
```

### Build extension

```sh
pnpm i
pnpm build
pnpm pack
```

One script to build and pack the extension for testing:

```sh
pnpm pack:dev
```

### Install built extension

The tarball will be placed in the current directory. In Freelens, navigate
to the Extensions page and provide the path to the tarball, or drag and
drop the `.tgz` file into the Freelens window.

### Check code statically

```sh
pnpm lint:check
```

or

```sh
pnpm trunk:check
```

and

```sh
pnpm build
pnpm knip:check
```

### Testing the extension with unpublished Freelens

In the Freelens working repository:

```sh
rm -f *.tgz
pnpm i
pnpm build
pnpm pack -r
```

Then in the extension repository:

```sh
echo "overrides:" >> pnpm-workspace.yaml
for i in ../freelens/*.tgz; do
  name=$(tar zxOf $i package/package.json | yq -r .name)
  echo "  \"$name\": $i" >> pnpm-workspace.yaml
done

pnpm clean:node_modules
pnpm build
```

## License

Copyright (c) 2025-2026 Freelens Authors.

[MIT License](https://opensource.org/licenses/MIT)
