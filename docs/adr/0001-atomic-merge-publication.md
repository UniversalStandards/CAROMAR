# ADR-0001: Atomic Git Data API merge publication

- Status: Accepted
- Date: 2026-09-09
- Decision owners: CAROMAR maintainers

## Context

CAROMAR combines the file trees of multiple GitHub repositories into a newly
created target repository. The former implementation fetched each blob and
wrote it through the Contents API one file at a time. Every Contents write
created a commit, so a later failure could leave a target branch that appeared
successful while containing only part of the requested merge. The approach
also discarded Git modes and treated a truncated recursive tree as complete.

The UI and API must report what was actually published. Deterministic file
path heuristics are useful for capability discovery and risk scoring, but they
must not be represented as model-generated intelligence.

## Decision

The merge engine will:

1. Preflight source descriptors, source visibility, repository trees, file
   counts, byte limits, paths, and supported Git modes before publication.
2. Read source blobs and create equivalent blobs in the target object database
   through the Git Data API.
3. Assemble one target tree using the target's current base tree, preserving
   regular-file, executable, symlink, and submodule modes.
4. Create one commit with the assembled tree and advance the target branch once
   using a non-forced ref update.
5. Fail closed on truncation, empty sources, unsupported data, limit breaches,
   staging failures, or publication conflicts. The endpoint must never return
   a successful partial merge.
6. Delete a newly created target repository when merge staging or publication
   fails. Rollback failures are reported separately and require manual cleanup.
7. Return the published commit SHA, target branch, file/byte counts, explicit
   source-history behavior, and deterministic analysis results.

The merge copies the current source tree, not source commit history. Existing
target content (the auto-initialized README) is retained through the target
base tree. The branch update is optimistic and non-forced; if the target
branch changes before publication, GitHub rejects the update instead of
overwriting another writer's work.

## Consequences

### Positive

- Users see either the complete merge commit or no published merge commit.
- Git modes and submodule entries are not silently downgraded.
- Failure responses are machine-actionable and include safe rollback status.
- The target branch remains unchanged when source reads or staging fail.
- Deterministic analysis is transparent and reproducible.

### Trade-offs and limitations

- Blob staging can leave unreachable Git objects if an existing target fails
  before publication; GitHub garbage collection handles those objects.
- A newly created target is deleted on failure, subject to the token having
  repository-delete permission.
- Source history, tags, branches, and commit signatures are not copied.
- Repository and byte limits intentionally reject very large merges rather
  than risking timeouts or memory pressure.
- Submodule entries retain their mode and commit SHA, but the referenced
  submodule repository remains external to the merged target.

## Required verification

The test suite must cover one-commit publication, `force: false` ref updates,
Git mode preservation, truncated-tree rejection, size/file-count rejection,
private-source/public-target rejection, no publication after blob failure,
target rollback, and the frontend/API response contract.

## Future model integration

If a real model is added for merge planning, it must be separately identified
in the response, bounded by policy and budget, auditable with input/output
provenance, and unable to bypass deterministic validation or atomic
publication.
