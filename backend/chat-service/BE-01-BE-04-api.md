# BE-01 / BE-04 — Damage assessment and bot-to-human handover

All paths are available through the existing Gateway prefix `/api/v1/chat`
or directly on chat-service (default port `4008`). Use `Content-Type: application/json`.
New endpoints require a signed, unexpired HS256 access JWT in `Authorization: Bearer <token>`.
The JWT secret must match User Service (`JWT_ACCESS_SECRET`, or `JWT_SECRET`). Both `role`
and User Service's `roles` array are supported. Forwarded `x-user-*` headers alone are rejected.

## BE-01 — Assess an image

`POST /api/v1/chat/assess-image`

```json
{
  "imageBase64": "<base64 image bytes without the data: prefix>",
  "mimeType": "image/png",
  "expectedItem": "Ly thủy tinh màu xanh đặt mua"
}
```

- JPEG, PNG and WEBP, maximum decoded image size 5 MB.
- `expectedItem` is optional, maximum 1000 characters. It supplies comparison context for `SAI_HÀNG`.
- Invalid input returns `400`. Missing/invalid access JWT returns `401`.
- Successful requests return `200` with exactly four fields in `data`.

```json
{
  "success": true,
  "data": {
    "is_damaged": true,
    "damage_type": "NỨT_VỠ",
    "severity": "CAO",
    "summary": "Phát hiện vết nứt trên thân sản phẩm."
  }
}
```

`damage_type` is one of `NỨT_VỠ`, `MÓP_MÉO`, `SAI_HÀNG`, `BÌNH_THƯỜNG`.
`severity` is one of `THẤP`, `TRUNG_BÌNH`, `CAO`.

The `GeminiDamageAssessor.assessImage(input)` adapter requests JSON with a required schema
and `maxOutputTokens: 250`. It validates the returned data before exposing it. A failed,
blocked, truncated or malformed response, or a call exceeding the 900 ms deadline, returns
the same fixed schema from `MockDamageAssessor`. The fallback summary starts with `[MOCK]`
and explicitly states that the actual image has not been assessed. The accompanying
`false / BÌNH_THƯỜNG / THẤP` values are demo placeholders and must not be used to close a complaint.
The method also returns fallback for invalid direct input. The HTTP boundary returns `400`
for invalid input so clients can correct the request.

Configure `GEMINI_API_KEY` to enable the online adapter. Without a key the adapter returns
offline data immediately. `GEMINI_DAMAGE_MODEL` overrides the model for this adapter only.
The task's requested default is `gemini-1.5-flash`. Google shut down that model on
2025-09-29, so online deployment requires setting `GEMINI_DAMAGE_MODEL` to an available
model supporting images and JSON schemas. See [Google release notes](https://ai.google.dev/gemini-api/docs/changelog#09-29-2025).
No live Google API call is made by the automated tests. A 250-token cap limits output
length, while the deadline limits waiting for the model. It is not an end-to-end network SLA.

## BE-04 — Request a human

Open an `AI_BOT` room with the existing `POST /api/v1/chat/conversations` endpoint and use
the returned conversation ID. New AI rooms start with `BOT_ACTIVE`. Legacy AI rooms with
`ACTIVE` remain eligible for handover. Other channel types retain their existing states.

`POST /api/v1/chat/handover`

```json
{
  "conversationId": "<conversation ID>",
  "userId": "<authenticated buyer's sub>"
}
```

- Only the owning Buyer may request handover. `userId` must equal JWT `sub`.
- `200` returns `{ "success": true, "data": <conversation> }`. The conversation has
  `status: "WAITING_STAFF"` and an updated `updatedAt` timestamp.
- Repeated/concurrent calls return the waiting conversation without resetting that timestamp.
- `400` means missing/invalid input, `401` invalid JWT, `403` wrong user/role,
  `404` missing conversation, `409` an ineligible channel or state.
- A repository failure returns `500` without reporting a successful handover.

`GET /api/v1/chat/handover?limit=50`

Only `SUPPORT_STAFF` and `ADMIN` may poll this queue. `limit` must be an integer from
1 to 100. The response is `{ "success": true, "data": [<conversation>, ...] }`, oldest
waiting rooms first. The stored `WAITING_STAFF` flag is the notification mechanism.
No dispute/support case is automatically created by handover.

Support staff can read and reply through the existing conversation/message endpoints once
the AI room is `WAITING_STAFF`. Access to these handed-over rooms requires a verified JWT.
The Seller cannot access the room. The bot stops producing replies while waiting,
including replies whose generation began before handover completed.

Storage follows the existing `InMemoryConversationRepository`: the queue lasts for the
current service process and is cleared on restart. Multiple service instances do not
share it. Persistent storage, staff assignment and WebSocket/event delivery are separate
integration work. These endpoints support polling against the current single-process service.

## Validation

From the repository root, using already installed dependencies:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit -p backend/chat-service/tsconfig.json
node --import tsx --test "backend/chat-service/src/**/*.test.ts"
node --test scripts/test-architecture-boundaries.test.js
```
