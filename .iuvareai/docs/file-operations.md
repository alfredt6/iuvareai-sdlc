---
type: Methodology
title: "File and Directory Operations"
description: "Task-scoped copy, move, and directory creation without unsafe shell bypasses."
tags: [methodology, filesystem, capabilities]
timestamp: 2026-07-25
---

# File and Directory Operations

Agents may copy or move files and complete directories and may create directory
trees. Use the dedicated `iuvare_file_operation` tool—not raw `cp`, `mv`,
`rsync`, or `mkdir`. This keeps source, destination, overwrite, and deletion
checks inside the policy layer.

## Copy one file

Request the source in `reads`, the exact destination in `writes`, and the
`filesystem` command class:

```yaml
reads: [docs/source/brief.md]
writes: [docs/archive/brief.md]
write_trees: []
deletes: []
commands: [filesystem]
```

Then call:

```json
{"action":"copy","source":"docs/source/brief.md","target":"docs/archive/brief.md"}
```

## Copy a directory tree

Directory destinations use a human-previewed `write_trees` prefix:

```yaml
reads: [docs/source-design/]
writes: []
write_trees: [docs/archive/]
deletes: []
commands: [filesystem]
```

```json
{"action":"copy","source":"docs/source-design","target":"docs/archive/source-design"}
```

`write_trees` is available only to the dedicated file-operation tool. Built-in
`write` and `edit` remain restricted to exact `writes` files.

## Move

A move writes the destination and removes the source. It therefore needs the
source in both `reads` and `deletes`:

```yaml
reads: [docs/draft/]
writes: []
write_trees: [docs/final/]
deletes: [docs/draft/]
commands: [filesystem]
```

```json
{"action":"move","source":"docs/draft","target":"docs/final/draft"}
```

## Create a directory

Authorize its containing tree and call `mkdir` through the tool:

```json
{"action":"mkdir","target":"docs/customer-master/assets"}
```

## Safety behavior

- Filesystem scope is at least medium risk and receives one human preview.
- Targets must match exact `writes` or an approved `write_trees` prefix.
- Move sources must match `deletes`.
- Existing targets require explicit `overwrite: true`.
- Source and target must remain inside the repository.
- Symbolic-link trees are rejected to prevent scope escape.
- Raw shell transfer commands remain blocked because shell parsing cannot provide
  the same path-level guarantees.
