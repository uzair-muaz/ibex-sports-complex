/** OpenAPI pieces for Phase 11: the IBEX wallet. Merged into lib/api/openapi.ts. */

const json = (description: string, example: unknown) => ({
  description,
  content: { "application/json": { example } },
});
const err = (description: string, code: string, error: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error, code } } },
});

const walletExample = {
  balance: 1850,
  history: {
    items: [
      { id: "6650c0ffee0000000000a101", type: "spent", amount: -900, title: "Used for IBX-2131", bookingId: "6650c0ffee0000000000b201", date: "2026-11-07T15:00:00+05:00" },
      { id: "6650c0ffee0000000000a100", type: "refund", amount: 2250, title: "Refund · IBX-2109", bookingId: "6650c0ffee0000000000b200", date: "2026-11-05T11:20:00+05:00" },
      { id: "6650c0ffee0000000000a0ff", type: "adjustment", amount: 500, title: "Credit from IBEX", bookingId: null, date: "2026-11-01T09:00:00+05:00" },
    ],
    nextCursor: null,
  },
};

export const walletPaths = {
  "/api/v1/account/wallet": {
    get: {
      tags: ["Account"],
      summary: "My IBEX wallet: balance and history",
      description:
        "Credit comes from cancelled bookings (money paid + wallet used). Use it with `useWallet: true` on POST /bookings/quote and POST /bookings. Wallet credit is never paid out in the app; customers ask staff at the desk. History is newest first; amount is + money in, − money out. type: refund | spent | adjustment.",
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      parameters: [
        { name: "cursor", in: "query", schema: { type: "string" }, description: "nextCursor from the previous page" },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
      ],
      responses: {
        "200": json("Wallet", walletExample),
        "400": err("Bad cursor", "VALIDATION_ERROR", "Invalid cursor"),
        "401": err("Not signed in", "UNAUTHORIZED", "Unauthorized"),
      },
    },
  },
  "/api/v1/admin/wallet": {
    get: {
      tags: ["Admin"],
      summary: "Staff: a customer's wallet (?userId=)",
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      parameters: [{ name: "userId", in: "query", required: true, schema: { type: "string" } }],
      responses: {
        "200": json("Wallet (latest 20)", walletExample),
        "404": err("No such customer", "USER_NOT_FOUND", "Customer not found"),
      },
    },
    post: {
      tags: ["Admin"],
      summary: "Staff: add or remove wallet credit, or record a bank payout",
      description:
        "`requestId` is made once per open form (e.g. a UUID); sending the same one again is refused with 409 DUPLICATE, so a double click can't apply twice. A reason (note) is always required.",
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            example: { userId: "6aef081351e124b88178c99a", action: "bank_payout", amount: 1000, note: "Sent to Meezan account, ref 1234", requestId: "3b1f0a6e-8c51-4b55-9f1e-2a7d1c0b9e41" },
          },
        },
      },
      responses: {
        "200": json("New balance", { balance: 850 }),
        "400": err("Bad input", "VALIDATION_ERROR", "Please write a short reason (3–300 characters)."),
        "404": err("No such customer", "USER_NOT_FOUND", "Customer not found"),
        "409": err("Not enough credit, or already saved", "INSUFFICIENT_BALANCE", "The wallet doesn't have that much credit."),
      },
    },
  },
};
