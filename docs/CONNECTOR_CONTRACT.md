# Connector contract

Every provider connector should implement these conceptual operations:

- providerId / displayName / authenticationType
- connect and authenticate
- refreshToken
- getAccountInfo
- getCapabilities
- validatePermission(action)
- executeAction(action, typedInput)
- getOperationStatus(operationId)
- disconnect

Each capability must include: operation key, required scopes, account eligibility, risk level, rate-limit notes, input schema, output schema, and verification method.

Do not advertise a capability until the authenticated account's scopes and eligibility have been checked. Keep provider-specific behavior inside its connector module.
