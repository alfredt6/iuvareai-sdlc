# Stories

Feature implementation shards — one file per atomic, testable behavior. Produced
by the Product Owner (Phase 2). The filename **is** the OKF concept ID:
`{epic_id}.{story_id}.{title}.md` (e.g. `001.003.user-login-rate-limiting.md`).

Each story is an OKF concept (`type: Story`) carrying: `track`, `status`,
`owner`, `contract_version`, `depends_on`, `inputs`, `expected_outputs`,
`test_criteria`.

Populated during the flow. See [sharding](../docs/sharding.md) and the
[Definition of Ready](../docs/definition-of-ready.md).
