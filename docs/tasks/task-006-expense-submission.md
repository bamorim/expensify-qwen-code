# Task: Expense Submission

## Meta Information

- **Task ID**: `TASK-006`
- **Title**: Expense Submission
- **Status**: `Not Started`
- **Priority**: `P0`
- **Created**: 2025-09-20
- **Updated**: 2025-09-20
- **Estimated Effort**: 2.5 days
- **Actual Effort**: TBD

## Related Documents

- **PRD**: docs/product/prd-main.md
- **Dependencies**: 
  - TASK-001 (Organization Management)
  - TASK-003 (Expense Categories Management)
  - TASK-005 (Policy Resolution Engine)

## Description

Implement the expense submission system that allows users to submit expenses with date, amount, category, and description. This includes designing the database schema for expenses, implementing tRPC procedures for expense submission, implementing automatic policy application logic, and creating the UI for expense submission.

## Acceptance Criteria

- [ ] Users can submit expenses with date, amount, category, description
- [ ] System applies policy rules automatically
- [ ] Auto-rejection for expenses over the limit
- [ ] Expenses under the limit go either through auto-approval or manual review based on policy configuration
- [ ] Database schema properly designed with appropriate constraints
- [ ] All operations are tested with unit and integration tests
- [ ] UI is responsive and user-friendly

## TODOs

- [ ] Design database schema for Expenses model with status tracking
- [ ] Create Prisma migration for Expenses table
- [ ] Implement tRPC procedures for expense submission
- [ ] Create database service functions for expense operations
- [ ] Implement automatic policy application logic
- [ ] Write unit tests for expense submission and policy application
- [ ] Write integration tests for expense submission procedures
- [ ] Create UI for expense submission form
- [ ] Create expense listing UI with status indicators

## Progress Updates

### 2025-09-20 - Initial Creation
**Status**: Not Started
**Progress**: Task created
**Blockers**: None
**Next Steps**: Begin database schema design

## Completion Checklist

- [ ] All acceptance criteria met
- [ ] Code follows project standards
- [ ] Tests written and passing
- [ ] Documentation updated (if needed)
- [ ] Code review completed

## Notes

Expense submission is where the policy engine is actually used. This is a core user-facing feature that ties together all the previous work.